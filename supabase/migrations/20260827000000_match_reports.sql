-- Phase 5: match result reporting + private evidence storage.

create table public.match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  reported_by uuid not null references public.profiles (id) on delete cascade,
  player_1_score integer not null check (player_1_score >= 0),
  player_2_score integer not null check (player_2_score >= 0),
  evidence_path text,
  comment text,
  created_at timestamptz not null default now()
);

create index match_reports_match_id_idx on public.match_reports (match_id);

alter table public.match_reports enable row level security;

create policy "match_reports_select_participant" on public.match_reports
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_reports.match_id
        and (m.player_1_id = auth.uid() or m.player_2_id = auth.uid())
    )
  );
-- No insert/update/delete policy: rows are only created by report_match_result() below.

-- Private bucket: evidence.jpg lives at {tournament_id}/{match_id}/{user_id}/evidence.<ext>.
insert into storage.buckets (id, name, public)
values ('match-evidence', 'match-evidence', false)
on conflict (id) do nothing;

create policy "match_evidence_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'match-evidence'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "match_evidence_select_participant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'match-evidence'
    and exists (
      select 1 from public.matches m
      where m.id::text = (storage.foldername(name))[2]
        and (m.player_1_id = auth.uid() or m.player_2_id = auth.uid())
    )
  );

create policy "match_evidence_select_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'match-evidence'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Atomic result reporting. Scores are given from the reporter's own point of view
-- (my score / opponent score) and mapped to player_1/player_2 based on which slot the
-- reporter actually occupies, so the client never has to know or guess that mapping.
create or replace function public.report_match_result(
  p_match_id uuid,
  p_my_score integer,
  p_opponent_score integer,
  p_comment text default null,
  p_evidence_path text default null
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_p1_score integer;
  v_p2_score integer;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_caller_id <> v_match.player_1_id and v_caller_id <> v_match.player_2_id then
    raise exception 'Not a participant in this match';
  end if;

  if v_match.status not in ('READY', 'IN_PROGRESS') then
    raise exception 'This match cannot be reported right now';
  end if;

  if p_my_score < 0 or p_opponent_score < 0 then
    raise exception 'Scores cannot be negative';
  end if;

  if v_caller_id = v_match.player_1_id then
    v_p1_score := p_my_score;
    v_p2_score := p_opponent_score;
  else
    v_p1_score := p_opponent_score;
    v_p2_score := p_my_score;
  end if;

  insert into public.match_reports (match_id, reported_by, player_1_score, player_2_score, evidence_path, comment)
  values (p_match_id, v_caller_id, v_p1_score, v_p2_score, p_evidence_path, p_comment);

  update public.matches
  set player_1_score = v_p1_score,
      player_2_score = v_p2_score,
      status = 'AWAITING_CONFIRMATION'
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

grant execute on function public.report_match_result(uuid, integer, integer, text, text) to authenticated;

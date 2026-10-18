-- Phase 7: disputes (contested results, absent opponent, connection issues, cheating
-- suspicion, ...) and a minimal admin_logs table so resolutions leave an audit trail.

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'RESULT_CONTESTED', 'OPPONENT_ABSENT', 'DISCONNECTION', 'GAME_SERVER_DOWN',
    'CONNECTION_ISSUE', 'WRONG_IDENTIFIER', 'ABUSIVE_BEHAVIOR', 'CHEATING_SUSPICION', 'OTHER'
  )),
  description text,
  evidence_path text,
  status text not null default 'OPEN' check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  decision text,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index disputes_match_id_idx on public.disputes (match_id);
create index disputes_status_idx on public.disputes (status);

alter table public.disputes enable row level security;

create policy "disputes_select_participant_or_admin" on public.disputes
  for select to authenticated
  using (
    opened_by = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = disputes.match_id and (m.player_1_id = auth.uid() or m.player_2_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN'))
  );
-- No insert/update policy: creation goes through open_dispute(), resolution through
-- resolve_dispute() (Phase 10 admin screens call the latter).

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_logs enable row level security;

create policy "admin_logs_select_admin" on public.admin_logs
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));
-- No insert policy for clients: only security-definer functions write here.

create or replace function public.open_dispute(
  p_match_id uuid,
  p_reason text,
  p_description text default null,
  p_evidence_path text default null
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_dispute public.disputes%rowtype;
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

  if v_match.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'This match is already closed';
  end if;

  insert into public.disputes (match_id, opened_by, reason, description, evidence_path)
  values (p_match_id, v_caller_id, p_reason, p_description, p_evidence_path)
  returning * into v_dispute;

  update public.matches set status = 'DISPUTED' where id = p_match_id;

  return v_dispute;
end;
$$;

grant execute on function public.open_dispute(uuid, text, text, text) to authenticated;

create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_winner_id uuid default null,
  p_new_status text default 'RESOLVED'
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_dispute public.disputes%rowtype;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_new_status not in ('RESOLVED', 'DISMISSED') then
    raise exception 'Invalid resolution status';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Dispute not found';
  end if;

  update public.disputes
  set status = p_new_status, decision = p_decision, resolved_by = v_caller_id, resolved_at = now()
  where id = p_dispute_id;

  if p_new_status = 'RESOLVED' and p_winner_id is not null then
    perform public.advance_winner(v_dispute.match_id, p_winner_id);
  elsif p_new_status = 'DISMISSED' then
    -- Send the match back to being playable instead of leaving it stuck as DISPUTED.
    update public.matches
    set status = case when player_1_id is not null and player_2_id is not null then 'READY' else 'SCHEDULED' end
    where id = v_dispute.match_id and status = 'DISPUTED';
  end if;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  values (
    v_caller_id, 'resolve_dispute', 'dispute', p_dispute_id,
    jsonb_build_object('status', 'OPEN'),
    jsonb_build_object('status', p_new_status, 'decision', p_decision, 'winner_id', p_winner_id)
  );

  select * into v_dispute from public.disputes where id = p_dispute_id;
  return v_dispute;
end;
$$;

grant execute on function public.resolve_dispute(uuid, text, uuid, text) to authenticated;

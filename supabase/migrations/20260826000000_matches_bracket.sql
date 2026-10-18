-- Phase 4: matches table + atomic, server-side single-elimination bracket generation.
-- The bracket is built from the final round backward to round 1, so each earlier match
-- can point next_match_id at an already-created match in the following round.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round integer not null check (round > 0),
  match_number integer not null check (match_number > 0),
  player_1_id uuid references public.profiles (id) on delete set null,
  player_2_id uuid references public.profiles (id) on delete set null,
  player_1_score integer,
  player_2_score integer,
  winner_id uuid references public.profiles (id) on delete set null,
  next_match_id uuid references public.matches (id) on delete set null,
  next_match_slot integer check (next_match_slot in (1, 2)),
  scheduled_at timestamptz,
  deadline timestamptz,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'READY', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED', 'COMPLETED', 'FORFEIT', 'CANCELLED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint matches_unique_slot unique (tournament_id, round, match_number)
);

create index matches_tournament_id_idx on public.matches (tournament_id);
create index matches_status_idx on public.matches (status);
create index matches_next_match_id_idx on public.matches (next_match_id);

alter table public.matches enable row level security;
-- No policies for regular clients: reads go through matches_public below, and every
-- write goes through a security-definer function (generate_bracket now; the result
-- report/confirm functions land in a later phase). Nothing here is meant to be
-- readable or writable directly by a client role.

create view public.matches_public as
select
  m.*,
  p1.username as player_1_username,
  p2.username as player_2_username
from public.matches m
left join public.profiles p1 on p1.id = m.player_1_id
left join public.profiles p2 on p2.id = m.player_2_id;

grant select on public.matches_public to authenticated;

create or replace function public.generate_bracket(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_tournament public.tournaments%rowtype;
  v_participant_ids uuid[];
  v_size integer;
  v_total_rounds integer;
  v_round integer;
  v_matches_in_round integer;
  v_match_number integer;
  v_match_id uuid;
  v_prev_round_ids uuid[];
  v_curr_round_ids uuid[];
  v_match_ids_round1 uuid[];
  v_slot integer;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  -- Only the tournament's creator or an admin can generate its bracket. Calling this
  -- directly as postgres (e.g. from the SQL editor, with no JWT/auth context) leaves
  -- both sides null, which this check treats as authorized -- that's intentional: it's
  -- how we trigger bracket generation for now, before Phase 10 has a real admin UI.
  if v_tournament.created_by is distinct from v_caller_id
     and coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized to generate this bracket';
  end if;

  if v_tournament.status not in ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED') then
    raise exception 'Tournament is not ready for bracket generation';
  end if;

  if exists (select 1 from public.matches where tournament_id = p_tournament_id) then
    raise exception 'Bracket already generated for this tournament';
  end if;

  select array_agg(user_id order by random())
  into v_participant_ids
  from public.tournament_participants
  where tournament_id = p_tournament_id and status = 'REGISTERED';

  v_size := coalesce(array_length(v_participant_ids, 1), 0);

  if v_size < 2 then
    raise exception 'Not enough participants to generate a bracket';
  end if;

  -- Byes aren't supported yet: the registered count must exactly fill a power-of-two
  -- bracket. (v_size & (v_size - 1) = 0) is the standard power-of-two bit trick.
  if (v_size & (v_size - 1)) <> 0 then
    raise exception 'Participant count must be a power of two (byes are not supported yet)';
  end if;

  if v_size > v_tournament.max_players then
    raise exception 'Too many participants for this tournament''s bracket size';
  end if;

  v_total_rounds := round(log(2::numeric, v_size::numeric))::integer;
  v_prev_round_ids := array[]::uuid[];

  for v_round in reverse v_total_rounds..1 loop
    v_matches_in_round := v_size / power(2, v_round)::integer;
    v_curr_round_ids := array[]::uuid[];

    for v_match_number in 1..v_matches_in_round loop
      insert into public.matches (tournament_id, round, match_number, status)
      values (p_tournament_id, v_round, v_match_number, 'SCHEDULED')
      returning id into v_match_id;

      if v_round < v_total_rounds then
        update public.matches
        set next_match_id = v_prev_round_ids[((v_match_number - 1) / 2) + 1],
            next_match_slot = ((v_match_number - 1) % 2) + 1
        where id = v_match_id;
      end if;

      v_curr_round_ids := array_append(v_curr_round_ids, v_match_id);
    end loop;

    v_prev_round_ids := v_curr_round_ids;
    if v_round = 1 then
      v_match_ids_round1 := v_curr_round_ids;
    end if;
  end loop;

  v_slot := 1;
  for v_match_number in 1..array_length(v_match_ids_round1, 1) loop
    update public.matches
    set player_1_id = v_participant_ids[v_slot],
        player_2_id = v_participant_ids[v_slot + 1],
        status = 'READY'
    where id = v_match_ids_round1[v_match_number];

    v_slot := v_slot + 2;
  end loop;

  update public.tournaments set status = 'IN_PROGRESS' where id = p_tournament_id;
end;
$$;

grant execute on function public.generate_bracket(uuid) to authenticated;

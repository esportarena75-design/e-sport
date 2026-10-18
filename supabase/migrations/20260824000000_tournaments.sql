-- Phase 3: tournaments, participants, and an atomic join function that closes the
-- last-slot race condition (two users can never both grab the final seat).

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  game_id uuid not null references public.games (id) on delete restrict,
  platform_id uuid not null references public.platforms (id) on delete restrict,
  format text not null default '1V1',
  max_players integer not null check (max_players in (8, 16, 32, 64)),
  registration_start timestamptz not null,
  registration_end timestamptz not null,
  start_date timestamptz not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  rules text,
  -- No payments in v1: these columns exist so the schema won't need reshaping later,
  -- but they are hard-locked to zero for now -- nothing reads them as real money.
  entry_fee numeric not null default 0 check (entry_fee = 0),
  prize_pool numeric not null default 0 check (prize_pool = 0),
  currency text not null default 'EUR',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint registration_window check (registration_start < registration_end),
  constraint registration_before_start check (registration_end <= start_date)
);

create index tournaments_status_idx on public.tournaments (status);
create index tournaments_game_id_idx on public.tournaments (game_id);
create index tournaments_platform_id_idx on public.tournaments (platform_id);
create index tournaments_start_date_idx on public.tournaments (start_date);

alter table public.tournaments enable row level security;

-- Drafts are admin-only (no write path exists for regular users yet -- creation is a
-- Phase 10 admin feature; for now rows are inserted directly via the SQL editor).
create policy "tournaments_select_published" on public.tournaments
  for select to authenticated using (status <> 'DRAFT');

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now(),
  status text not null default 'REGISTERED'
    check (status in ('REGISTERED', 'CHECKED_IN', 'WITHDRAWN', 'DISQUALIFIED')),
  seed integer,
  constraint tournament_participants_unique unique (tournament_id, user_id)
);

create index tournament_participants_tournament_id_idx on public.tournament_participants (tournament_id);
create index tournament_participants_user_id_idx on public.tournament_participants (user_id);

alter table public.tournament_participants enable row level security;

-- No direct client SELECT on the base table: participant lists are read through
-- tournament_participants_public below (it needs to join profiles for the username,
-- which a normal user's RLS on `profiles` wouldn't allow them to read row-by-row).
create policy "tournament_participants_insert_own" on public.tournament_participants
  for insert to authenticated with check (false);
  -- Actual joining always goes through join_tournament() below, which does the
  -- capacity/eligibility checks that a bare RLS check can't express atomically.
  -- This policy intentionally blocks direct inserts entirely; it exists so RLS
  -- is "enabled with an explicit policy" rather than silently deny-by-default.

-- Self-service unregistration, but only while registration is still open -- once it
-- closes, leaving is a forfeit (a later phase's concern), not a plain delete.
create policy "tournament_participants_delete_own" on public.tournament_participants
  for delete to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_participants.tournament_id
        and t.status = 'REGISTRATION_OPEN'
    )
  );

-- Atomic, race-safe registration. Locks the tournament row first so two concurrent
-- calls for the same tournament serialize instead of both reading "1 seat left" and
-- both inserting.
create or replace function public.join_tournament(p_tournament_id uuid)
returns public.tournament_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_current_count integer;
  v_has_game_account boolean;
  v_participant public.tournament_participants%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile.status <> 'ACTIVE' then
    raise exception 'Account is not active';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_tournament.status <> 'REGISTRATION_OPEN' then
    raise exception 'Registration is not open for this tournament';
  end if;

  if exists (
    select 1 from public.tournament_participants
    where tournament_id = p_tournament_id and user_id = v_user_id
  ) then
    raise exception 'Already registered';
  end if;

  select count(*) into v_current_count
  from public.tournament_participants
  where tournament_id = p_tournament_id;

  if v_current_count >= v_tournament.max_players then
    raise exception 'Tournament is full';
  end if;

  select exists (
    select 1 from public.game_accounts
    where user_id = v_user_id
      and game_id = v_tournament.game_id
      and platform_id = v_tournament.platform_id
  ) into v_has_game_account;

  if not v_has_game_account then
    raise exception 'No matching game account for this tournament''s game and platform';
  end if;

  insert into public.tournament_participants (tournament_id, user_id)
  values (p_tournament_id, v_user_id)
  returning * into v_participant;

  return v_participant;
end;
$$;

grant execute on function public.join_tournament(uuid) to authenticated;

-- Read models: pre-joined views so screens can fetch a tournament card (with game/
-- platform names and a live seat count) or a participant list (with usernames) in a
-- single request, without needing per-row RLS on `profiles` to cooperate.

create view public.tournaments_public as
select
  t.*,
  coalesce(tp.participant_count, 0) as participant_count,
  g.name as game_name,
  g.slug as game_slug,
  pl.name as platform_name,
  pl.slug as platform_slug
from public.tournaments t
join public.games g on g.id = t.game_id
join public.platforms pl on pl.id = t.platform_id
left join (
  select tournament_id, count(*) as participant_count
  from public.tournament_participants
  group by tournament_id
) tp on tp.tournament_id = t.id
where t.status <> 'DRAFT';

grant select on public.tournaments_public to authenticated;

create view public.tournament_participants_public as
select
  tp.id,
  tp.tournament_id,
  tp.user_id,
  p.username,
  p.avatar_url,
  tp.status,
  tp.seed,
  tp.registered_at
from public.tournament_participants tp
join public.profiles p on p.id = tp.user_id;

grant select on public.tournament_participants_public to authenticated;

-- Seed data so the tournament list/detail/registration flow is testable immediately,
-- without waiting on the Phase 10 admin UI.
insert into public.tournaments (
  name, description, game_id, platform_id, max_players,
  registration_start, registration_end, start_date, status, rules
)
values (
  'FC Friday Cup',
  'Tournoi hebdomadaire 1v1 sur EA Sports FC.',
  (select id from public.games where slug = 'ea-sports-fc'),
  (select id from public.platforms where slug = 'ps5'),
  8,
  now(),
  now() + interval '3 days',
  now() + interval '4 days',
  'REGISTRATION_OPEN',
  'Match aller simple. Le joueur qui déclare un résultat confirmé par son adversaire est qualifié pour le tour suivant. Tout forfait après le début du tournoi entraîne une élimination.'
),
(
  'FC Weekend Cup',
  'Tournoi du week-end, 16 joueurs, EA Sports FC sur PS5.',
  (select id from public.games where slug = 'ea-sports-fc'),
  (select id from public.platforms where slug = 'ps5'),
  16,
  now(),
  now() + interval '5 days',
  now() + interval '6 days',
  'REGISTRATION_OPEN',
  'Match aller simple. Le joueur qui déclare un résultat confirmé par son adversaire est qualifié pour le tour suivant. Tout forfait après le début du tournoi entraîne une élimination.'
);

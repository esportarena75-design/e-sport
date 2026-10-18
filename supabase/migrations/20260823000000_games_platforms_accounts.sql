-- Phase 2: games, platforms (admin-managed reference data) and game_accounts
-- (per-user gaming identifiers, e.g. a PSN username for EA Sports FC).

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.platforms enable row level security;

-- Reference data: readable by everyone, writable only via service_role (future admin tools).
create policy "games_select_all" on public.games for select using (true);
create policy "platforms_select_all" on public.platforms for select using (true);

create table public.game_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  platform_id uuid not null references public.platforms (id) on delete restrict,
  player_identifier text not null check (char_length(player_identifier) between 2 and 40),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint game_accounts_unique_per_user unique (user_id, game_id, platform_id)
);

create index game_accounts_user_id_idx on public.game_accounts (user_id);

alter table public.game_accounts enable row level security;

create policy "game_accounts_select_own" on public.game_accounts
  for select using (auth.uid() = user_id);

create policy "game_accounts_insert_own" on public.game_accounts
  for insert with check (auth.uid() = user_id);

-- `verified` has no verification flow behind it yet (reserved for a later phase), so letting
-- a user edit their own row -- including that column -- carries no real risk today. Revisit
-- this policy (or split it per-column) once verification actually means something.
create policy "game_accounts_update_own" on public.game_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "game_accounts_delete_own" on public.game_accounts
  for delete using (auth.uid() = user_id);

-- Seed data: the MVP's first game/platform (EA Sports FC on PS5), plus the other
-- platforms already named in the product spec so the picker isn't a dead end.
insert into public.games (name, slug) values
  ('EA Sports FC', 'ea-sports-fc');

insert into public.platforms (name, slug) values
  ('PlayStation 5', 'ps5'),
  ('Xbox Series', 'xbox-series'),
  ('PC', 'pc');

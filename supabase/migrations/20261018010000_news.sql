-- Actus e-sport FR affichées sur l'accueil.
-- Les actus changent chaque semaine : elles vivent en base (modifiables par un admin depuis
-- le Table Editor Supabase, sans republier l'appli) plutôt qu'en dur dans le code.

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 3 and 280),
  tag text check (char_length(tag) <= 24),          -- ex. "LoL", "Valorant", "Scène FR"
  source_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  image_url text check (image_url is null or image_url ~ '^https://'),
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index news_published_at_idx on public.news (published_at desc) where is_published;

alter table public.news enable row level security;

create policy "news_select_published" on public.news
  for select to authenticated
  using (
    is_published
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN'))
  );

create policy "news_insert_admin" on public.news
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));

create policy "news_update_admin" on public.news
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));

create policy "news_delete_admin" on public.news
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));

-- Les visiteurs non connectés n'ont rien à lire ici (l'accueil est derrière la connexion).
revoke all on public.news from anon;

-- Actus de départ (vérifiées le 18/10/2026, chacune renvoie vers sa source).
insert into public.news (title, summary, tag, source_name, source_url, published_at) values
(
  'Vitality en Grande Finale des Valorant Champions',
  'Après sa défaite en finale du winner bracket face à LOUD, Vitality bat 100 Thieves 3-1 et retrouve les Brésiliens en Grande Finale à Shanghai.',
  'Valorant',
  'VLR.gg',
  'https://www.vlr.gg/754743/team-vitality-vs-100-thieves-valorant-champions-2026-lbf',
  '2026-10-17 09:00:00+02'
),
(
  'La Karmine Corp écrase MVK et file en finale du Play-In',
  'Pour ses premiers Worlds, la KC s''impose 3-0 contre MVK Esports à Los Angeles. Une victoire en finale l''enverrait au Swiss Stage, qui débute le 23 octobre au Texas.',
  'LoL',
  'Team-AAA',
  'https://www.team-aaa.com/fr/actualite/worlds-2026-la-karmine-corp-mvk-play-in_137327',
  '2026-10-17 08:00:00+02'
),
(
  'Après l''EWC à Paris, la loi esport toujours en attente',
  'L''Esports World Cup s''est tenue à Paris cet été. La proposition de loi « pour un esport responsable et attractif » attend toujours son examen.',
  'Scène FR',
  'Esports Advocate',
  'https://esportsadvocate.net/2026/10/esports-government-france-ewc-national-pride/',
  '2026-10-15 10:00:00+02'
),
(
  'Champions 2026 : Vitality qualifiée, la Karmine Corp éliminée',
  'Vitality termine première de son groupe et reste le seul représentant EMEA en playoffs. La KC s''incline 2-1 face à Nongshim RedForce.',
  'Valorant',
  'Actu-Lan',
  'https://www.actu-lan.com/2026/10/05/champions-2026-vitality-en-playoffs-la-karmine-corp-eliminee/',
  '2026-10-05 12:00:00+02'
),
(
  'EWC 2026 : Vitality sur le podium du Club Championship',
  'À la Porte de Versailles, Vitality termine 3e du classement des clubs de l''Esports World Cup (4 M$). La Karmine Corp décroche l''argent sur League of Legends.',
  'Scène FR',
  'Wikipédia',
  'https://en.wikipedia.org/wiki/2026_Esports_World_Cup',
  '2026-08-24 10:00:00+02'
);

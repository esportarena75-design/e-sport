-- Mise à jour automatique des actus (Edge Function `sync-news`).

-- Distingue les actus importées automatiquement de celles saisies à la main :
-- seules les premières sont purgées au bout de 45 jours.
alter table public.news add column is_auto boolean not null default false;

-- Une même URL ne peut exister qu'une fois : permet à la fonction d'ignorer les doublons.
create unique index news_source_url_key on public.news (source_url);

-- La première actu de départ est périmée : LOUD a battu Vitality en Grande Finale.
-- On la dépublie (le flux automatique apportera le récit à jour).
update public.news
set is_published = false
where source_url = 'https://www.vlr.gg/754743/team-vitality-vs-100-thieves-valorant-champions-2026-lbf';

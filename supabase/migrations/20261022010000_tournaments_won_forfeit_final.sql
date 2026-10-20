-- Une finale gagnée par forfait de l'adversaire (statut FORFEIT) comptait comme « pas de titre ».
-- On compte désormais toute finale terminée (COMPLETED ou FORFEIT) dont le joueur est le vainqueur.
-- Mêmes colonnes que la vue d'origine : create or replace view suffit, `rankings` reste valide.
create or replace view public.player_stats as
select
  p.id as user_id,
  count(*) filter (where m.status = 'COMPLETED') as matches_played,
  count(*) filter (where m.status = 'COMPLETED' and m.winner_id = p.id) as matches_won,
  count(*) filter (where m.status = 'COMPLETED' and m.winner_id is not null and m.winner_id <> p.id) as matches_lost,
  case
    when count(*) filter (where m.status = 'COMPLETED') > 0 then
      round(
        100.0 * count(*) filter (where m.status = 'COMPLETED' and m.winner_id = p.id)
        / count(*) filter (where m.status = 'COMPLETED'),
        1
      )
    else 0
  end as win_rate,
  (select count(distinct tournament_id) from public.tournament_participants where user_id = p.id) as tournaments_played,
  (
    select count(*) from public.matches fm
    where fm.next_match_id is null and fm.status in ('COMPLETED', 'FORFEIT') and fm.winner_id = p.id
  ) as tournaments_won
from public.profiles p
left join public.matches m on (m.player_1_id = p.id or m.player_2_id = p.id)
group by p.id;

-- La liste « mes matchs » affiche la date, l'heure et un compte à rebours. Les matchs n'ont pas de
-- date propre tant qu'un admin n'en fixe pas (scheduled_at est vide à la génération du bracket) :
-- on expose donc le nom et la date de début du tournoi pour afficher au moins la date du premier tour.
-- Colonnes ajoutées à la fin : create or replace view conserve les colonnes existantes.
create or replace view public.matches_public as
select
  m.*,
  p1.username as player_1_username,
  p2.username as player_2_username,
  t.name as tournament_name,
  t.start_date as tournament_start_date
from public.matches m
left join public.profiles p1 on p1.id = m.player_1_id
left join public.profiles p2 on p2.id = m.player_2_id
left join public.tournaments t on t.id = m.tournament_id;

grant select on public.matches_public to authenticated;

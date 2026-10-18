-- Phase 9: player stats and ranking, computed live from matches/tournaments rather
-- than maintained as stored counters (no risk of the two drifting out of sync).

create view public.player_stats as
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
    where fm.next_match_id is null and fm.status = 'COMPLETED' and fm.winner_id = p.id
  ) as tournaments_won
from public.profiles p
left join public.matches m on (m.player_1_id = p.id or m.player_2_id = p.id)
group by p.id;

grant select on public.player_stats to authenticated;

create view public.rankings as
select
  ps.user_id,
  pp.username,
  pp.avatar_url,
  ps.matches_played,
  ps.matches_won,
  ps.matches_lost,
  ps.win_rate,
  ps.tournaments_played,
  ps.tournaments_won,
  (ps.matches_won * 3) as score
from public.player_stats ps
join public.public_profiles pp on pp.id = ps.user_id
where ps.matches_played > 0;

grant select on public.rankings to authenticated;

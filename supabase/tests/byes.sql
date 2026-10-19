-- Exemptions (byes) : de 2 à 16 inscrits sur un tournoi de 16 places. Exécuté par run.sh après scenario.sql.
-- Chaque ligne affichée doit se terminer par "OK".
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data)
select ('11111111-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid,
       jsonb_build_object('username','bye'||i,'birth_date','1995-01-01','terms_accepted',true,'privacy_accepted',true,'rules_accepted',true)
from generate_series(1,16) i;

do $$
declare
  n int; t uuid; size int; exp_byes int; r1_byes int; matches_total int;
  distinct_players int; bye_not_first int; r2_bad int; ghost int; first_ids uuid[];
begin
  for n in 2..16 loop
    insert into tournaments (name, game_id, platform_id, max_players, registration_start, registration_end, start_date, status)
    select 'Byes ' || n, game_id, platform_id, 16, registration_start, registration_end, start_date, 'REGISTRATION_OPEN'
    from tournaments where name = 'FC Weekend Cup' returning id into t;

    insert into tournament_participants (tournament_id, user_id, status, registered_at)
    select t, ('11111111-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, 'REGISTERED',
           now() - interval '1 day' + (i || ' minutes')::interval
    from generate_series(1, n) i;

    perform public.generate_bracket(t);

    size := 2; while size < n loop size := size * 2; end loop;
    exp_byes := size - n;

    select count(*) into matches_total from matches where tournament_id = t;
    select count(*) into r1_byes from matches where tournament_id = t and round = 1 and status = 'FORFEIT';
    -- tous les inscrits sont placés exactement une fois au tour 1
    select count(distinct p) into distinct_players from (
      select player_1_id p from matches where tournament_id = t and round = 1
      union all select player_2_id from matches where tournament_id = t and round = 1) s where p is not null;
    -- les exemptés sont bien parmi les premiers inscrits
    select count(*) into bye_not_first from matches m
      join tournament_participants tp on tp.tournament_id = t and tp.user_id = m.winner_id
      where m.tournament_id = t and m.round = 1 and m.status = 'FORFEIT'
        and tp.registered_at > now() - interval '1 day' + ((exp_byes) || ' minutes')::interval;
    -- chaque exempté est déjà au tour 2
    select count(*) into r2_bad from matches m1
      where m1.tournament_id = t and m1.round = 1 and m1.status = 'FORFEIT'
        and not exists (select 1 from matches m2 where m2.id = m1.next_match_id
                        and m1.winner_id in (coalesce(m2.player_1_id, '00000000-0000-0000-0000-000000000000'), coalesce(m2.player_2_id, '00000000-0000-0000-0000-000000000000')));
    -- aucun match du tour 1 sans joueur ; un match READY a deux joueurs
    select count(*) into ghost from matches where tournament_id = t
      and ((round = 1 and player_1_id is null and player_2_id is null)
        or (status = 'READY' and (player_1_id is null or player_2_id is null)));

    raise notice 'n=% taille=% : matchs=% (attendu %) byes=% (attendu %) joueurs placés=% byes_non_premiers=% exemptes_absents_T2=% anomalies=% -> %',
      n, size, matches_total, size - 1, r1_byes, exp_byes, distinct_players, bye_not_first, r2_bad, ghost,
      case when matches_total = size - 1 and r1_byes = exp_byes and distinct_players = n
                and bye_not_first = 0 and r2_bad = 0 and ghost = 0 then 'OK' else 'ECHEC' end;
  end loop;
end $$;

\echo '--- n = 1 : doit echouer (Not enough participants)'
do $$ declare t uuid; begin
  insert into tournaments (name, game_id, platform_id, max_players, registration_start, registration_end, start_date, status)
  select 'Byes seul', game_id, platform_id, 16, registration_start, registration_end, start_date, 'REGISTRATION_OPEN'
  from tournaments where name = 'FC Weekend Cup' returning id into t;
  insert into tournament_participants (tournament_id, user_id, status) values (t, '11111111-0000-0000-0000-000000000001', 'REGISTERED');
  perform public.generate_bracket(t);
end $$;

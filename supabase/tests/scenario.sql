-- Scénario de test exécuté par run.sh (base locale jetable, jamais sur Supabase).
\set ON_ERROR_STOP 0
-- 8 joueurs avec compte de jeu PS5
insert into auth.users (id, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || i)::uuid,
       jsonb_build_object('username','joueur'||i,'birth_date','1995-01-01','terms_accepted',true,'privacy_accepted',true,'rules_accepted',true)
from generate_series(1,8) i;
insert into public.game_accounts (user_id, game_id, platform_id, player_identifier)
select p.id, (select id from games limit 1), (select id from platforms where slug='ps5'), p.username from profiles p;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;

-- inscriptions au FC Friday Cup (8 places)
do $$ declare i int; t uuid := (select id from tournaments where name='FC Friday Cup'); begin
  for i in 1..8 loop
    perform pg_temp.as_user(('00000000-0000-0000-0000-00000000000' || i)::uuid);
    set local role authenticated;
    perform public.join_tournament(t);
    reset role;
  end loop; end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','',false);
select public.generate_bracket((select id from tournaments where name='FC Friday Cup'));
select count(*) as nb_matchs from matches;

-- Match 1 du round 1
select id as m1, player_1_id as a, player_2_id as b from matches where round=1 and match_number=1 \gset

\echo '--- TEST 1 : un utilisateur quelconque appelle advance_winner directement (faille)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
set role authenticated;
select public.advance_winner(:'m1', :'a', 'COMPLETED');
reset role;
select id as wk from tournaments where name='FC Weekend Cup' \gset
\echo '--- TEST 1bis : appel anonyme de generate_bracket'
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','anon',false);
set role anon;
select public.generate_bracket(:'wk');
reset role;

\echo '--- TEST 2 : flux normal declaration puis confirmation'
-- remettre le match 1 en état READY au cas où le test 1 l'a fait avancer
update matches set status='READY', winner_id=null, completed_at=null where id=:'m1';
select pg_temp.as_user(:'a'); set role authenticated;
select status from public.report_match_result(:'m1', 3, 1);
reset role;
select pg_temp.as_user(:'b'); set role authenticated;
select status, winner_id = :'a' as bon_vainqueur from public.confirm_match_result(:'m1');
reset role;

\echo '--- TEST 3 : score nul declare'
select id as m2, player_1_id as c, player_2_id as d from matches where round=1 and match_number=2 \gset
select pg_temp.as_user(:'c'); set role authenticated;
select status from public.report_match_result(:'m2', 2, 2);
reset role;

\echo '--- TEST 4 : litige sur un match deja termine'
select pg_temp.as_user(:'a'); set role authenticated;
select status from public.open_dispute(:'m1', 'OTHER');
reset role;

\echo '--- TEST 5 : litige ouvert puis resolu deux fois'
select id as m3, player_1_id as e, player_2_id as f from matches where round=1 and match_number=3 \gset
select pg_temp.as_user(:'e'); set role authenticated;
select id as disp from public.open_dispute(:'m3', 'OPPONENT_ABSENT') \gset
reset role;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role='ADMIN' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
\echo 'resolution sans vainqueur (doit echouer)'
select status from public.resolve_dispute(:'disp', 'x', null, 'RESOLVED');
\echo 'vainqueur hors match (doit echouer)'
select status from public.resolve_dispute(:'disp', 'x', :'a', 'RESOLVED');
\echo 'resolution correcte'
select status from public.resolve_dispute(:'disp', 'e gagne', :'e', 'RESOLVED');
\echo 'seconde resolution (doit echouer)'
select status from public.resolve_dispute(:'disp', 'f gagne', :'f', 'RESOLVED');
reset role;
select m.status, m.winner_id = :'e' as e_gagne from matches m where id=:'m3';

\echo '--- TEST 6 : inscription apres la date de cloture'
update tournaments set registration_end = now() - interval '1 minute', registration_start = now() - interval '2 days' where id = :'wk';
select pg_temp.as_user('00000000-0000-0000-0000-000000000002'); set role authenticated;
select id from public.join_tournament(:'wk');
reset role;
\echo '--- TEST 7 : forfait admin + stats'
select id as m4, player_1_id as g, player_2_id as h from matches where round=1 and match_number=4 \gset
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_forfeit_match(:'m4', :'h', 'absent');
\echo 'second forfait sur le meme match (doit echouer)'
select public.admin_forfeit_match(:'m4', :'g', 'absent');
reset role;
select round, match_number, status, player_1_id is not null as p1, player_2_id is not null as p2 from matches order by round, match_number;

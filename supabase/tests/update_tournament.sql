-- Modification d'un tournoi par un admin. Exécuté par run.sh après admin_users.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role='ADMIN', status='ACTIVE' where id='00000000-0000-0000-0000-000000000001';

select id as tid, registration_end as rend, start_date as sdate from tournaments where name = 'Byes 10' \gset
insert into tournaments (name, game_id, platform_id, max_players, registration_start, registration_end, start_date, status)
 select 'Edit Cup', game_id, platform_id, 8, now() - interval '1 day', now() + interval '1 day', now() + interval '2 days', 'REGISTRATION_OPEN'
 from tournaments where id = :'tid';
select id as open_tid from tournaments where name = 'Edit Cup' \gset

\echo '--- EDIT 1 : un joueur modifie un tournoi (doit echouer)'
select pg_temp.as_user('11111111-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_update_tournament(:'open_tid', 'Nouveau nom', null, null, 16, now() + interval '2 days', now() + interval '3 days');
reset role;
\echo '--- EDIT 2 : tournoi deja en cours (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_update_tournament(:'tid', 'Nouveau nom', null, null, 16, :'rend', :'sdate');
\echo '--- EDIT 3 : nom trop court (doit echouer)'
select public.admin_update_tournament(:'open_tid', 'ab', null, null, 16, now() + interval '2 days', now() + interval '3 days');
\echo '--- EDIT 4 : debut avant la fin des inscriptions (doit echouer)'
select public.admin_update_tournament(:'open_tid', 'Nouveau nom', null, null, 16, now() + interval '3 days', now() + interval '2 days');
\echo '--- EDIT 5 : modification correcte'
select public.admin_update_tournament(:'open_tid', 'Nouveau nom', 'desc', 'regles', 16, now() + interval '2 days', now() + interval '3 days');
reset role;
select case when name = 'Nouveau nom' and max_players = 16 and rules = 'regles' then 'ok tournoi modifie' else 'ECHEC modification' end as r from tournaments where id = :'open_tid';
select case when count(*) >= 1 then 'ok journal update_tournament' else 'ECHEC journal' end as r from admin_logs where action = 'update_tournament';

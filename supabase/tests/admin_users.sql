-- Recherche de joueurs, levée de sanction, journal. Exécuté par run.sh après schedule.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role='ADMIN', status='ACTIVE' where id='00000000-0000-0000-0000-000000000001';
update profiles set status='ACTIVE' where id='00000000-0000-0000-0000-000000000005';
select username as uname from profiles where id = '00000000-0000-0000-0000-000000000005' \gset

\echo '--- USERS 1 : un joueur cherche des utilisateurs (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
select * from public.admin_search_users('a');
reset role;
\echo '--- USERS 2 : un admin cherche par pseudo'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select case when count(*) >= 1 then 'ok recherche trouve le joueur' else 'ECHEC recherche vide' end as r
  from public.admin_search_users(:'uname') where id = '00000000-0000-0000-0000-000000000005';
select case when count(*) = 0 then 'ok joker % traite comme du texte' else 'ECHEC joker actif' end as r
  from public.admin_search_users('%%%%zzz');
select case when count(*) = 1 then 'ok admin_get_user' else 'ECHEC admin_get_user' end as r from public.admin_get_user('00000000-0000-0000-0000-000000000005');
\echo '--- USERS 3 : lever une sanction sans motif (doit echouer)'
select public.admin_lift_sanction('00000000-0000-0000-0000-000000000005', '');
\echo '--- USERS 4 : lever une sanction sur un joueur actif (doit echouer)'
select public.admin_lift_sanction('00000000-0000-0000-0000-000000000005', 'test');
\echo '--- USERS 5 : bannir puis lever'
select type from public.apply_sanction('00000000-0000-0000-0000-000000000005', 'BAN', 'test');
select public.admin_lift_sanction('00000000-0000-0000-0000-000000000005', 'erreur de moderation');
reset role;
select case when status = 'ACTIVE' then 'ok compte reactive' else 'ECHEC statut ' || status end as r from profiles where id = '00000000-0000-0000-0000-000000000005';
select case when count(*) = 0 then 'ok plus de sanction en cours' else 'ECHEC sanction encore ouverte' end as r
  from sanctions where user_id = '00000000-0000-0000-0000-000000000005' and type = 'BAN' and (end_date is null or end_date > now());
\echo '--- USERS 6 : journal'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select case when count(*) >= 1 then 'ok journal contient lift_sanction' else 'ECHEC journal vide' end as r from public.admin_list_logs(50) where action = 'lift_sanction';
reset role;
\echo '--- USERS 7 : un joueur lit le journal (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
select * from public.admin_list_logs(10);
reset role;

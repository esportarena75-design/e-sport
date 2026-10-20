-- Planification des matchs et suspensions à durée. Exécuté par run.sh après account.sql.
-- Les lignes « doit echouer » doivent afficher une ERROR ; les lignes « ok/ECHEC » sont des assertions.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role='ADMIN' where id='00000000-0000-0000-0000-000000000001';

select m.id as mid, m.player_1_id as p1 from matches m join tournaments t on t.id = m.tournament_id
 where t.name = 'Byes 10' and m.round = 1 and m.match_number = 2 \gset
select id as target from profiles where id = '00000000-0000-0000-0000-000000000005' \gset

\echo '--- PLANIF 1 : un joueur planifie un match (doit echouer)'
select pg_temp.as_user(:'p1'); set role authenticated;
select public.admin_schedule_match(:'mid', now() + interval '2 days');
reset role;
\echo '--- PLANIF 2 : date passee (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_schedule_match(:'mid', now() - interval '1 day');
\echo '--- PLANIF 3 : admin, date future (correcte)'
select public.admin_schedule_match(:'mid', now() + interval '2 days');
reset role;
select case when scheduled_at is not null then 'ok match planifie' else 'ECHEC match non planifie' end as r from matches where id = :'mid';
select case when count(*) = 2 then 'ok 2 joueurs notifies' else 'ECHEC notifications: ' || count(*) end as r from notifications where type = 'match_scheduled' and (data->>'match_id') = :'mid'::text;

\echo '--- SUSPENSION 1 : date de fin passee (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select type from public.apply_sanction(:'target', 'SUSPENSION', 'x', now() - interval '1 day');
\echo '--- SUSPENSION 2 : date de fin sur un avertissement (doit echouer)'
select type from public.apply_sanction(:'target', 'WARNING', 'x', now() + interval '1 day');
\echo '--- SUSPENSION 3 : suspension de 3 jours (correcte)'
select type from public.apply_sanction(:'target', 'SUSPENSION', 'x', now() + interval '3 days');
reset role;
select case when public.lift_expired_suspensions() = 0 then 'ok rien a lever tant que la suspension court' else 'ECHEC levee trop tot' end as r;
select case when status = 'SUSPENDED' then 'ok toujours suspendu' else 'ECHEC statut ' || status end as r from profiles where id = :'target';
update sanctions set end_date = now() - interval '1 minute' where user_id = :'target' and type = 'SUSPENSION';
select case when public.lift_expired_suspensions() = 1 then 'ok 1 compte reactive' else 'ECHEC aucune levee' end as r;
select case when status = 'ACTIVE' then 'ok compte actif' else 'ECHEC statut ' || status end as r from profiles where id = :'target';
\echo '--- SUSPENSION 4 : suspension indefinie jamais levee'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select type from public.apply_sanction(:'target', 'SUSPENSION', 'x');
reset role;
select case when public.lift_expired_suspensions() = 0 then 'ok suspension indefinie conservee' else 'ECHEC levee indue' end as r;
\echo '--- SUSPENSION 5 : lift_expired_suspensions inaccessible depuis l API (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.lift_expired_suspensions();
reset role;

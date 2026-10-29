-- Annonces et vue d'ensemble admin. Exécuté par run.sh après notifications.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role = 'ADMIN', status = 'ACTIVE' where id = '00000000-0000-0000-0000-000000000001';
select id as atid from tournaments where name = 'Rappel Cup' \gset

\echo '--- ANNONCE 1 : un joueur envoie une annonce (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
select public.admin_send_announcement(:'atid', 'Titre', 'Corps');
reset role;
\echo '--- ANNONCE 2 : titre trop court (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_send_announcement(:'atid', 'ab', 'Corps');
\echo '--- ANNONCE 3 : annonce de tournoi'
select public.admin_send_announcement(:'atid', 'Changement d heure', 'Le tournoi est decale.') is not null as envoyee;
reset role;
select case when count(*) = 2 then 'ok annonce recue par les 2 inscrits' else 'ECHEC destinataires: ' || count(*) end as r
 from notifications where type = 'announcement' and (data->>'tournament_id') = :'atid'::text;
select case when count(*) = 0 then 'ok un non-inscrit ne recoit rien' else 'ECHEC fuite' end as r
 from notifications where type = 'announcement' and user_id = '00000000-0000-0000-0000-000000000001' and (data->>'tournament_id') = :'atid'::text;
\echo '--- ANNONCE 4 : sourdine du tournoi -> annonce de tournoi ignoree'
insert into notification_mutes (user_id, tournament_id) values ('00000000-0000-0000-0000-000000000005', :'atid');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_send_announcement(:'atid', 'Deuxieme annonce', 'Corps') is not null as envoyee;
reset role;
select case when count(*) = 1 then 'ok joueur en sourdine ne recoit pas la 2e annonce' else 'ECHEC sourdine: ' || count(*) end as r
 from notifications where type = 'announcement' and user_id = '00000000-0000-0000-0000-000000000005' and (data->>'tournament_id') = :'atid'::text;
\echo '--- ANNONCE 5 : annonce generale -> tous les joueurs actifs'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.admin_send_announcement(null, 'Maintenance', 'Courte maintenance ce soir.') is not null as envoyee;
reset role;
select case when count(*) = (select count(*) from profiles where status = 'ACTIVE') then 'ok annonce generale a tous les actifs' else 'ECHEC generale: ' || count(*) end as r
 from notifications where type = 'announcement' and title = 'Maintenance';
\echo '--- ANNONCE 6 : lecture des annonces par un joueur'
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
select case when count(*) >= 3 then 'ok joueur lit les annonces' else 'ECHEC lecture annonces' end as r from announcements;
reset role;
\echo '--- OVERVIEW 1 : un joueur (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
select * from public.admin_overview();
reset role;
\echo '--- OVERVIEW 2 : un admin'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select case when tournaments_in_progress >= 1 and players >= 1 then 'ok overview renseignee' else 'ECHEC overview vide' end as r from public.admin_overview();
reset role;

-- Notifications autour d'un tournoi. Exécuté par run.sh après update_tournament.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);

\echo '--- NOTIF 1 : le demarrage d un tournoi a prevenu les joueurs avec leur adversaire'
select case when count(*) >= 2 then 'ok tournament_started envoyees' else 'ECHEC aucune notif de demarrage' end as r
 from notifications where type = 'tournament_started' and body like '%vous affrontez%';
select case when count(*) >= 1 then 'ok match_id present' else 'ECHEC match_id absent' end as r
 from notifications where type = 'tournament_started' and data ? 'match_id';

\echo '--- NOTIF 2 : fin de tournoi -> participants prevenus'
select id as t2 from tournaments where name = 'Byes 2' \gset
update tournaments set status = 'COMPLETED' where id = :'t2';
select case when count(*) = (select count(*) from tournament_participants where tournament_id = :'t2' and status in ('REGISTERED','CHECKED_IN'))
  and count(*) >= 1 then 'ok tournament_completed envoyee aux inscrits actifs' else 'ECHEC notif de fin: ' || count(*) end as r
 from notifications where type = 'tournament_completed' and (data->>'tournament_id') = :'t2'::text;

\echo '--- NOTIF 3 : sourdine par tournoi'
select id as mtid from tournaments where name = 'Nouveau nom' \gset
insert into tournament_participants (tournament_id, user_id) values (:'mtid', '00000000-0000-0000-0000-000000000005');
select case when count(*) = 1 then 'ok inscription notifiee avant sourdine' else 'ECHEC inscription non notifiee' end as r
 from notifications where type = 'registration_confirmed' and user_id = '00000000-0000-0000-0000-000000000005' and (data->>'tournament_id') = :'mtid'::text;
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); set role authenticated;
insert into notification_mutes (user_id, tournament_id) values ('00000000-0000-0000-0000-000000000005', :'mtid');
\echo '--- NOTIF 4 : couper les notifications de quelqu un d autre (doit echouer)'
insert into notification_mutes (user_id, tournament_id) values ('00000000-0000-0000-0000-000000000001', :'mtid');
reset role;
insert into notifications (user_id, type, title, body, data)
 values ('00000000-0000-0000-0000-000000000005', 'tournament_updated', 't', 'b', jsonb_build_object('tournament_id', :'mtid'));
select case when count(*) = 0 then 'ok notification ignoree (tournoi en sourdine)' else 'ECHEC sourdine inefficace' end as r
 from notifications where type = 'tournament_updated' and user_id = '00000000-0000-0000-0000-000000000005' and (data->>'tournament_id') = :'mtid'::text;
insert into notifications (user_id, type, title, body, data)
 values ('00000000-0000-0000-0000-000000000005', 'tournament_cancelled', 't', 'b', jsonb_build_object('tournament_id', :'mtid'));
select case when count(*) = 1 then 'ok annulation jamais coupee' else 'ECHEC annulation coupee' end as r
 from notifications where type = 'tournament_cancelled' and user_id = '00000000-0000-0000-0000-000000000005' and (data->>'tournament_id') = :'mtid'::text;
delete from notification_mutes where tournament_id = :'mtid';
insert into notifications (user_id, type, title, body, data)
 values ('00000000-0000-0000-0000-000000000005', 'tournament_updated', 't', 'b', jsonb_build_object('tournament_id', :'mtid'));
select case when count(*) = 1 then 'ok notification de nouveau recue apres reactivation' else 'ECHEC reactivation' end as r
 from notifications where type = 'tournament_updated' and user_id = '00000000-0000-0000-0000-000000000005' and (data->>'tournament_id') = :'mtid'::text;

\echo '--- NOTIF 5 : litige ouvert -> adversaire et admins prevenus'
update profiles set role = 'ADMIN', status = 'ACTIVE' where id = '00000000-0000-0000-0000-000000000001';
select m.id as dmid, m.player_1_id as dp1, m.player_2_id as dp2 from matches m join tournaments t on t.id = m.tournament_id
 where t.name = 'Byes 12' and m.status = 'READY' and m.player_2_id is not null order by m.match_number limit 1 \gset
select pg_temp.as_user(:'dp1'); set role authenticated;
select reason from public.open_dispute(:'dmid', 'OTHER', 'test notif');
reset role;
select case when count(*) = 1 then 'ok adversaire prevenu du litige' else 'ECHEC adversaire non prevenu' end as r
 from notifications where type = 'dispute_opened' and user_id = :'dp2' and (data->>'match_id') = :'dmid'::text;
select case when count(*) >= 1 then 'ok admin prevenu du litige' else 'ECHEC admin non prevenu' end as r
 from notifications where type = 'admin_dispute_opened' and user_id = '00000000-0000-0000-0000-000000000001';

\echo '--- NOTIF 6 : rappels'
insert into tournaments (name, game_id, platform_id, max_players, registration_start, registration_end, start_date, status)
 select 'Rappel Cup', game_id, platform_id, 8, now() - interval '3 days', now() + interval '1 hour', now() + interval '20 hours', 'REGISTRATION_OPEN'
 from tournaments where id = :'mtid';
select id as rtid from tournaments where name = 'Rappel Cup' \gset
insert into tournament_participants (tournament_id, user_id) values (:'rtid', '00000000-0000-0000-0000-000000000005'), (:'rtid', '00000000-0000-0000-0000-000000000004');
select public.send_due_reminders() >= 1 as premier_passage_envoie;
select case when count(*) = 2 then 'ok rappel 24h envoye aux 2 inscrits' else 'ECHEC rappel 24h: ' || count(*) end as r
 from notifications where type = 'tournament_reminder' and (data->>'tournament_id') = :'rtid'::text;
select public.send_due_reminders();
select case when count(*) = 2 then 'ok pas de doublon au 2e passage' else 'ECHEC doublon: ' || count(*) end as r
 from notifications where type = 'tournament_reminder' and (data->>'tournament_id') = :'rtid'::text;
update tournaments set registration_end = now() + interval '10 minutes', start_date = now() + interval '30 minutes' where id = :'rtid';
select public.send_due_reminders() >= 1 as rappel_1h;
select case when count(*) = 4 then 'ok rappel 1h envoye apres decalage' else 'ECHEC rappel 1h: ' || count(*) end as r
 from notifications where type = 'tournament_reminder' and (data->>'tournament_id') = :'rtid'::text;
select m.id as rmid from matches m join tournaments t on t.id = m.tournament_id
 where t.name = 'Byes 13' and m.status = 'READY' and m.player_2_id is not null order by m.match_number limit 1 \gset
update matches set scheduled_at = now() + interval '30 minutes' where id = :'rmid';
select public.send_due_reminders() >= 1 as rappel_match;
select case when count(*) = 2 then 'ok rappel de match aux 2 joueurs' else 'ECHEC rappel match: ' || count(*) end as r
 from notifications where type = 'match_reminder' and (data->>'match_id') = :'rmid'::text;
\echo '--- NOTIF 7 : send_due_reminders inaccessible depuis l API (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.send_due_reminders();
reset role;

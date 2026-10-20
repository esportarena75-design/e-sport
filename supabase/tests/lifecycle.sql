-- Annulation de tournoi, clôture des inscriptions, preuves, hiérarchie des sanctions.
-- Exécuté par run.sh après byes.sql. Les lignes « doit echouer » doivent afficher une ERROR.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role='ADMIN' where id='00000000-0000-0000-0000-000000000001';
update profiles set role='SUPER_ADMIN' where id='00000000-0000-0000-0000-000000000003';
update profiles set role='ADMIN' where id='00000000-0000-0000-0000-000000000004';

\echo '--- SANCTION 1 : un admin se sanctionne lui-meme (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select type from public.apply_sanction('00000000-0000-0000-0000-000000000001', 'WARNING', 'x');
\echo '--- SANCTION 2 : un admin sanctionne un super admin (doit echouer)'
select type from public.apply_sanction('00000000-0000-0000-0000-000000000003', 'BAN', 'x');
\echo '--- SANCTION 3 : un admin sanctionne un autre admin (doit echouer)'
select type from public.apply_sanction('00000000-0000-0000-0000-000000000004', 'BAN', 'x');
\echo '--- SANCTION 4 : un admin sanctionne un joueur (correcte)'
select type from public.apply_sanction('00000000-0000-0000-0000-000000000005', 'WARNING', 'x');
reset role;
\echo '--- SANCTION 5 : un super admin sanctionne un admin (correcte)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000003'); set role authenticated;
select type from public.apply_sanction('00000000-0000-0000-0000-000000000004', 'WARNING', 'x');
reset role;

\echo '--- ANNULATION 1 : un joueur annule un tournoi (doit echouer)'
select id as tc from tournaments where name = 'Byes 5' \gset
select pg_temp.as_user('11111111-0000-0000-0000-000000000001'); set role authenticated;
select public.cancel_tournament(:'tc', 'x');
reset role;
\echo '--- ANNULATION 2 : un admin annule un tournoi en cours (correcte)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.cancel_tournament(:'tc', 'test');
\echo '--- ANNULATION 3 : annuler deux fois (doit echouer)'
select public.cancel_tournament(:'tc', 'test');
reset role;
select status as statut_tournoi from tournaments where id = :'tc';
select status, count(*) as nb from matches where tournament_id = :'tc' group by status order by status;
select count(*) as notifs_annulation from notifications where type = 'tournament_cancelled';
\echo '--- ANNULATION 4 : declarer un score sur un match annule (doit echouer)'
select player_1_id as pc, id as mc from matches where tournament_id = :'tc' and status = 'CANCELLED' and player_1_id is not null limit 1 \gset
select pg_temp.as_user(:'pc'); set role authenticated;
select status from public.report_match_result(:'mc', 3, 1);
reset role;

\echo '--- CLOTURE : inscriptions expirees -> REGISTRATION_CLOSED'
select public.close_expired_registrations() >= 1 as ferme_au_moins_un;
select status as statut_weekend from tournaments where name = 'FC Weekend Cup';

\echo '--- PREUVES 1 : joueur du match depose dans le bon dossier (correcte)'
grant insert on storage.objects to authenticated;
select t.id as tid, m.id as mid, m.player_1_id as pj from matches m join tournaments t on t.id = m.tournament_id
 where t.name = 'Byes 8' and m.round = 1 and m.match_number = 1 \gset
select pg_temp.as_user(:'pj'); set role authenticated;
insert into storage.objects (bucket_id, name) values ('match-evidence', :'tid' || '/' || :'mid' || '/' || :'pj' || '/evidence.jpg');
\echo '--- PREUVES 2 : un joueur qui ne joue pas ce match (doit echouer)'
reset role;
select pg_temp.as_user('11111111-0000-0000-0000-000000000016'); set role authenticated;
insert into storage.objects (bucket_id, name) values ('match-evidence', :'tid' || '/' || :'mid' || '/11111111-0000-0000-0000-000000000016/evidence.jpg');
\echo '--- PREUVES 3 : mauvais tournoi dans le chemin (doit echouer)'
reset role;
select pg_temp.as_user(:'pj'); set role authenticated;
insert into storage.objects (bucket_id, name) values ('match-evidence', '00000000-0000-0000-0000-0000000000aa/' || :'mid' || '/' || :'pj' || '/evidence.jpg');
reset role;

\echo '--- PREUVES 4 : lecture - le joueur voit sa preuve, un tiers non'
grant select on storage.objects to authenticated;
select pg_temp.as_user(:'pj'); set role authenticated;
select count(*) as vu_par_le_joueur from storage.objects where bucket_id = 'match-evidence';
reset role;
select pg_temp.as_user('11111111-0000-0000-0000-000000000016'); set role authenticated;
select count(*) as vu_par_un_tiers from storage.objects where bucket_id = 'match-evidence';
reset role;

-- Suppression de compte. Exécuté par run.sh après profile.sql.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);

select m.id as mid, m.player_1_id as quitte, m.player_2_id as reste
from matches m join tournaments t on t.id = m.tournament_id
where t.name = 'Byes 8' and m.round = 1 and m.match_number = 2 \gset
update auth.users set email = 'quitte@test.fr' where id = :'quitte';
insert into auth.identities (user_id) values (:'quitte');
insert into auth.sessions (user_id) values (:'quitte');
update profiles set bio = 'secret', avatar_url = 'https://exemple.test/a.png' where id = :'quitte';
update profiles set username_changed_at = now() where id = :'quitte';
insert into notifications (user_id, type, title, body) values (:'quitte', 't', 't', 't');

\echo '--- COMPTE 1 : un admin ne peut pas supprimer son compte (doit echouer)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000001'); set role authenticated;
select public.delete_own_account();
reset role;

\echo '--- COMPTE 2 : un joueur supprime son compte (correcte)'
select pg_temp.as_user(:'quitte'); set role authenticated;
select public.delete_own_account();
\echo '--- COMPTE 3 : seconde suppression (doit echouer)'
select public.delete_own_account();
reset role;

\echo '--- verifications (attendu : DELETED, anonymise, FORFEIT gagne par l adversaire, WITHDRAWN, 0, 0, 0)'
select status, username like 'supprime\_%' as pseudo_anonymise, bio is null as bio_vide, avatar_url is null as avatar_vide, birth_date = '1900-01-01' as naissance_effacee
  from profiles where id = :'quitte';
select status, winner_id = :'reste' as adversaire_avance from matches where id = :'mid';
select status as statut_participation from tournament_participants where user_id = :'quitte' and tournament_id = (select id from tournaments where name = 'Byes 8');
select (select count(*) from notifications where user_id = :'quitte') as notifs,
       (select count(*) from auth.identities where user_id = :'quitte') as identites,
       (select count(*) from auth.sessions where user_id = :'quitte') as sessions;
select email like 'deleted+%@deleted.invalid' as email_efface, banned_until = 'infinity' as bloque, encrypted_password = '' as mdp_efface from auth.users where id = :'quitte';

-- Modification du profil : pseudo, bio, avatar, colonnes protégées. Exécuté par run.sh.
\set ON_ERROR_STOP 0
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claim.role','authenticated', false); end $$;
select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false);
update profiles set role = 'USER' where id = '00000000-0000-0000-0000-000000000006';

\echo '--- PROFIL 1 : changer sa bio et son avatar (correcte)'
select pg_temp.as_user('00000000-0000-0000-0000-000000000006'); set role authenticated;
update profiles set bio = 'Joueur FC', avatar_url = 'https://exemple.test/a.png' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 2 : bio trop longue (doit echouer)'
update profiles set bio = repeat('x', 161) where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 3 : avatar en http (doit echouer)'
update profiles set avatar_url = 'http://exemple.test/a.png' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 4 : changer son pseudo (correcte)'
update profiles set username = 'nouveau6' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 5 : re-changer le pseudo tout de suite (doit echouer)'
update profiles set username = 'encore6' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 6 : pseudo deja pris, casse differente (doit echouer)'
reset role;
update profiles set username_changed_at = null where id = '00000000-0000-0000-0000-000000000006';
select pg_temp.as_user('00000000-0000-0000-0000-000000000006'); set role authenticated;
update profiles set username = 'JOUEUR1' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 7 : modifier sa date de naissance (doit echouer)'
update profiles set birth_date = '1980-01-01' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 8 : se promouvoir admin (doit echouer)'
update profiles set role = 'ADMIN' where id = '00000000-0000-0000-0000-000000000006';
\echo '--- PROFIL 9 : modifier le profil d un autre (0 ligne modifiee)'
update profiles set bio = 'piraté' where id = '00000000-0000-0000-0000-000000000007';
reset role;
select username, bio, avatar_url from profiles where id in ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000007') order by id;

\echo '--- AVATAR 1 : envoi dans son dossier (correcte)'
grant insert, delete on storage.objects to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000006'); set role authenticated;
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-000000000006/avatar-1.png');
\echo '--- AVATAR 2 : envoi dans le dossier d un autre (doit echouer)'
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-000000000007/avatar-1.png');
reset role;

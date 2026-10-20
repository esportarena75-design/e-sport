-- Simule le minimum de Supabase (rôles, auth.uid(), storage, pg_net) pour rejouer les migrations en local.
do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth; create schema storage; create schema extensions; create schema net;
create table auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as $$ select 1::bigint $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- Supabase accorde par défaut ces droits sur tout ce qui est créé dans public :
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

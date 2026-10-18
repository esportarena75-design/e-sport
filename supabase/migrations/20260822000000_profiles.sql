-- Phase 1: profiles table, linked 1:1 to auth.users, with RLS and a safe public view.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  country text not null default 'FR',
  birth_date date not null,
  bio text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED')),
  role text not null default 'USER' check (role in ('USER', 'ADMIN', 'SUPER_ADMIN')),
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  rules_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  constraint birth_date_min_age check (birth_date <= (current_date - interval '18 years'))
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- A user can only ever read/update their own full profile row (birth_date is sensitive).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No insert/delete policies: rows are only created by the trigger below (security definer),
-- and never hard-deleted by clients (see prevent_profile_privilege_escalation for soft-delete).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Blocks self-service role changes entirely, and self-service status changes except the
-- one-way ACTIVE -> DELETED transition (account deletion). Anything else (banning,
-- suspending, restoring, promoting to ADMIN) requires the service_role key, i.e. a future
-- admin backend / edge function, never the mobile client.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'Changing role is not allowed';
  end if;

  if new.status is distinct from old.status
     and auth.role() <> 'service_role'
     and not (old.status = 'ACTIVE' and new.status = 'DELETED') then
    raise exception 'Changing status is not allowed';
  end if;

  return new;
end;
$$;

create trigger trg_prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- Creates the profile row right after signup, reading the metadata passed to
-- supabase.auth.signUp(). Re-validates consent flags and (via the birth_date_min_age
-- check above) the 18+ rule server-side, so a client that skips the Zod checks can't
-- bypass either requirement -- the whole signup transaction fails instead.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data ->> 'privacy_accepted')::boolean, false) is not true
     or coalesce((new.raw_user_meta_data ->> 'rules_accepted')::boolean, false) is not true then
    raise exception 'Terms, privacy policy and rules must all be accepted';
  end if;

  insert into public.profiles (
    id, username, country, birth_date,
    terms_accepted_at, privacy_accepted_at, rules_accepted_at
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'country', 'FR'),
    (new.raw_user_meta_data ->> 'birth_date')::date,
    now(), now(), now()
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Safe public slice of profiles (no birth_date, no email). This view is owned by the
-- migration role (postgres), which bypasses the restrictive RLS policies above by design --
-- that's what lets it serve as the one place non-owners can read basic profile info from.
-- Deliberately excludes non-ACTIVE accounts so banned/suspended/deleted players drop out
-- of public listings automatically.
create view public.public_profiles as
select id, username, avatar_url, country, bio, created_at
from public.profiles
where status = 'ACTIVE';

grant select on public.public_profiles to anon, authenticated;

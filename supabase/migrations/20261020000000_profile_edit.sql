-- Modification du profil : photo (avatars), pseudo, bio.
--  1. Bucket public `avatars` (2 Mo max, jpeg/png/webp) : chaque joueur n'écrit que dans son dossier.
--  2. Contraintes : bio 160 caractères max, avatar_url en https.
--  3. Pseudo modifiable au plus une fois tous les 14 jours (anti-usurpation) ; l'unicité (insensible à
--     la casse) est déjà garantie par profiles_username_lower_idx.
--  4. Durcissement : le client ne peut plus modifier birth_date ni les dates d'acceptation des
--     conditions (la policy RLS « update own » autorisait toutes les colonnes). Restent modifiables :
--     username, avatar_url, bio, country, status, role (status/role restent protégés par
--     le trigger prevent_profile_privilege_escalation).

-- 1. Avatars --------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Chemin : {user_id}/avatar-<horodatage>.<ext>
create policy "avatars_select_all" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Contraintes ----------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  add constraint profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://');

-- 3. Fréquence de changement du pseudo ---------------------------------------------------------
alter table public.profiles add column username_changed_at timestamptz;

create or replace function public.limit_username_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  if new.username is distinct from old.username then
    select role into v_caller_role from public.profiles where id = auth.uid();
    if auth.role() <> 'service_role'
       and coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN')
       and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '14 days' then
      raise exception 'Username can only be changed every 14 days';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_limit_username_changes
  before update on public.profiles
  for each row execute function public.limit_username_changes();

-- 4. Colonnes modifiables par le client --------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (username, avatar_url, bio, country, status, role) on public.profiles to authenticated;

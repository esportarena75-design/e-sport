-- Vraie suppression de compte (RGPD, exigée par Apple et Google).
-- Jusqu'ici « supprimer mon compte » passait le profil en DELETED : l'e-mail, la date de naissance
-- et le pseudo restaient en base. delete_own_account() :
--   * déclare forfait sur les matchs en cours (l'adversaire avance) et retire le joueur des tournois ;
--   * supprime ses comptes de jeu, appareils de notification et notifications ;
--   * ANONYMISE le profil au lieu de le supprimer : l'historique des adversaires reste cohérent
--     (leur bracket affiche « supprime_xxxxxxxx ») et les clés étrangères ne cassent pas ;
--   * efface l'e-mail, le mot de passe, le téléphone, les identités et les sessions du compte
--     d'authentification, et le bloque définitivement (banned_until = infinity).
-- Les photos du bucket avatars sont supprimées côté appli (API storage) avant cet appel.

-- Le pseudo est anonymisé par la fonction, qui doit pouvoir passer outre la limite d'un
-- changement tous les 14 jours (migration 20261020000000).
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
       and coalesce(current_setting('app.account_deletion', true), '') <> 'on'
       and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '14 days' then
      raise exception 'Username can only be changed every 14 days';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_match public.matches%rowtype;
  v_opponent_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found or v_profile.status = 'DELETED' then
    raise exception 'Account already deleted';
  end if;
  if v_profile.role in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Administrators cannot delete their account';
  end if;

  -- Matchs en cours : forfait, l'adversaire avance.
  for v_match in
    select * from public.matches
    where (player_1_id = v_user_id or player_2_id = v_user_id)
      and status in ('READY', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED')
    order by round
    for update
  loop
    v_opponent_id := case when v_match.player_1_id = v_user_id then v_match.player_2_id else v_match.player_1_id end;
    if v_opponent_id is not null then
      perform public.advance_winner(v_match.id, v_opponent_id, 'FORFEIT');
    end if;
  end loop;

  update public.tournament_participants
  set status = 'WITHDRAWN'
  where user_id = v_user_id and status in ('REGISTERED', 'CHECKED_IN');

  delete from public.game_accounts where user_id = v_user_id;
  delete from public.devices where user_id = v_user_id;
  delete from public.notifications where user_id = v_user_id;

  perform set_config('app.account_deletion', 'on', true);
  update public.profiles
  set username = 'supprime_' || substr(replace(v_user_id::text, '-', ''), 1, 8),
      avatar_url = null,
      bio = null,
      country = 'FR',
      birth_date = date '1900-01-01',
      status = 'DELETED'
  where id = v_user_id;

  -- Compte d'authentification : plus aucune donnée personnelle, connexion impossible.
  delete from auth.identities where user_id = v_user_id;
  delete from auth.sessions where user_id = v_user_id;
  update auth.users
  set email = 'deleted+' || v_user_id::text || '@deleted.invalid',
      phone = null,
      encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb,
      banned_until = 'infinity'
  where id = v_user_id;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

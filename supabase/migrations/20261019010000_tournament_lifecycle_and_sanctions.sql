-- Cycle de vie des tournois, preuves de match et hiérarchie des sanctions.
--  1. Annulation d'un tournoi : ses matchs encore ouverts sont annulés (trigger, donc même
--     si un admin change le statut depuis le Table Editor) ; cancel_tournament() ajoute
--     notifications et journal d'admin.
--  2. Clôture des inscriptions : close_expired_registrations() bascule en REGISTRATION_CLOSED
--     les tournois dont registration_end est passée (à planifier avec pg_cron, voir PROGRESS.md).
--  3. Preuves de match : seul un joueur du match peut déposer une preuve, dans le dossier du
--     bon tournoi / du bon match, tant que le match est ouvert. Corrige aussi la policy de
--     lecture, qui ne voyait jamais aucun match (RLS).
--  4. Sanctions : interdit de se sanctionner soi-même ou un rôle égal / supérieur.
-- Aucune migration existante n'est modifiée ; mêmes signatures que les fonctions remplacées.

-- 1. Annulation ---------------------------------------------------------------------------
create or replace function public.cancel_open_matches_on_tournament_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' then
    update public.matches
    set status = 'CANCELLED'
    where tournament_id = new.id
      and status in ('SCHEDULED', 'READY', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED');

    -- Les litiges encore ouverts sur ces matchs n'ont plus d'objet.
    update public.disputes d
    set status = 'DISMISSED'
    from public.matches m
    where d.match_id = m.id and m.tournament_id = new.id and d.status in ('OPEN', 'UNDER_REVIEW');
  end if;
  return new;
end;
$$;

drop trigger if exists tournaments_cancel_open_matches on public.tournaments;
create trigger tournaments_cancel_open_matches
  after update of status on public.tournaments
  for each row execute function public.cancel_open_matches_on_tournament_cancel();

revoke execute on function public.cancel_open_matches_on_tournament_cancel() from public, anon, authenticated;

create or replace function public.cancel_tournament(p_tournament_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_tournament public.tournaments%rowtype;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;
  if v_tournament.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'Tournament is already finished';
  end if;

  update public.tournaments set status = 'CANCELLED' where id = p_tournament_id;  -- le trigger annule les matchs

  insert into public.notifications (user_id, type, title, body, data)
  select tp.user_id, 'tournament_cancelled', 'Tournoi annulé',
         'Le tournoi « ' || v_tournament.name || ' » a été annulé.',
         jsonb_build_object('tournament_id', p_tournament_id, 'reason', p_reason)
  from public.tournament_participants tp
  where tp.tournament_id = p_tournament_id and tp.status in ('REGISTERED', 'CHECKED_IN');

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'cancel_tournament', 'tournament', p_tournament_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke execute on function public.cancel_tournament(uuid, text) from public, anon;
grant execute on function public.cancel_tournament(uuid, text) to authenticated;

-- 2. Clôture des inscriptions --------------------------------------------------------------
create or replace function public.close_expired_registrations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.tournaments
  set status = 'REGISTRATION_CLOSED'
  where status = 'REGISTRATION_OPEN' and registration_end <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Appelée par pg_cron (propriétaire postgres) ; jamais depuis l'API.
revoke execute on function public.close_expired_registrations() from public, anon, authenticated;

-- 3. Preuves de match ----------------------------------------------------------------------
-- Chemin : {tournament_id}/{match_id}/{user_id}/evidence.<ext>
-- `matches` est protégée par RLS sans policy cliente : une sous-requête directe dans une policy
-- de storage ne verrait aucune ligne (insertion et lecture refusées pour tout le monde).
-- On passe donc par des fonctions security definer qui lisent matches à la place du client.
create or replace function public.match_evidence_allowed(
  p_tournament_id text, p_match_id text, p_user_id uuid, p_require_open boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id::text = p_match_id
      and (p_tournament_id is null or m.tournament_id::text = p_tournament_id)
      and (m.player_1_id = p_user_id or m.player_2_id = p_user_id)
      and (not p_require_open or m.status in ('READY', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED'))
  );
$$;

revoke execute on function public.match_evidence_allowed(text, text, uuid, boolean) from public, anon;
grant execute on function public.match_evidence_allowed(text, text, uuid, boolean) to authenticated;

drop policy if exists "match_evidence_insert_own" on storage.objects;
create policy "match_evidence_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'match-evidence'
    and (storage.foldername(name))[3] = auth.uid()::text
    and public.match_evidence_allowed(
      (storage.foldername(name))[1], (storage.foldername(name))[2], auth.uid(), true)
  );

drop policy if exists "match_evidence_select_participant" on storage.objects;
create policy "match_evidence_select_participant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'match-evidence'
    and public.match_evidence_allowed(null, (storage.foldername(name))[2], auth.uid(), false)
  );

-- 4. Sanctions -----------------------------------------------------------------------------
create or replace function public.apply_sanction(
  p_user_id uuid,
  p_type text,
  p_reason text,
  p_end_date timestamptz default null
)
returns public.sanctions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_sanction public.sanctions%rowtype;
  v_new_status text;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_type not in ('WARNING', 'SUSPENSION', 'BAN') then
    raise exception 'Invalid sanction type';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'You cannot sanction yourself';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;

  -- Hiérarchie : USER < ADMIN < SUPER_ADMIN ; on ne sanctionne que strictement en dessous de soi.
  if (case v_target_role when 'SUPER_ADMIN' then 2 when 'ADMIN' then 1 else 0 end)
     >= (case v_caller_role when 'SUPER_ADMIN' then 2 else 1 end) then
    raise exception 'Insufficient privileges to sanction this user';
  end if;

  insert into public.sanctions (user_id, type, reason, created_by, end_date)
  values (p_user_id, p_type, p_reason, v_caller_id, p_end_date)
  returning * into v_sanction;

  if p_type = 'SUSPENSION' then
    v_new_status := 'SUSPENDED';
  elsif p_type = 'BAN' then
    v_new_status := 'BANNED';
  end if;

  if v_new_status is not null then
    update public.profiles set status = v_new_status where id = p_user_id;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_user_id, 'sanction_applied', 'Sanction appliquée',
    case p_type
      when 'WARNING' then 'Vous avez reçu un avertissement.'
      when 'SUSPENSION' then 'Votre compte a été suspendu.'
      else 'Votre compte a été banni.'
    end,
    jsonb_build_object('sanction_id', v_sanction.id, 'reason', p_reason)
  );

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'apply_sanction', 'user', p_user_id, jsonb_build_object('type', p_type, 'reason', p_reason));

  return v_sanction;
end;
$$;

revoke execute on function public.apply_sanction(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.apply_sanction(uuid, text, text, timestamptz) to authenticated;

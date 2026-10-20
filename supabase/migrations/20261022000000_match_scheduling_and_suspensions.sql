-- 1. Planification des matchs par un admin : admin_schedule_match(match, date).
-- 2. Suspensions à durée : apply_sanction refuse une date de fin passée ou sur un autre type de
--    sanction ; lift_expired_suspensions() remet ACTIVE les comptes dont la suspension est finie
--    (à planifier avec pg_cron, voir PROGRESS.md).
-- Aucune migration existante n'est modifiée ; apply_sanction garde exactement la même signature.

-- 1. Planification ---------------------------------------------------------------------------
create or replace function public.admin_schedule_match(
  p_match_id uuid,
  p_scheduled_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_match public.matches%rowtype;
  v_tournament_name text;
  v_player uuid;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.status not in ('SCHEDULED', 'READY') then
    raise exception 'Match can no longer be scheduled';
  end if;

  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Scheduled date must be in the future';
  end if;

  update public.matches set scheduled_at = p_scheduled_at where id = p_match_id;

  select name into v_tournament_name from public.tournaments where id = v_match.tournament_id;

  for v_player in
    select unnest(array[v_match.player_1_id, v_match.player_2_id])
  loop
    if v_player is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        v_player, 'match_scheduled', 'Match planifié',
        'Votre match (' || coalesce(v_tournament_name, 'tournoi') || ') est fixé au '
          || to_char(p_scheduled_at at time zone 'Europe/Paris', 'DD/MM/YYYY "à" HH24:MI') || '.',
        jsonb_build_object('match_id', p_match_id, 'scheduled_at', p_scheduled_at)
      );
    end if;
  end loop;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'schedule_match', 'match', p_match_id, jsonb_build_object('scheduled_at', p_scheduled_at));
end;
$$;

revoke execute on function public.admin_schedule_match(uuid, timestamptz) from public, anon;
grant execute on function public.admin_schedule_match(uuid, timestamptz) to authenticated;

-- 2. Suspensions à durée -----------------------------------------------------------------------
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

  if p_end_date is not null and (p_type <> 'SUSPENSION' or p_end_date <= now()) then
    raise exception 'Invalid end date';
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
  values (v_caller_id, 'apply_sanction', 'user', p_user_id,
          jsonb_build_object('type', p_type, 'reason', p_reason, 'end_date', p_end_date));

  return v_sanction;
end;
$$;

revoke execute on function public.apply_sanction(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.apply_sanction(uuid, text, text, timestamptz) to authenticated;

-- Réactive les comptes SUSPENDED dont toutes les suspensions ont une date de fin dépassée.
-- Une suspension sans date de fin (indéfinie) n'est jamais levée automatiquement.
create or replace function public.lift_expired_suspensions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_count integer := 0;
begin
  for v_user in
    select p.id
    from public.profiles p
    where p.status = 'SUSPENDED'
      and exists (select 1 from public.sanctions s where s.user_id = p.id and s.type = 'SUSPENSION')
      and not exists (
        select 1 from public.sanctions s
        where s.user_id = p.id and s.type = 'SUSPENSION'
          and (s.end_date is null or s.end_date > now())
      )
  loop
    update public.profiles set status = 'ACTIVE' where id = v_user;
    insert into public.notifications (user_id, type, title, body, data)
    values (v_user, 'suspension_lifted', 'Suspension terminée',
            'Votre compte est de nouveau actif.', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Appelée par pg_cron (propriétaire postgres) ; jamais depuis l'API.
revoke execute on function public.lift_expired_suspensions() from public, anon, authenticated;

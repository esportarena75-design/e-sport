-- Modification d'un tournoi par un admin tant que le bracket n'est pas généré.
-- Les inscrits sont prévenus quand les dates changent ; l'action est journalisée.
create or replace function public.admin_update_tournament(
  p_tournament_id uuid,
  p_name text,
  p_description text,
  p_rules text,
  p_max_players integer,
  p_registration_end timestamptz,
  p_start_date timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_old public.tournaments%rowtype;
  v_count integer;
  v_dates_changed boolean;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  select * into v_old from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_old.status not in ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED') then
    raise exception 'Tournament can no longer be edited';
  end if;

  if p_name is null or length(trim(p_name)) < 3 or length(trim(p_name)) > 80 then
    raise exception 'Invalid tournament name';
  end if;

  if p_max_players not in (8, 16, 32, 64) then
    raise exception 'Invalid max players';
  end if;

  select count(*) into v_count
  from public.tournament_participants
  where tournament_id = p_tournament_id and status in ('REGISTERED', 'CHECKED_IN');
  if p_max_players < v_count then
    raise exception 'Max players is below the number of registered players';
  end if;

  if p_registration_end <= v_old.registration_start then
    raise exception 'Registration end must be after registration start';
  end if;
  if p_start_date < p_registration_end then
    raise exception 'Tournament must start after registration ends';
  end if;

  v_dates_changed := p_registration_end is distinct from v_old.registration_end
                  or p_start_date is distinct from v_old.start_date;

  update public.tournaments
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      rules = nullif(trim(coalesce(p_rules, '')), ''),
      max_players = p_max_players,
      registration_end = p_registration_end,
      start_date = p_start_date
  where id = p_tournament_id;

  if v_dates_changed then
    insert into public.notifications (user_id, type, title, body, data)
    select tp.user_id, 'tournament_updated', 'Dates du tournoi modifiées',
           'Les dates du tournoi « ' || trim(p_name) || ' » ont changé : début le '
             || to_char(p_start_date at time zone 'Europe/Paris', 'DD/MM/YYYY "à" HH24:MI') || '.',
           jsonb_build_object('tournament_id', p_tournament_id)
    from public.tournament_participants tp
    where tp.tournament_id = p_tournament_id and tp.status in ('REGISTERED', 'CHECKED_IN');
  end if;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  values (
    v_caller_id, 'update_tournament', 'tournament', p_tournament_id,
    jsonb_build_object('name', v_old.name, 'max_players', v_old.max_players,
                       'registration_end', v_old.registration_end, 'start_date', v_old.start_date),
    jsonb_build_object('name', trim(p_name), 'max_players', p_max_players,
                       'registration_end', p_registration_end, 'start_date', p_start_date)
  );
end;
$$;

revoke execute on function public.admin_update_tournament(uuid, text, text, text, integer, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_update_tournament(uuid, text, text, text, integer, timestamptz, timestamptz) to authenticated;

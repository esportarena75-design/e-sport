-- Espace admin : recherche de joueurs, levée manuelle d'une sanction, lecture du journal.
-- Toutes les fonctions sont réservées aux ADMIN / SUPER_ADMIN et ne renvoient jamais l'e-mail.

create or replace function public.admin_search_users(p_query text)
returns table (id uuid, username text, role text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_pattern text;
begin
  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if coalesce(v_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  -- Les jokers LIKE saisis sont traités comme du texte.
  v_pattern := '%' || replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select p.id, p.username, p.role, p.status, p.created_at
    from public.profiles p
    where p.status <> 'DELETED' and p.username ilike v_pattern
    order by p.username
    limit 30;
end;
$$;

revoke execute on function public.admin_search_users(text) from public, anon;
grant execute on function public.admin_search_users(text) to authenticated;

create or replace function public.admin_get_user(p_user_id uuid)
returns table (id uuid, username text, role text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if coalesce(v_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  return query
    select p.id, p.username, p.role, p.status, p.created_at
    from public.profiles p
    where p.id = p_user_id;
end;
$$;

revoke execute on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;

-- Lève une suspension ou un bannissement avant son terme : le compte redevient ACTIVE et les
-- sanctions encore en cours reçoivent une date de fin = maintenant (l'historique est conservé).
create or replace function public.admin_lift_sanction(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_target_status text;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'A reason is required';
  end if;

  select role, status into v_target_role, v_target_status from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'You cannot sanction yourself';
  end if;

  if (case v_target_role when 'SUPER_ADMIN' then 2 when 'ADMIN' then 1 else 0 end)
     >= (case v_caller_role when 'SUPER_ADMIN' then 2 else 1 end) then
    raise exception 'Insufficient privileges to sanction this user';
  end if;

  if v_target_status not in ('SUSPENDED', 'BANNED') then
    raise exception 'User has no active sanction';
  end if;

  update public.sanctions
  set end_date = now()
  where user_id = p_user_id
    and type in ('SUSPENSION', 'BAN')
    and (end_date is null or end_date > now());

  update public.profiles set status = 'ACTIVE' where id = p_user_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, 'sanction_lifted', 'Sanction levée', 'Votre compte est de nouveau actif.', '{}'::jsonb);

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  values (v_caller_id, 'lift_sanction', 'user', p_user_id,
          jsonb_build_object('status', v_target_status), jsonb_build_object('status', 'ACTIVE', 'reason', trim(p_reason)));
end;
$$;

revoke execute on function public.admin_lift_sanction(uuid, text) from public, anon;
grant execute on function public.admin_lift_sanction(uuid, text) to authenticated;

-- Journal des actions admin, plus récentes d'abord, avec le pseudo de l'admin.
create or replace function public.admin_list_logs(p_limit integer default 50)
returns table (
  id uuid, created_at timestamptz, admin_username text, action text,
  resource_type text, resource_id uuid, details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if coalesce(v_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  return query
    select l.id, l.created_at, a.username, l.action, l.resource_type, l.resource_id, l.new_value
    from public.admin_logs l
    left join public.profiles a on a.id = l.admin_id
    order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke execute on function public.admin_list_logs(integer) from public, anon;
grant execute on function public.admin_list_logs(integer) to authenticated;

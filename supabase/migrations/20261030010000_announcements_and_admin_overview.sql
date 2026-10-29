-- Annonces des admins (à un tournoi ou à tous les joueurs) et vue d'ensemble de l'espace admin.

-- 1. Annonces ------------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments (id) on delete cascade,  -- null = tous les joueurs
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 3 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index announcements_tournament_idx on public.announcements (tournament_id, created_at desc);
create index announcements_created_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;

-- Une annonce est une information publique de l'appli : lisible par tout joueur connecté.
create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);
-- Aucune policy d'écriture : tout passe par admin_send_announcement().
revoke all on public.announcements from anon;

create or replace function public.admin_send_announcement(
  p_tournament_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_id uuid;
  v_tournament_name text;
  v_recipients integer;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_title is null or length(trim(p_title)) < 3 or length(trim(p_title)) > 80 then
    raise exception 'Invalid announcement title';
  end if;
  if p_body is null or length(trim(p_body)) < 3 or length(trim(p_body)) > 500 then
    raise exception 'Invalid announcement body';
  end if;

  if p_tournament_id is not null then
    select name into v_tournament_name from public.tournaments where id = p_tournament_id;
    if not found then
      raise exception 'Tournament not found';
    end if;
  end if;

  insert into public.announcements (tournament_id, title, body, created_by)
  values (p_tournament_id, trim(p_title), trim(p_body), v_caller_id)
  returning id into v_id;

  if p_tournament_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    select tp.user_id, 'announcement',
           trim(p_title) || ' · ' || v_tournament_name, trim(p_body),
           jsonb_build_object('tournament_id', p_tournament_id, 'announcement_id', v_id)
    from public.tournament_participants tp
    where tp.tournament_id = p_tournament_id and tp.status in ('REGISTERED', 'CHECKED_IN');
  else
    insert into public.notifications (user_id, type, title, body, data)
    select p.id, 'announcement', trim(p_title), trim(p_body),
           jsonb_build_object('announcement_id', v_id)
    from public.profiles p
    where p.status = 'ACTIVE';
  end if;
  get diagnostics v_recipients = row_count;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'send_announcement', 'announcement', v_id,
          jsonb_build_object('title', trim(p_title), 'tournament_id', p_tournament_id, 'recipients', v_recipients));

  return v_id;
end;
$$;

revoke execute on function public.admin_send_announcement(uuid, text, text) from public, anon;
grant execute on function public.admin_send_announcement(uuid, text, text) to authenticated;

-- 2. Vue d'ensemble admin ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns table (
  tournaments_open integer,
  tournaments_in_progress integer,
  open_disputes integer,
  matches_to_schedule integer,
  matches_awaiting_confirmation integer,
  sanctioned_users integer,
  players integer
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

  return query select
    (select count(*)::integer from public.tournaments where status in ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED')),
    (select count(*)::integer from public.tournaments where status = 'IN_PROGRESS'),
    (select count(*)::integer from public.disputes where status in ('OPEN', 'UNDER_REVIEW')),
    (select count(*)::integer from public.matches m
       where m.status in ('SCHEDULED', 'READY') and m.player_1_id is not null and m.player_2_id is not null
         and m.scheduled_at is null),
    (select count(*)::integer from public.matches where status = 'AWAITING_CONFIRMATION'),
    (select count(*)::integer from public.profiles where status in ('SUSPENDED', 'BANNED')),
    (select count(*)::integer from public.profiles where status = 'ACTIVE');
end;
$$;

revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

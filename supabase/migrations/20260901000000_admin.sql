-- Phase 10: admin capabilities -- tournament management, sanctions, forfeits,
-- disqualifications. Everything here is gated by checking the caller's own
-- profiles.role inside each security-definer function (and in two new RLS policies
-- for tournaments), so a non-admin authenticated user can never reach these paths
-- even though EXECUTE is granted broadly.

-- The Phase 1 trigger only ever allowed a user to touch their OWN row, and only to
-- self-delete (ACTIVE -> DELETED). Admins now need to change *other* users' role/status
-- (promote, suspend, ban) through the app (not just via service_role), so this adds an
-- admin bypass without loosening anything for regular users.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();

  if new.role is distinct from old.role
     and auth.role() <> 'service_role'
     and coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Changing role is not allowed';
  end if;

  if new.status is distinct from old.status
     and auth.role() <> 'service_role'
     and coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN')
     and not (old.status = 'ACTIVE' and new.status = 'DELETED' and auth.uid() = old.id) then
    raise exception 'Changing status is not allowed';
  end if;

  return new;
end;
$$;

create policy "tournaments_insert_admin" on public.tournaments
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));

create policy "tournaments_update_admin" on public.tournaments
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN')));

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('WARNING', 'SUSPENSION', 'BAN')),
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sanctions enable row level security;

create policy "sanctions_select_own_or_admin" on public.sanctions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN'))
  );
-- No insert/update policy: only apply_sanction() below writes here.

-- Redefines advance_winner (Phase 8) to accept the terminal status to apply, so a
-- forfeit can land as 'FORFEIT' instead of always 'COMPLETED' while reusing the exact
-- same next-match propagation and notification logic.
create or replace function public.advance_winner(p_match_id uuid, p_winner_id uuid, p_status text default 'COMPLETED')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_next_match public.matches%rowtype;
  v_other_player_id uuid;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  update public.matches
  set status = p_status, winner_id = p_winner_id, completed_at = now()
  where id = p_match_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_winner_id, 'victory_confirmed', 'Victoire confirmée !',
    'Votre victoire a été confirmée. Vous passez au tour suivant.',
    jsonb_build_object('match_id', p_match_id)
  );

  if v_match.next_match_id is not null then
    if v_match.next_match_slot = 1 then
      update public.matches set player_1_id = p_winner_id where id = v_match.next_match_id;
    else
      update public.matches set player_2_id = p_winner_id where id = v_match.next_match_id;
    end if;

    select * into v_next_match from public.matches where id = v_match.next_match_id;

    if v_next_match.player_1_id is not null and v_next_match.player_2_id is not null then
      update public.matches set status = 'READY' where id = v_next_match.id and status = 'SCHEDULED';

      v_other_player_id := case
        when v_next_match.player_1_id = p_winner_id then v_next_match.player_2_id
        else v_next_match.player_1_id
      end;

      insert into public.notifications (user_id, type, title, body, data)
      select uid, 'next_round_ready', 'Votre prochain adversaire est prêt', 'Le tour suivant peut commencer.',
             jsonb_build_object('match_id', v_next_match.id)
      from unnest(array[p_winner_id, v_other_player_id]) as uid;
    end if;
  else
    update public.tournaments set status = 'COMPLETED' where id = v_match.tournament_id;
  end if;
end;
$$;

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

grant execute on function public.apply_sanction(uuid, text, text, timestamptz) to authenticated;

create or replace function public.admin_forfeit_match(p_match_id uuid, p_absent_player_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_match public.matches%rowtype;
  v_winner_id uuid;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if p_absent_player_id <> v_match.player_1_id and p_absent_player_id <> v_match.player_2_id then
    raise exception 'That player is not in this match';
  end if;

  v_winner_id := case
    when v_match.player_1_id = p_absent_player_id then v_match.player_2_id
    else v_match.player_1_id
  end;

  if v_winner_id is null then
    raise exception 'The other slot has no player to advance';
  end if;

  perform public.advance_winner(p_match_id, v_winner_id, 'FORFEIT');

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'admin_forfeit_match', 'match', p_match_id, jsonb_build_object('absent_player_id', p_absent_player_id, 'reason', p_reason));
end;
$$;

grant execute on function public.admin_forfeit_match(uuid, uuid, text) to authenticated;

create or replace function public.disqualify_participant(p_tournament_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_active_match public.matches%rowtype;
  v_opponent_id uuid;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  update public.tournament_participants
  set status = 'DISQUALIFIED'
  where tournament_id = p_tournament_id and user_id = p_user_id;

  select * into v_active_match
  from public.matches
  where tournament_id = p_tournament_id
    and (player_1_id = p_user_id or player_2_id = p_user_id)
    and status in ('SCHEDULED', 'READY', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED')
  order by round desc
  limit 1
  for update;

  if found then
    v_opponent_id := case
      when v_active_match.player_1_id = p_user_id then v_active_match.player_2_id
      else v_active_match.player_1_id
    end;

    if v_opponent_id is not null then
      perform public.advance_winner(v_active_match.id, v_opponent_id, 'FORFEIT');
    end if;
  end if;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, new_value)
  values (v_caller_id, 'disqualify_participant', 'tournament_participant', p_user_id, jsonb_build_object('tournament_id', p_tournament_id, 'reason', p_reason));
end;
$$;

grant execute on function public.disqualify_participant(uuid, uuid, text) to authenticated;

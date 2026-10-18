-- Phase 8: push tokens, in-app notification feed, and wiring notification creation
-- into the functions from earlier phases (join, report, confirm/advance, resolve).

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint devices_unique_token unique (expo_push_token)
);

alter table public.devices enable row level security;

create policy "devices_select_own" on public.devices for select to authenticated using (auth.uid() = user_id);
create policy "devices_insert_own" on public.devices for insert to authenticated with check (auth.uid() = user_id);
create policy "devices_update_own" on public.devices for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "devices_delete_own" on public.devices for delete to authenticated using (auth.uid() = user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No insert policy for clients: every row is created by a trigger or a
-- security-definer function below, never inserted directly by the app.

create or replace function public.notify_tournament_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_name text;
begin
  select name into v_tournament_name from public.tournaments where id = new.tournament_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.user_id,
    'registration_confirmed',
    'Inscription confirmée',
    format('Vous participez à %s.', v_tournament_name),
    jsonb_build_object('tournament_id', new.tournament_id)
  );

  return new;
end;
$$;

create trigger trg_notify_tournament_joined
  after insert on public.tournament_participants
  for each row execute function public.notify_tournament_joined();

-- Redefines report_match_result (Phase 5) to also notify the opponent that a result
-- was declared. Logic is otherwise unchanged from the Phase 5 version.
create or replace function public.report_match_result(
  p_match_id uuid,
  p_my_score integer,
  p_opponent_score integer,
  p_comment text default null,
  p_evidence_path text default null
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_p1_score integer;
  v_p2_score integer;
  v_opponent_id uuid;
  v_reporter_username text;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  if v_caller_id <> v_match.player_1_id and v_caller_id <> v_match.player_2_id then
    raise exception 'Not a participant in this match';
  end if;

  if v_match.status not in ('READY', 'IN_PROGRESS') then
    raise exception 'This match cannot be reported right now';
  end if;

  if p_my_score < 0 or p_opponent_score < 0 then
    raise exception 'Scores cannot be negative';
  end if;

  if v_caller_id = v_match.player_1_id then
    v_p1_score := p_my_score;
    v_p2_score := p_opponent_score;
    v_opponent_id := v_match.player_2_id;
  else
    v_p1_score := p_opponent_score;
    v_p2_score := p_my_score;
    v_opponent_id := v_match.player_1_id;
  end if;

  insert into public.match_reports (match_id, reported_by, player_1_score, player_2_score, evidence_path, comment)
  values (p_match_id, v_caller_id, v_p1_score, v_p2_score, p_evidence_path, p_comment);

  update public.matches
  set player_1_score = v_p1_score,
      player_2_score = v_p2_score,
      status = 'AWAITING_CONFIRMATION'
  where id = p_match_id
  returning * into v_match;

  if v_opponent_id is not null then
    select username into v_reporter_username from public.profiles where id = v_caller_id;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_opponent_id,
      'result_submitted',
      'Résultat déclaré',
      format('%s a déclaré un résultat %s-%s.', v_reporter_username, v_p1_score, v_p2_score),
      jsonb_build_object('match_id', p_match_id)
    );
  end if;

  return v_match;
end;
$$;

-- Redefines advance_winner (Phase 6) to notify the winner, and to notify the next
-- match's other player once both of its slots are filled ("your next opponent is set").
create or replace function public.advance_winner(p_match_id uuid, p_winner_id uuid)
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
  set status = 'COMPLETED', winner_id = p_winner_id, completed_at = now()
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

-- Redefines resolve_dispute (Phase 7) to notify both match participants once a
-- decision is made.
create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_winner_id uuid default null,
  p_new_status text default 'RESOLVED'
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_dispute public.disputes%rowtype;
  v_match public.matches%rowtype;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_new_status not in ('RESOLVED', 'DISMISSED') then
    raise exception 'Invalid resolution status';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Dispute not found';
  end if;

  update public.disputes
  set status = p_new_status, decision = p_decision, resolved_by = v_caller_id, resolved_at = now()
  where id = p_dispute_id;

  select * into v_match from public.matches where id = v_dispute.match_id;

  if p_new_status = 'RESOLVED' and p_winner_id is not null then
    perform public.advance_winner(v_dispute.match_id, p_winner_id);
  elsif p_new_status = 'DISMISSED' then
    update public.matches
    set status = case when player_1_id is not null and player_2_id is not null then 'READY' else 'SCHEDULED' end
    where id = v_dispute.match_id and status = 'DISPUTED';
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select uid, 'dispute_resolved', 'Décision rendue', 'Une décision a été prise concernant votre match.',
         jsonb_build_object('match_id', v_dispute.match_id, 'dispute_id', p_dispute_id)
  from unnest(array[v_match.player_1_id, v_match.player_2_id]) as uid
  where uid is not null;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  values (
    v_caller_id, 'resolve_dispute', 'dispute', p_dispute_id,
    jsonb_build_object('status', 'OPEN'),
    jsonb_build_object('status', p_new_status, 'decision', p_decision, 'winner_id', p_winner_id)
  );

  select * into v_dispute from public.disputes where id = p_dispute_id;
  return v_dispute;
end;
$$;

-- Actual push delivery (not just the in-app row) requires an Edge Function + pg_net,
-- both needing a one-time manual setup step -- see supabase/functions/send-push/README.
create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.settings.push_function_url', true);
begin
  if v_url is not null and v_url <> '' then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_dispatch_push_notification
  after insert on public.notifications
  for each row execute function public.dispatch_push_notification();

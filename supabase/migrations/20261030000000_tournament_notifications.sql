-- Notifications complètes autour d'un tournoi : un joueur inscrit est prévenu de TOUT ce qui le
-- concerne (début avec son premier adversaire, fin avec le champion, litige ouvert sur son match,
-- rappels avant le début et avant ses matchs) et peut couper les notifications d'un tournoi.
-- Les sanctions et l'annulation d'un tournoi ne sont jamais coupées.

-- 1. Sourdine par tournoi ------------------------------------------------------------------
create table public.notification_mutes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tournament_id)
);

alter table public.notification_mutes enable row level security;

create policy "notification_mutes_select_own" on public.notification_mutes
  for select to authenticated using (auth.uid() = user_id);
create policy "notification_mutes_insert_own" on public.notification_mutes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "notification_mutes_delete_own" on public.notification_mutes
  for delete to authenticated using (auth.uid() = user_id);

-- Filtre central : toute notification liée à un tournoi en sourdine (via data.tournament_id ou
-- via le match de data.match_id) est ignorée, quelle que soit la fonction qui l'insère.
create or replace function public.suppress_muted_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if new.type in ('sanction_applied', 'sanction_lifted', 'suspension_lifted', 'tournament_cancelled') then
    return new;
  end if;

  if new.data is null then
    return new;
  end if;

  if (new.data->>'tournament_id') ~ v_uuid_pattern then
    v_tournament_id := (new.data->>'tournament_id')::uuid;
  elsif (new.data->>'match_id') ~ v_uuid_pattern then
    select tournament_id into v_tournament_id from public.matches where id = (new.data->>'match_id')::uuid;
  end if;

  if v_tournament_id is not null and exists (
    select 1 from public.notification_mutes
    where user_id = new.user_id and tournament_id = v_tournament_id
  ) then
    return null;
  end if;

  return new;
end;
$$;

create trigger trg_suppress_muted_notifications
  before insert on public.notifications
  for each row execute function public.suppress_muted_notifications();

-- 2. Début et fin du tournoi ---------------------------------------------------------------
create or replace function public.notify_tournament_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champion text;
begin
  if new.status = 'IN_PROGRESS' and old.status is distinct from 'IN_PROGRESS' then
    -- Un message par joueur ayant un premier adversaire (les exemptés ont déjà leur message « bye »).
    insert into public.notifications (user_id, type, title, body, data)
    select pl.user_id, 'tournament_started', 'Le tournoi commence !',
           'Votre premier match de « ' || new.name || ' » : vous affrontez ' || coalesce(pl.opponent, 'votre adversaire') || '.',
           jsonb_build_object('tournament_id', new.id, 'match_id', pl.match_id)
    from (
      select m.player_1_id as user_id, p2.username as opponent, m.id as match_id
      from public.matches m left join public.profiles p2 on p2.id = m.player_2_id
      where m.tournament_id = new.id and m.round = 1 and m.player_1_id is not null and m.player_2_id is not null
      union all
      select m.player_2_id, p1.username, m.id
      from public.matches m left join public.profiles p1 on p1.id = m.player_1_id
      where m.tournament_id = new.id and m.round = 1 and m.player_1_id is not null and m.player_2_id is not null
    ) pl;

  elsif new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    select p.username into v_champion
    from public.matches m join public.profiles p on p.id = m.winner_id
    where m.tournament_id = new.id and m.next_match_id is null
    limit 1;

    insert into public.notifications (user_id, type, title, body, data)
    select tp.user_id, 'tournament_completed', 'Tournoi terminé',
           case when v_champion is null then '« ' || new.name || ' » est terminé.'
                else '« ' || new.name || ' » est terminé : bravo à ' || v_champion || ' !' end,
           jsonb_build_object('tournament_id', new.id)
    from public.tournament_participants tp
    where tp.tournament_id = new.id and tp.status in ('REGISTERED', 'CHECKED_IN');
  end if;

  return new;
end;
$$;

create trigger trg_notify_tournament_status_change
  after update of status on public.tournaments
  for each row execute function public.notify_tournament_status_change();

-- 3. Litige ouvert : l'adversaire et les admins sont prévenus ---------------------------------
create or replace function public.notify_dispute_opened()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_other uuid;
begin
  select * into v_match from public.matches where id = new.match_id;

  v_other := case when v_match.player_1_id = new.opened_by then v_match.player_2_id else v_match.player_1_id end;

  if v_other is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_other, 'dispute_opened', 'Litige ouvert sur votre match',
            'Votre adversaire a ouvert un litige. Un administrateur va examiner le match.',
            jsonb_build_object('match_id', new.match_id, 'dispute_id', new.id));
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select p.id, 'admin_dispute_opened', 'Nouveau litige à traiter',
         'Un litige vient d''être ouvert sur un match.',
         jsonb_build_object('dispute_id', new.id, 'admin', true)
  from public.profiles p
  where p.role in ('ADMIN', 'SUPER_ADMIN') and p.status = 'ACTIVE' and p.id <> new.opened_by;

  return new;
end;
$$;

create trigger trg_notify_dispute_opened
  after insert on public.disputes
  for each row execute function public.notify_dispute_opened();

-- 4. Rappels (à planifier avec pg_cron) --------------------------------------------------------
-- Une ligne par rappel déjà envoyé : la date cible fait partie de la clé, donc si un admin
-- décale le tournoi ou le match, le rappel est renvoyé pour la nouvelle date.
create table public.reminder_log (
  kind text not null,
  ref_id uuid not null,
  target_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (kind, ref_id, target_at)
);
alter table public.reminder_log enable row level security;
-- Aucune policy : table interne.

create or replace function public.send_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t record;
  v_m record;
  v_count integer := 0;
  v_inserted integer;
begin
  -- Début du tournoi dans moins de 24 h, puis dans moins d'1 h.
  for v_t in
    select t.id, t.name, t.start_date,
           case when t.start_date <= now() + interval '1 hour' then 'tournament_1h' else 'tournament_24h' end as kind
    from public.tournaments t
    where t.status in ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED')
      and t.start_date > now() and t.start_date <= now() + interval '24 hours'
  loop
    insert into public.reminder_log (kind, ref_id, target_at) values (v_t.kind, v_t.id, v_t.start_date)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      insert into public.notifications (user_id, type, title, body, data)
      select tp.user_id, 'tournament_reminder', 'Le tournoi approche',
             '« ' || v_t.name || ' » commence ' ||
               case when v_t.kind = 'tournament_1h' then 'dans moins d''une heure' else 'dans moins de 24 h' end
               || ' (' || to_char(v_t.start_date at time zone 'Europe/Paris', 'DD/MM "à" HH24:MI') || ').',
             jsonb_build_object('tournament_id', v_t.id)
      from public.tournament_participants tp
      where tp.tournament_id = v_t.id and tp.status in ('REGISTERED', 'CHECKED_IN');
      v_count := v_count + 1;
    end if;
  end loop;

  -- Match planifié dans moins d'1 h.
  for v_m in
    select m.id, m.player_1_id, m.player_2_id, m.scheduled_at, t.name as tname
    from public.matches m join public.tournaments t on t.id = m.tournament_id
    where m.status in ('SCHEDULED', 'READY')
      and m.player_1_id is not null and m.player_2_id is not null
      and m.scheduled_at > now() and m.scheduled_at <= now() + interval '1 hour'
  loop
    insert into public.reminder_log (kind, ref_id, target_at) values ('match_1h', v_m.id, v_m.scheduled_at)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      insert into public.notifications (user_id, type, title, body, data)
      select u, 'match_reminder', 'Votre match approche',
             'Votre match de « ' || v_m.tname || ' » commence à '
               || to_char(v_m.scheduled_at at time zone 'Europe/Paris', 'HH24:MI') || '.',
             jsonb_build_object('match_id', v_m.id)
      from unnest(array[v_m.player_1_id, v_m.player_2_id]) as u;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- Appelée par pg_cron (propriétaire postgres) ; jamais depuis l'API.
revoke execute on function public.send_due_reminders() from public, anon, authenticated;

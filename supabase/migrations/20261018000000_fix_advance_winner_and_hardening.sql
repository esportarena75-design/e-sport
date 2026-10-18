-- Correctifs issus de l'audit du 2026-10-18.
--
-- 1. BUG BLOQUANT : la migration admin (20260901) a créé advance_winner(uuid, uuid, text)
--    avec `create or replace`, ce qui AJOUTE une surcharge au lieu de remplacer
--    advance_winner(uuid, uuid). Un appel à 2 arguments correspond alors aux deux versions
--    et Postgres lève "function public.advance_winner(uuid, uuid) is not unique" :
--    confirm_match_result() et resolve_dispute() échouaient systématiquement.
--
-- 2. FAILLE : advance_winner est security definer et, comme toute fonction du schéma public,
--    exécutable par défaut par anon/authenticated via l'API (rpc). N'importe qui pouvait
--    donc se déclarer vainqueur de n'importe quel match. Elle ne doit être appelée que par
--    les autres fonctions security definer.
--
-- 3. Durcissements : pas de score nul déclarable (le match restait bloqué), pas de litige
--    sur un match déjà gagné par forfait, résolution de litige unique et avec vainqueur
--    valide, inscriptions limitées à la fenêtre registration_start/registration_end,
--    aucune RPC exécutable sans être connecté.

-- 1 + 2 ------------------------------------------------------------------------------------
drop function if exists public.advance_winner(uuid, uuid);

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
  if p_status not in ('COMPLETED', 'FORFEIT') then
    raise exception 'Invalid terminal match status';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  -- Empêche de faire avancer deux fois un vainqueur (et d'écraser le tour suivant).
  if v_match.status in ('COMPLETED', 'FORFEIT', 'CANCELLED') then
    raise exception 'This match is already closed';
  end if;

  if p_winner_id is null
     or (p_winner_id is distinct from v_match.player_1_id and p_winner_id is distinct from v_match.player_2_id) then
    raise exception 'Winner must be one of the match players';
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

-- Fonction interne uniquement : appelée par confirm_match_result, resolve_dispute,
-- admin_forfeit_match et disqualify_participant (security definer, propriétaire postgres).
revoke execute on function public.advance_winner(uuid, uuid, text) from public, anon, authenticated;

-- 3a. Score nul refusé dès la déclaration ------------------------------------------------
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

  if p_my_score = p_opponent_score then
    raise exception 'A drawn score cannot be reported (this format has no draws)';
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

-- 3b. Pas de litige sur un match clos (y compris forfait) ---------------------------------
create or replace function public.open_dispute(
  p_match_id uuid,
  p_reason text,
  p_description text default null,
  p_evidence_path text default null
)
returns public.disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_dispute public.disputes%rowtype;
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

  if v_match.status in ('COMPLETED', 'FORFEIT', 'CANCELLED') then
    raise exception 'This match is already closed';
  end if;

  insert into public.disputes (match_id, opened_by, reason, description, evidence_path)
  values (p_match_id, v_caller_id, p_reason, p_description, p_evidence_path)
  returning * into v_dispute;

  update public.matches set status = 'DISPUTED' where id = p_match_id;

  return v_dispute;
end;
$$;

-- 3c. Résolution de litige : une seule fois, et toujours avec un vainqueur si RESOLVED ----
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
  v_old_status text;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;
  if coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized';
  end if;

  if p_new_status not in ('RESOLVED', 'DISMISSED') then
    raise exception 'Invalid resolution status';
  end if;

  if p_new_status = 'RESOLVED' and p_winner_id is null then
    raise exception 'A winner is required to resolve a dispute';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if not found then
    raise exception 'Dispute not found';
  end if;

  if v_dispute.status not in ('OPEN', 'UNDER_REVIEW') then
    raise exception 'Dispute is already closed';
  end if;
  v_old_status := v_dispute.status;

  select * into v_match from public.matches where id = v_dispute.match_id;

  if p_new_status = 'RESOLVED' then
    -- Lève une erreur si le vainqueur n'est pas un joueur du match ou si le match est clos.
    perform public.advance_winner(v_dispute.match_id, p_winner_id, 'COMPLETED');
  else
    update public.matches
    set status = case when player_1_id is not null and player_2_id is not null then 'READY' else 'SCHEDULED' end
    where id = v_dispute.match_id and status = 'DISPUTED';
  end if;

  update public.disputes
  set status = p_new_status, decision = p_decision, resolved_by = v_caller_id, resolved_at = now()
  where id = p_dispute_id;

  insert into public.notifications (user_id, type, title, body, data)
  select uid, 'dispute_resolved', 'Décision rendue', 'Une décision a été prise concernant votre match.',
         jsonb_build_object('match_id', v_dispute.match_id, 'dispute_id', p_dispute_id)
  from unnest(array[v_match.player_1_id, v_match.player_2_id]) as uid
  where uid is not null;

  insert into public.admin_logs (admin_id, action, resource_type, resource_id, old_value, new_value)
  values (
    v_caller_id, 'resolve_dispute', 'dispute', p_dispute_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status, 'decision', p_decision, 'winner_id', p_winner_id)
  );

  select * into v_dispute from public.disputes where id = p_dispute_id;
  return v_dispute;
end;
$$;

-- 3d. Inscription limitée à la fenêtre d'inscription --------------------------------------
-- Le statut REGISTRATION_OPEN n'est pas basculé automatiquement à registration_end :
-- sans ce contrôle, on pouvait s'inscrire après la date de clôture.
create or replace function public.join_tournament(p_tournament_id uuid)
returns public.tournament_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_current_count integer;
  v_has_game_account boolean;
  v_participant public.tournament_participants%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile.status <> 'ACTIVE' then
    raise exception 'Account is not active';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_tournament.status <> 'REGISTRATION_OPEN'
     or now() < v_tournament.registration_start
     or now() > v_tournament.registration_end then
    raise exception 'Registration is not open for this tournament';
  end if;

  if exists (
    select 1 from public.tournament_participants
    where tournament_id = p_tournament_id and user_id = v_user_id
  ) then
    raise exception 'Already registered';
  end if;

  select count(*) into v_current_count
  from public.tournament_participants
  where tournament_id = p_tournament_id;

  if v_current_count >= v_tournament.max_players then
    raise exception 'Tournament is full';
  end if;

  select exists (
    select 1 from public.game_accounts
    where user_id = v_user_id
      and game_id = v_tournament.game_id
      and platform_id = v_tournament.platform_id
  ) into v_has_game_account;

  if not v_has_game_account then
    raise exception 'No matching game account for this tournament''s game and platform';
  end if;

  insert into public.tournament_participants (tournament_id, user_id)
  values (p_tournament_id, v_user_id)
  returning * into v_participant;

  return v_participant;
end;
$$;

-- 3e. Aucune RPC métier sans être connecté -------------------------------------------------
-- generate_bracket laissait passer un appel anonyme sur les tournois sans created_by
-- (cas des tournois de démo) : null "is distinct from" null est faux.
revoke execute on function public.join_tournament(uuid) from public, anon;
revoke execute on function public.generate_bracket(uuid) from public, anon;
revoke execute on function public.report_match_result(uuid, integer, integer, text, text) from public, anon;
revoke execute on function public.confirm_match_result(uuid) from public, anon;
revoke execute on function public.open_dispute(uuid, text, text, text) from public, anon;
revoke execute on function public.resolve_dispute(uuid, text, uuid, text) from public, anon;
revoke execute on function public.apply_sanction(uuid, text, text, timestamptz) from public, anon;
revoke execute on function public.admin_forfeit_match(uuid, uuid, text) from public, anon;
revoke execute on function public.disqualify_participant(uuid, uuid, text) from public, anon;

grant execute on function public.join_tournament(uuid) to authenticated;
grant execute on function public.generate_bracket(uuid) to authenticated;
grant execute on function public.report_match_result(uuid, integer, integer, text, text) to authenticated;
grant execute on function public.confirm_match_result(uuid) to authenticated;
grant execute on function public.open_dispute(uuid, text, text, text) to authenticated;
grant execute on function public.resolve_dispute(uuid, text, uuid, text) to authenticated;
grant execute on function public.apply_sanction(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.admin_forfeit_match(uuid, uuid, text) to authenticated;
grant execute on function public.disqualify_participant(uuid, uuid, text) to authenticated;

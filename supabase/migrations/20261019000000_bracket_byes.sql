-- Exemptions (byes) dans le bracket : generate_bracket accepte désormais 2 à max_players inscrits.
--
-- Règles :
--  * la taille du bracket est la puissance de 2 immédiatement supérieure au nombre d'inscrits ;
--  * les (taille - inscrits) PREMIERS inscrits (registered_at) sont exemptés du 1er tour ;
--    le reste du tirage (qui joue qui) reste aléatoire ;
--  * un match exempté est créé directement en statut 'FORFEIT' (adversaire absent, un seul joueur,
--    vainqueur = le joueur). FORFEIT et non COMPLETED pour ne pas compter une victoire fictive
--    dans les statistiques (la vue stats ne compte que COMPLETED) ;
--  * les exemptés sont déjà placés au tour 2 ; un match du tour 2 dont les deux joueurs sont
--    connus passe 'READY'.
-- Même signature que l'ancienne fonction : create or replace, aucune surcharge créée.

create or replace function public.generate_bracket(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_tournament public.tournaments%rowtype;
  v_registered uuid[];
  v_bye_holders uuid[];
  v_others uuid[];
  v_seeded uuid[];          -- v_seeded[s] = joueur de tête de série s
  v_n integer;              -- nombre d'inscrits
  v_size integer := 2;      -- taille du bracket (puissance de 2 >= v_n)
  v_byes integer;
  v_order integer[] := array[1];
  v_next_order integer[];
  v_len integer;
  v_s integer;
  v_total_rounds integer;
  v_round integer;
  v_matches_in_round integer;
  v_match_number integer;
  v_match_id uuid;
  v_prev_round_ids uuid[];
  v_curr_round_ids uuid[];
  v_match_ids_round1 uuid[];
  v_seed_a integer;
  v_seed_b integer;
  v_p1 uuid;
  v_p2 uuid;
  v_next_id uuid;
  v_next_slot integer;
  v_m public.matches%rowtype;
begin
  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;

  -- Seul le créateur du tournoi ou un admin peut générer le bracket (appel depuis le SQL
  -- Editor sans contexte auth : autorisé, comme avant).
  if v_tournament.created_by is distinct from v_caller_id
     and coalesce(v_caller_role, 'USER') not in ('ADMIN', 'SUPER_ADMIN') then
    raise exception 'Not authorized to generate this bracket';
  end if;

  if v_tournament.status not in ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED') then
    raise exception 'Tournament is not ready for bracket generation';
  end if;

  if exists (select 1 from public.matches where tournament_id = p_tournament_id) then
    raise exception 'Bracket already generated for this tournament';
  end if;

  select array_agg(user_id order by registered_at, user_id)
  into v_registered
  from public.tournament_participants
  where tournament_id = p_tournament_id and status = 'REGISTERED';

  v_n := coalesce(array_length(v_registered, 1), 0);

  if v_n < 2 then
    raise exception 'Not enough participants to generate a bracket';
  end if;

  if v_n > v_tournament.max_players then
    raise exception 'Too many participants for this tournament''s bracket size';
  end if;

  while v_size < v_n loop
    v_size := v_size * 2;
  end loop;
  v_byes := v_size - v_n;
  v_total_rounds := round(log(2::numeric, v_size::numeric))::integer;

  -- Têtes de série : les premiers inscrits exemptés prennent les séries 1..v_byes (ordre aléatoire
  -- entre eux), les autres joueurs les séries suivantes (ordre aléatoire).
  select coalesce(array_agg(u order by random()), array[]::uuid[])
  into v_bye_holders
  from unnest(v_registered[1:v_byes]) as u;

  select coalesce(array_agg(u order by random()), array[]::uuid[])
  into v_others
  from unnest(v_registered[v_byes + 1:v_n]) as u;

  v_seeded := v_bye_holders || v_others;

  -- Ordre de placement standard (1 contre v_size, etc.) : sépare les têtes de série, donc
  -- deux exemptés ne se retrouvent pas dans le même match du tour 1.
  while coalesce(array_length(v_order, 1), 0) < v_size loop
    v_len := array_length(v_order, 1);
    v_next_order := array[]::integer[];
    foreach v_s in array v_order loop
      v_next_order := v_next_order || v_s || (2 * v_len + 1 - v_s);
    end loop;
    v_order := v_next_order;
  end loop;

  -- Création des matchs, de la finale vers le tour 1 (pour pouvoir chaîner next_match_id).
  v_prev_round_ids := array[]::uuid[];
  for v_round in reverse v_total_rounds..1 loop
    v_matches_in_round := v_size / power(2, v_round)::integer;
    v_curr_round_ids := array[]::uuid[];

    for v_match_number in 1..v_matches_in_round loop
      insert into public.matches (tournament_id, round, match_number, status)
      values (p_tournament_id, v_round, v_match_number, 'SCHEDULED')
      returning id into v_match_id;

      if v_round < v_total_rounds then
        update public.matches
        set next_match_id = v_prev_round_ids[((v_match_number - 1) / 2) + 1],
            next_match_slot = ((v_match_number - 1) % 2) + 1
        where id = v_match_id;
      end if;

      v_curr_round_ids := array_append(v_curr_round_ids, v_match_id);
    end loop;

    v_prev_round_ids := v_curr_round_ids;
    if v_round = 1 then
      v_match_ids_round1 := v_curr_round_ids;
    end if;
  end loop;

  -- Tour 1 : placement des joueurs ; un match dont l'adversaire est absent est un bye.
  for v_match_number in 1..array_length(v_match_ids_round1, 1) loop
    v_seed_a := v_order[2 * v_match_number - 1];
    v_seed_b := v_order[2 * v_match_number];
    v_p1 := case when v_seed_a <= v_n then v_seeded[v_seed_a] end;
    v_p2 := case when v_seed_b <= v_n then v_seeded[v_seed_b] end;

    if v_p1 is not null and v_p2 is not null then
      update public.matches
      set player_1_id = v_p1, player_2_id = v_p2, status = 'READY'
      where id = v_match_ids_round1[v_match_number];
    else
      -- Bye : le joueur présent passe directement au tour 2.
      v_p1 := coalesce(v_p1, v_p2);
      update public.matches
      set player_1_id = v_p1, player_2_id = null, winner_id = v_p1,
          status = 'FORFEIT', completed_at = now()
      where id = v_match_ids_round1[v_match_number]
      returning next_match_id, next_match_slot into v_next_id, v_next_slot;

      if v_next_slot = 1 then
        update public.matches set player_1_id = v_p1 where id = v_next_id;
      else
        update public.matches set player_2_id = v_p1 where id = v_next_id;
      end if;

      insert into public.notifications (user_id, type, title, body, data)
      values (
        v_p1, 'bye_round_1', 'Exempt du premier tour',
        'Vous passez directement au tour suivant.',
        jsonb_build_object('tournament_id', p_tournament_id)
      );
    end if;
  end loop;

  -- Tour 2 : tout match dont les deux joueurs sont déjà connus est prêt.
  for v_m in
    select * from public.matches
    where tournament_id = p_tournament_id and round = 2
      and player_1_id is not null and player_2_id is not null
  loop
    update public.matches set status = 'READY' where id = v_m.id;
  end loop;

  update public.tournaments set status = 'IN_PROGRESS' where id = p_tournament_id;
end;
$$;

revoke execute on function public.generate_bracket(uuid) from public, anon;
grant execute on function public.generate_bracket(uuid) to authenticated;

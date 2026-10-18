-- Phase 6: opponent confirmation, atomic winner advancement, and closing out the
-- tournament when the final match completes.

create or replace function public.advance_winner(p_match_id uuid, p_winner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;

  update public.matches
  set status = 'COMPLETED', winner_id = p_winner_id, completed_at = now()
  where id = p_match_id;

  if v_match.next_match_id is not null then
    if v_match.next_match_slot = 1 then
      update public.matches set player_1_id = p_winner_id where id = v_match.next_match_id;
    else
      update public.matches set player_2_id = p_winner_id where id = v_match.next_match_id;
    end if;

    update public.matches
    set status = 'READY'
    where id = v_match.next_match_id
      and status = 'SCHEDULED'
      and player_1_id is not null
      and player_2_id is not null;
  else
    -- No next match: this was the final.
    update public.tournaments set status = 'COMPLETED' where id = v_match.tournament_id;
  end if;
end;
$$;

-- Only the player who did NOT submit the report can confirm it (you can't confirm your
-- own declared score). Draws aren't representable -- the format has no tie-break rule yet.
create or replace function public.confirm_match_result(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_last_reporter uuid;
  v_winner_id uuid;
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

  if v_match.status <> 'AWAITING_CONFIRMATION' then
    raise exception 'This match has no result awaiting confirmation';
  end if;

  select reported_by into v_last_reporter
  from public.match_reports
  where match_id = p_match_id
  order by created_at desc
  limit 1;

  if v_last_reporter = v_caller_id then
    raise exception 'You cannot confirm your own reported result';
  end if;

  if v_match.player_1_score is null or v_match.player_2_score is null then
    raise exception 'Match has no reported score';
  end if;

  if v_match.player_1_score = v_match.player_2_score then
    raise exception 'A drawn score cannot be confirmed (this format has no draws)';
  end if;

  v_winner_id := case
    when v_match.player_1_score > v_match.player_2_score then v_match.player_1_id
    else v_match.player_2_id
  end;

  perform public.advance_winner(p_match_id, v_winner_id);

  select * into v_match from public.matches where id = p_match_id;
  return v_match;
end;
$$;

grant execute on function public.confirm_match_result(uuid) to authenticated;

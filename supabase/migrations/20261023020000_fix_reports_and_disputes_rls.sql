-- Correctif : les policies de `match_reports` et `disputes` testaient l'appartenance au match
-- avec une sous-requête directe sur `matches`. Or `matches` est sous RLS sans policy cliente :
-- la sous-requête ne voyait jamais rien, donc un joueur ne lisait AUCUN rapport de score
-- (l'écran du match ne savait pas qui avait saisi le résultat) et un admin ne voyait pas les
-- rapports. On passe par une fonction security definer, comme pour les preuves.

create or replace function public.is_match_participant(p_match_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.player_1_id = p_user_id or m.player_2_id = p_user_id)
  );
$$;

revoke execute on function public.is_match_participant(uuid, uuid) from public, anon;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;

drop policy if exists "match_reports_select_participant" on public.match_reports;
create policy "match_reports_select_participant_or_admin" on public.match_reports
  for select to authenticated
  using (
    public.is_match_participant(match_reports.match_id, auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN'))
  );

drop policy if exists "disputes_select_participant_or_admin" on public.disputes;
create policy "disputes_select_participant_or_admin" on public.disputes
  for select to authenticated
  using (
    opened_by = auth.uid()
    or public.is_match_participant(disputes.match_id, auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN', 'SUPER_ADMIN'))
  );

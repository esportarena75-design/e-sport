-- Fixes a bug: leaveTournament() does delete().select("id") to detect a blocked delete,
-- but tournament_participants has no SELECT policy (reads go through
-- tournament_participants_public instead), so PostgREST couldn't return the deleted row's
-- representation even when the delete itself succeeded -- making every successful
-- unregistration look like a failure.
create policy "tournament_participants_select_own" on public.tournament_participants
  for select to authenticated using (auth.uid() = user_id);

-- Tally · lock down direct writes to challenge tables
-- Run in the dashboard SQL Editor after the leave/edit migration.
--
-- "members: update own row" let a member rewrite any column of their own
-- membership through the API: move it into another challenge without the
-- invite code (challenge_id), or claim an earlier joined_at to win ties.
-- The app only ever changes exercise_id directly (sync points a membership
-- at the surviving copy when duplicate exercises merge); names change by
-- re-joining, and everything else goes through the security definer RPCs,
-- which these privileges do not affect.

revoke all on public.challenge_members from anon, authenticated;
grant select on public.challenge_members to authenticated;
grant update (exercise_id) on public.challenge_members to authenticated;

-- No policy allows writes here anyway; with no privilege either, a policy
-- added by mistake later still cannot open the table up.
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

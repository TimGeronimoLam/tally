-- Tally · a member's day-by-day totals in a challenge
-- Run in the dashboard SQL Editor after the challenge "today" migration,
-- before deploying the app that opens member stats: until then tapping a
-- leaderboard row shows an error. Nothing else depends on it.
--
-- Tapping a member on a leaderboard shows their stats for that challenge.
-- Members still never see each other's entries: this returns one total
-- per day, only for the challenge's exercise and window, and only to
-- fellow members. Days start at midnight in the viewer's time zone, like
-- "today" on the leaderboard.

-- p_tz if Postgres knows it, else UTC, so one bad zone cannot fail a query.
create or replace function public.safe_tz(p_tz text)
returns text
language plpgsql
stable
set search_path = public
as $$
begin
  perform now() at time zone coalesce(p_tz, 'UTC');
  return coalesce(p_tz, 'UTC');
exception when invalid_parameter_value then
  return 'UTC';
end
$$;

create or replace function public.challenge_member_days(
  p_challenge_id uuid,
  p_user_id      uuid,
  p_tz           text default 'UTC'
)
returns table (
  day   date,
  total numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with zone as (select public.safe_tz(p_tz) as name)
  select (e.logged_at at time zone zone.name)::date as day,
         sum(e.amount) as total
  from public.challenge_members m
  join public.challenges c on c.id = m.challenge_id
  cross join zone
  join public.entries e
    on e.user_id = m.user_id
   and e.exercise_id = m.exercise_id
   and e.deleted_at is null
   and e.logged_at >= c.starts_at
   and e.logged_at <  c.ends_at
  where m.challenge_id = p_challenge_id
    and m.user_id = p_user_id
    and public.is_challenge_member(p_challenge_id)
  group by 1
  order by 1
$$;

grant execute on function
  public.challenge_member_days(uuid, uuid, text)
to anon, authenticated;

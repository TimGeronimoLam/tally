-- Tally · challenge "today" follows the viewer's day
-- Run in the dashboard SQL Editor after the push reminders migration, and
-- before deploying the app that sends `p_tz`: until then its challenge
-- list and leaderboards fail to load.
--
-- The "+N today" on leaderboards was summed from UTC midnight, while the
-- app's own stats start the day at local midnight. Away from UTC the two
-- disagreed for hours (in New York, reps logged after 8pm still showed
-- as today until 8pm the next day). Both RPCs now take the caller's IANA
-- time zone and count from midnight there. Every member's "today" is the
-- viewer's day: members' zones are not stored. p_tz defaults to UTC so an
-- app from before this migration keeps working as it did.

-- Midnight today in p_tz. An unknown or missing zone falls back to UTC
-- rather than failing the whole leaderboard.
create or replace function public.local_day_start(p_tz text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
begin
  return date_trunc('day', now(), coalesce(p_tz, 'UTC'));
exception when invalid_parameter_value then
  return date_trunc('day', now(), 'UTC');
end
$$;

/* ---------- challenge_leaderboard ---------- */

drop function if exists public.challenge_leaderboard(uuid);

create or replace function public.challenge_leaderboard(
  p_challenge_id uuid,
  p_tz           text default 'UTC'
)
returns table (
  user_id      uuid,
  display_name text,
  total        numeric,
  today        numeric,
  rank         bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with day as (select public.local_day_start(p_tz) as start),
  totals as (
    select m.user_id, m.display_name, m.joined_at,
           coalesce(sum(e.amount), 0) as total,
           coalesce(sum(e.amount) filter (where e.logged_at >= day.start), 0) as today
    from public.challenge_members m
    join public.challenges c on c.id = m.challenge_id
    cross join day
    left join public.entries e
      on e.user_id = m.user_id
     and e.exercise_id = m.exercise_id
     and e.deleted_at is null
     and e.logged_at >= c.starts_at
     and e.logged_at <  c.ends_at
    where m.challenge_id = p_challenge_id
      and public.is_challenge_member(p_challenge_id)
    group by m.user_id, m.display_name, m.joined_at
  )
  select user_id, display_name, total, today,
         rank() over (order by total desc, joined_at asc) as rank
  from totals
  order by rank
$$;

/* ---------- my_challenges ---------- */

-- Same as the built-in exercises version, plus p_tz.
drop function if exists public.my_challenges();

create or replace function public.my_challenges(p_tz text default 'UTC')
returns table (
  id               uuid,
  name             text,
  exercise_name    text,
  unit             text,
  exercise_builtin text,
  goal_type        text,
  goal_value       numeric,
  starts_at        timestamptz,
  ends_at          timestamptz,
  invite_code      text,
  creator_id       uuid,
  my_exercise_id   uuid,
  member_count     bigint,
  my_total         numeric,
  my_rank          bigint,
  leader_total     numeric,
  top              jsonb,
  server_now       timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with day as (select public.local_day_start(p_tz) as start),
  mine as (
    select c.*, me.exercise_id as my_exercise_id from public.challenges c
    join public.challenge_members me on me.challenge_id = c.id and me.user_id = auth.uid()
  ),
  totals as (
    select m.challenge_id, m.user_id, m.display_name, m.joined_at,
           coalesce(sum(e.amount), 0) as total,
           coalesce(sum(e.amount) filter (where e.logged_at >= day.start), 0) as today
    from public.challenge_members m
    join mine c on c.id = m.challenge_id
    cross join day
    left join public.entries e
      on e.user_id = m.user_id
     and e.exercise_id = m.exercise_id
     and e.deleted_at is null
     and e.logged_at >= c.starts_at
     and e.logged_at <  c.ends_at
    group by m.challenge_id, m.user_id, m.display_name, m.joined_at
  ),
  ranked as (
    select *, rank() over (partition by challenge_id order by total desc, joined_at asc) as rnk
    from totals
  )
  select c.id, c.name, c.exercise_name, c.unit, c.exercise_builtin,
         c.goal_type, c.goal_value, c.starts_at, c.ends_at, c.invite_code,
         c.creator_id, c.my_exercise_id,
         (select count(*) from ranked r where r.challenge_id = c.id),
         (select r.total from ranked r where r.challenge_id = c.id and r.user_id = auth.uid()),
         (select r.rnk   from ranked r where r.challenge_id = c.id and r.user_id = auth.uid()),
         (select max(r.total) from ranked r where r.challenge_id = c.id),
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'user_id', r.user_id, 'display_name', r.display_name,
                   'total', r.total, 'today', r.today, 'rank', r.rnk)
                 order by r.rnk), '[]'::jsonb)
          from (select * from ranked r where r.challenge_id = c.id order by r.rnk, r.joined_at limit 3) r),
         now()
  from mine c
  order by c.ends_at desc
$$;

grant execute on function
  public.challenge_leaderboard(uuid, text),
  public.my_challenges(text)
to anon, authenticated;

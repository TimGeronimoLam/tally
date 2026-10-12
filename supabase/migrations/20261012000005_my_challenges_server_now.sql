-- Tally · server clock in my_challenges
-- Run in the dashboard SQL Editor after the host-actions migration.
--
-- Challenge windows are judged against the server's clock (end_challenge
-- closes a window at now()). Each my_challenges row now carries that clock
-- reading, so a device whose clock trails the server still shows a just-ended
-- challenge as ended. The return type changes, hence drop + recreate.

drop function if exists public.my_challenges();

-- Every challenge the caller belongs to, with a summary for the list screen.
create or replace function public.my_challenges()
returns table (
  id            uuid,
  name          text,
  exercise_name text,
  unit          text,
  goal_type     text,
  goal_value    numeric,
  starts_at     timestamptz,
  ends_at       timestamptz,
  invite_code   text,
  creator_id    uuid,
  my_exercise_id uuid,
  member_count  bigint,
  my_total      numeric,
  my_rank       bigint,
  leader_total  numeric,
  top           jsonb,
  server_now    timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with mine as (
    select c.*, me.exercise_id as my_exercise_id from public.challenges c
    join public.challenge_members me on me.challenge_id = c.id and me.user_id = auth.uid()
  ),
  totals as (
    select m.challenge_id, m.user_id, m.display_name, m.joined_at,
           coalesce(sum(e.amount), 0) as total,
           coalesce(sum(e.amount) filter (where e.logged_at >= date_trunc('day', now())), 0) as today
    from public.challenge_members m
    join mine c on c.id = m.challenge_id
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
  select c.id, c.name, c.exercise_name, c.unit, c.goal_type, c.goal_value,
         c.starts_at, c.ends_at, c.invite_code, c.creator_id, c.my_exercise_id,
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

grant execute on function public.my_challenges() to anon, authenticated;

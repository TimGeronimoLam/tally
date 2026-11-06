-- Tally · team goals
-- Run in the dashboard SQL Editor after the public challenges migration,
-- and before deploying the app that offers the "Together" goal: until then
-- creating a team challenge fails and the group total reads 0.
--
-- A third goal type next to most_reps and first_to: 'team'. Everyone in
-- the challenge works towards one number together (goal_value), summed
-- over all members inside the window. The leaderboard stays, as who
-- contributed how much. An app from before this migration does not know
-- 'team' and shows such a challenge as most reps; nothing breaks.

-- The goal type check was declared inline, so Postgres named it. Drop
-- whichever check lists the goal types, whatever it is called.
do $$
declare
  con text;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.challenges'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%goal_type%most_reps%first_to%'
  loop
    execute format('alter table public.challenges drop constraint %I', con);
  end loop;
end
$$;

alter table public.challenges
  add constraint challenges_goal_type_check
  check (goal_type in ('most_reps', 'first_to', 'team'));

alter table public.challenges
  drop constraint if exists challenges_goal;
alter table public.challenges
  add constraint challenges_goal
  check (goal_type = 'most_reps' or goal_value is not null);

/* ---------- update_challenge ---------- */

-- Same as the public challenges version, except a team goal keeps its
-- goal_value too.
create or replace function public.update_challenge(
  p_challenge_id uuid,
  p_name         text,
  p_goal_type    text,
  p_goal_value   numeric,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_is_public    boolean default null
)
returns public.challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c   public.challenges;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into c from public.challenges where id = p_challenge_id;
  if c.id is null then
    raise exception 'No such challenge';
  end if;
  if c.creator_id <> uid then
    raise exception 'Only the host can edit a challenge';
  end if;
  if c.ends_at <= now() then
    raise exception 'Challenge has already ended';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Name is required';
  end if;
  if p_ends_at <= now() then
    raise exception 'End date must be in the future';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'End date must be after the start';
  end if;
  update public.challenges set
    name       = btrim(p_name),
    goal_type  = p_goal_type,
    goal_value = case when p_goal_type in ('first_to', 'team') then p_goal_value end,
    starts_at  = p_starts_at,
    ends_at    = p_ends_at,
    is_public  = coalesce(p_is_public, is_public)
  where id = c.id
  returning * into c;
  return c;
end
$$;

/* ---------- my_challenges ---------- */

-- Same as the public challenges version, plus team_total: what all members
-- logged together, which a team goal is measured against. The return type
-- changes, hence drop + recreate.
drop function if exists public.my_challenges(text);

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
  is_public        boolean,
  my_exercise_id   uuid,
  member_count     bigint,
  my_total         numeric,
  my_rank          bigint,
  leader_total     numeric,
  team_total       numeric,
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
         c.creator_id, c.is_public, c.my_exercise_id,
         (select count(*) from ranked r where r.challenge_id = c.id),
         (select r.total from ranked r where r.challenge_id = c.id and r.user_id = auth.uid()),
         (select r.rnk   from ranked r where r.challenge_id = c.id and r.user_id = auth.uid()),
         (select max(r.total) from ranked r where r.challenge_id = c.id),
         (select coalesce(sum(r.total), 0) from ranked r where r.challenge_id = c.id),
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'user_id', r.user_id, 'display_name', r.display_name,
                   'total', r.total, 'today', r.today, 'rank', r.rnk)
                 order by r.rnk), '[]'::jsonb)
          from (select * from ranked r where r.challenge_id = c.id order by r.rnk, r.joined_at limit 3) r),
         now()
  from mine c
  order by c.ends_at desc
$$;

grant execute on function public.my_challenges(text) to anon, authenticated;

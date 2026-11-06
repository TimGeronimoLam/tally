-- Tally · public challenges
-- Run in the dashboard SQL Editor after the member-days migration, and
-- before deploying the app that lists public challenges: until then the
-- Challenges tab shows an error and creating or editing a challenge fails.
--
-- A host can make a challenge public. Public challenges that have not
-- ended are listed for everyone (signed in or not) under Challenges, and
-- anyone can join one from there. Joining still goes through the invite
-- code: a public listing hands it out, so the code of a challenge that was
-- once public keeps working after it is made private again, like a shared
-- link would. The list shows what the join page shows (name, exercise,
-- goal, window, member count) and nothing about the members.

alter table public.challenges
  add column if not exists is_public boolean not null default false;

create index if not exists challenges_public_idx
  on public.challenges (ends_at) where is_public;

/* ---------- create_challenge ---------- */

-- Same as the built-in exercises version, plus p_is_public. It defaults to
-- false so an app from before this migration still creates private ones.
drop function if exists public.create_challenge(text, text, text, text, numeric, timestamptz, timestamptz, text, text, uuid, text);

create or replace function public.create_challenge(
  p_name             text,
  p_exercise_name    text,
  p_unit             text,
  p_goal_type        text,
  p_goal_value       numeric,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_invite_code      text,
  p_display_name     text,
  p_exercise_id      uuid,
  p_exercise_builtin text default null,
  p_is_public        boolean default false
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
  if (select count(*) from public.challenges
      where creator_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many challenges created today';
  end if;
  insert into public.challenges
    (creator_id, name, exercise_name, unit, exercise_builtin, goal_type, goal_value, starts_at, ends_at, invite_code, is_public)
  values
    (uid, p_name, p_exercise_name, p_unit, p_exercise_builtin, p_goal_type, p_goal_value, p_starts_at, p_ends_at, upper(p_invite_code), coalesce(p_is_public, false))
  returning * into c;
  insert into public.challenge_members (challenge_id, user_id, display_name, exercise_id)
  values (c.id, uid, p_display_name, p_exercise_id);
  return c;
end
$$;

/* ---------- update_challenge ---------- */

-- Same as the leave/edit version, plus p_is_public. Null leaves it as is,
-- so an app from before this migration does not flip it.
drop function if exists public.update_challenge(uuid, text, text, numeric, timestamptz, timestamptz);

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
    goal_value = case when p_goal_type = 'first_to' then p_goal_value end,
    starts_at  = p_starts_at,
    ends_at    = p_ends_at,
    is_public  = coalesce(p_is_public, is_public)
  where id = c.id
  returning * into c;
  return c;
end
$$;

/* ---------- my_challenges ---------- */

-- Same as the challenge "today" version, plus is_public. The return type
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
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'user_id', r.user_id, 'display_name', r.display_name,
                   'total', r.total, 'today', r.today, 'rank', r.rnk)
                 order by r.rnk), '[]'::jsonb)
          from (select * from ranked r where r.challenge_id = c.id order by r.rnk, r.joined_at limit 3) r),
         now()
  from mine c
  order by c.ends_at desc
$$;

/* ---------- public_challenges ---------- */

-- Public challenges that have not ended and the caller is not in, busiest
-- first. Works without a session, like preview_challenge.
create or replace function public.public_challenges()
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
  member_count     bigint,
  server_now       timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.name, c.exercise_name, c.unit, c.exercise_builtin,
         c.goal_type, c.goal_value, c.starts_at, c.ends_at, c.invite_code,
         (select count(*) from public.challenge_members m where m.challenge_id = c.id) as member_count,
         now()
  from public.challenges c
  where c.is_public
    and c.ends_at > now()
    and not exists (select 1 from public.challenge_members m
                    where m.challenge_id = c.id and m.user_id = auth.uid())
  order by member_count desc, c.ends_at asc
  limit 50
$$;

grant execute on function
  public.create_challenge(text, text, text, text, numeric, timestamptz, timestamptz, text, text, uuid, text, boolean),
  public.my_challenges(text),
  public.public_challenges()
to anon, authenticated;

grant execute on function
  public.update_challenge(uuid, text, text, numeric, timestamptz, timestamptz, boolean)
to authenticated;

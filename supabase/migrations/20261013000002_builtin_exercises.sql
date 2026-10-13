-- Tally · built-in exercises
-- Run in the dashboard SQL Editor after the challenge lock-down migration,
-- and before deploying the app that sends `builtin`: until then its sync
-- push and challenge creation fail.
--
-- The exercises Tally ships with (pushups, squats, pull-ups, plank) get a
-- key that does not depend on the language. The app names them in each
-- user's language, and a challenge on one counts every member's copy, in
-- whatever language it was seeded. Custom exercises still match by name.
-- The key has no check constraint so a later app can add built-ins; an
-- app that does not know a key treats the exercise as custom.

alter table public.exercises  add column if not exists builtin text;
alter table public.challenges add column if not exists exercise_builtin text;

/* ---------- backfill ---------- */

-- Defaults seeded before the key existed are known by their name in any of
-- the app's languages (src/i18n/*.ts, `defaultExercises`). The app's own
-- local upgrade applies the same list.
create or replace function public.tmp_builtin_named(p_name text)
returns text
language sql
immutable
as $$
  select v.builtin
  from (values
    ('pushups', 'pushups'),
    ('pushups', 'push-ups'),
    ('pushups', 'liegestütze'),
    ('pushups', 'pompes'),
    ('pushups', 'flexiones'),
    ('pushups', 'piegamenti'),
    ('pushups', 'flexões'),
    ('squats',  'squats'),
    ('squats',  'squat'),
    ('squats',  'kniebeugen'),
    ('squats',  'sentadillas'),
    ('squats',  'agachamentos'),
    ('pullups', 'pull-ups'),
    ('pullups', 'klimmzüge'),
    ('pullups', 'tractions'),
    ('pullups', 'dominadas'),
    ('pullups', 'trazioni'),
    ('pullups', 'elevações'),
    ('plank',   'plank'),
    ('plank',   'planche'),
    ('plank',   'plancha'),
    ('plank',   'prancha')
  ) as v (builtin, name)
  where lower(v.name) = lower(trim(p_name))
$$;

-- Bumps updated_at, so every device pulls the key on its next sync. Where an
-- account now has two copies of one built-in (say "Pushups" and
-- "Liegestütze" from two devices), the app folds them into one then.
update public.exercises
   set builtin = public.tmp_builtin_named(name)
 where builtin is null
   and public.tmp_builtin_named(name) is not null;

update public.challenges
   set exercise_builtin = public.tmp_builtin_named(exercise_name)
 where exercise_builtin is null
   and public.tmp_builtin_named(exercise_name) is not null;

drop function public.tmp_builtin_named(text);

/* ---------- RPCs ---------- */

-- create_challenge takes the key. It defaults to null so an app from before
-- this migration can still create (custom-matched) challenges.
drop function if exists public.create_challenge(text, text, text, text, numeric, timestamptz, timestamptz, text, text, uuid);

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
  p_exercise_builtin text default null
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
    (creator_id, name, exercise_name, unit, exercise_builtin, goal_type, goal_value, starts_at, ends_at, invite_code)
  values
    (uid, p_name, p_exercise_name, p_unit, p_exercise_builtin, p_goal_type, p_goal_value, p_starts_at, p_ends_at, upper(p_invite_code))
  returning * into c;
  insert into public.challenge_members (challenge_id, user_id, display_name, exercise_id)
  values (c.id, uid, p_display_name, p_exercise_id);
  return c;
end
$$;

-- The join page needs the key to find the joiner's copy. Return type
-- changes, hence drop + recreate.
drop function if exists public.preview_challenge(text);

create or replace function public.preview_challenge(p_code text)
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
  member_count     bigint,
  is_member        boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.name, c.exercise_name, c.unit, c.exercise_builtin,
         c.goal_type, c.goal_value, c.starts_at, c.ends_at,
         (select count(*) from public.challenge_members m where m.challenge_id = c.id),
         exists (select 1 from public.challenge_members m
                 where m.challenge_id = c.id and m.user_id = auth.uid())
  from public.challenges c
  where c.invite_code = upper(p_code)
$$;

-- Same as the server-clock version, plus exercise_builtin.
drop function if exists public.my_challenges();

create or replace function public.my_challenges()
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
  public.create_challenge(text, text, text, text, numeric, timestamptz, timestamptz, text, text, uuid, text),
  public.preview_challenge(text),
  public.my_challenges()
to anon, authenticated;

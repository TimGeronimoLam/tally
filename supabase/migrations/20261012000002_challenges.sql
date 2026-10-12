-- Tally · challenges (Phase 5)
-- Run in the dashboard SQL Editor after the init and grants migrations.
--
-- A challenge names an exercise; each member maps one of their own local
-- exercises onto it (challenge_members.exercise_id). Leaderboards are
-- computed server-side from entries, so members never see each other's
-- raw entries. All writes go through the RPCs below.

create table public.challenges (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  exercise_name text not null,
  unit          text not null default 'reps',
  goal_type     text not null check (goal_type in ('most_reps', 'first_to')),
  goal_value    numeric check (goal_value is null or goal_value > 0),
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  invite_code   text not null unique,
  created_at    timestamptz not null default now(),
  constraint challenges_window check (ends_at > starts_at),
  constraint challenges_goal   check (goal_type <> 'first_to' or goal_value is not null)
);

create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  -- The member's own exercise that counts toward this challenge.
  exercise_id  uuid not null,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index challenge_members_user_idx on public.challenge_members (user_id);
create index challenges_creator_idx     on public.challenges (creator_id, created_at);

-- Used by policies; security definer avoids recursive RLS on challenge_members.
create or replace function public.is_challenge_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_members
    where challenge_id = cid and user_id = auth.uid()
  )
$$;

alter table public.challenges        enable row level security;
alter table public.challenge_members enable row level security;

create policy "challenges: members read"
  on public.challenges for select to authenticated
  using (creator_id = auth.uid() or public.is_challenge_member(id));

create policy "members: read co-members"
  on public.challenge_members for select to authenticated
  using (public.is_challenge_member(challenge_id));

create policy "members: update own row"
  on public.challenge_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members: leave"
  on public.challenge_members for delete to authenticated
  using (user_id = auth.uid());

grant select, update, delete on public.challenges, public.challenge_members to authenticated;

/* ---------- RPCs ---------- */

-- Create a challenge and join it as its first member. Max 10 per user per day.
create or replace function public.create_challenge(
  p_name          text,
  p_exercise_name text,
  p_unit          text,
  p_goal_type     text,
  p_goal_value    numeric,
  p_starts_at     timestamptz,
  p_ends_at       timestamptz,
  p_invite_code   text,
  p_display_name  text,
  p_exercise_id   uuid
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
    (creator_id, name, exercise_name, unit, goal_type, goal_value, starts_at, ends_at, invite_code)
  values
    (uid, p_name, p_exercise_name, p_unit, p_goal_type, p_goal_value, p_starts_at, p_ends_at, upper(p_invite_code))
  returning * into c;
  insert into public.challenge_members (challenge_id, user_id, display_name, exercise_id)
  values (c.id, uid, p_display_name, p_exercise_id);
  return c;
end
$$;

-- What a join link shows before joining. Works without a session.
create or replace function public.preview_challenge(p_code text)
returns table (
  id            uuid,
  name          text,
  exercise_name text,
  unit          text,
  goal_type     text,
  goal_value    numeric,
  starts_at     timestamptz,
  ends_at       timestamptz,
  member_count  bigint,
  is_member     boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.name, c.exercise_name, c.unit, c.goal_type, c.goal_value,
         c.starts_at, c.ends_at,
         (select count(*) from public.challenge_members m where m.challenge_id = c.id),
         exists (select 1 from public.challenge_members m
                 where m.challenge_id = c.id and m.user_id = auth.uid())
  from public.challenges c
  where c.invite_code = upper(p_code)
$$;

-- Join (or re-join with a new name / exercise). Returns the challenge id.
create or replace function public.join_challenge(
  p_code         text,
  p_display_name text,
  p_exercise_id  uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select id into cid from public.challenges where invite_code = upper(p_code);
  if cid is null then
    raise exception 'No challenge with that code';
  end if;
  insert into public.challenge_members (challenge_id, user_id, display_name, exercise_id)
  values (cid, uid, p_display_name, p_exercise_id)
  on conflict (challenge_id, user_id) do update
    set display_name = excluded.display_name,
        exercise_id  = excluded.exercise_id;
  return cid;
end
$$;

-- Per-member totals inside the challenge window. "today" is UTC-day based.
create or replace function public.challenge_leaderboard(p_challenge_id uuid)
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
  with totals as (
    select m.user_id, m.display_name, m.joined_at,
           coalesce(sum(e.amount), 0) as total,
           coalesce(sum(e.amount) filter (where e.logged_at >= date_trunc('day', now())), 0) as today
    from public.challenge_members m
    join public.challenges c on c.id = m.challenge_id
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
  top           jsonb
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
          from (select * from ranked r where r.challenge_id = c.id order by r.rnk, r.joined_at limit 3) r)
  from mine c
  order by c.ends_at desc
$$;

grant execute on function
  public.is_challenge_member(uuid),
  public.create_challenge(text, text, text, text, numeric, timestamptz, timestamptz, text, text, uuid),
  public.preview_challenge(text),
  public.join_challenge(text, text, uuid),
  public.challenge_leaderboard(uuid),
  public.my_challenges()
to anon, authenticated;

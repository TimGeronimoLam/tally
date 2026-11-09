-- Tally · "someone passed you" challenge alerts
-- Run in the dashboard SQL Editor after the team goals migration, and
-- before deploying the app and Worker that use it: until then saving the
-- notification settings fails (unknown columns) and the cron logs an error
-- for overtaken_alerts.
--
-- A push subscription (one per device) now carries two switches: the daily
-- reminder it always had, and alerts when another member moves ahead of
-- you in a challenge. The Worker's cron (worker/index.ts) asks
-- overtaken_alerts() every 15 minutes who has been passed since the last
-- run and pushes to their devices.

/* ---------- what each device wants ---------- */

alter table public.push_subscriptions
  add column daily     boolean not null default true,
  add column overtaken boolean not null default false;

-- A row with neither switch on would never be used.
alter table public.push_subscriptions
  add constraint push_subscriptions_any check (daily or overtaken);

/* ---------- due_reminders: daily rows only, with a budget ---------- */

-- Same as the push reminders version, except it skips devices that only
-- want challenge alerts, and the batch size is the caller's: the Worker
-- shares one cron run's 50 subrequests between both kinds of push.
drop function if exists public.due_reminders();

create or replace function public.due_reminders(p_limit integer default 40)
returns table (endpoint text, p256dh text, auth text, lang text, origin text)
language sql
security definer
set search_path = public
as $$
  with local as (
    select s.endpoint, s.user_id, s.tz, s.last_sent_on,
           (now() at time zone s.tz)::date
             - case when (now() at time zone s.tz)::time < s.remind_at then 1 else 0 end
             + s.remind_at as slot
    from public.push_subscriptions s
    where s.daily
  ), due as (
    select l.endpoint, l.slot::date as day
    from local l
    where now() at time zone l.tz < l.slot + interval '2 hours'
      and (l.last_sent_on is null or l.last_sent_on < l.slot::date)
      and not exists (
        select 1 from public.entries e
        where e.user_id = l.user_id
          and e.deleted_at is null
          and e.logged_at >= (l.slot::date)::timestamp at time zone l.tz
          and e.logged_at <  (l.slot::date + 1)::timestamp at time zone l.tz
      )
    limit greatest(coalesce(p_limit, 40), 0)
  )
  update public.push_subscriptions s
     set last_sent_on = due.day
    from due
   where s.endpoint = due.endpoint
     and (s.last_sent_on is null or s.last_sent_on < due.day)
  returning s.endpoint, s.p256dh, s.auth, s.lang, s.origin
$$;

revoke execute on function public.due_reminders(integer) from public, anon, authenticated;
grant execute on function public.due_reminders(integer) to service_role;

/* ---------- the rank each member was last told about ---------- */

-- Server-only bookkeeping, apart from challenge_members so co-members
-- (who can read that table) never see when someone was notified.
create table public.challenge_rank_seen (
  challenge_id uuid not null,
  user_id      uuid not null,
  -- Place on the leaderboard as of the last check that settled it.
  rank         integer not null,
  -- Last "passed you" push for this challenge; one per hour at most.
  notified_at  timestamptz,
  primary key (challenge_id, user_id),
  foreign key (challenge_id, user_id)
    references public.challenge_members (challenge_id, user_id) on delete cascade
);

alter table public.challenge_rank_seen enable row level security;
revoke all on public.challenge_rank_seen from anon, authenticated, service_role;

/* ---------- who has been passed ---------- */

-- For every running challenge with a winner to race for (not team goals),
-- the leaderboard as challenge_leaderboard orders it, compared with the
-- rank each member was last seen at:
--
--   * first sight, or a better place: remember it, quietly;
--   * a worse place: someone moved ahead. Pushed if the member has logged
--     something in the challenge (a 0 has not started racing yet), was not
--     pushed for it in the last hour, and has a device that wants it.
--     Otherwise remembered quietly, except during the hour's pause: then
--     it stays, and a later run sends it if they are still behind.
--
-- One row per device to push to, with the member directly ahead (most
-- often the one who just passed) and the new place. Claimed in the same
-- statement, like due_reminders. p_limit caps the members pushed per run;
-- the rest wait for the next.
create or replace function public.overtaken_alerts(p_limit integer default 20)
returns table (
  endpoint       text,
  p256dh         text,
  auth           text,
  lang           text,
  origin         text,
  challenge_id   uuid,
  challenge_name text,
  ahead_name     text,
  rank           integer,
  member_count   integer
)
language sql
security definer
set search_path = public
as $$
  with running as (
    select c.id, c.name, c.starts_at, c.ends_at
    from public.challenges c
    where c.goal_type <> 'team'
      and c.starts_at <= now()
      and c.ends_at   >  now()
  ),
  totals as (
    select m.challenge_id, m.user_id, m.display_name, m.joined_at,
           coalesce(sum(e.amount), 0) as total
    from public.challenge_members m
    join running c on c.id = m.challenge_id
    left join public.entries e
      on e.user_id = m.user_id
     and e.exercise_id = m.exercise_id
     and e.deleted_at is null
     and e.logged_at >= c.starts_at
     and e.logged_at <  c.ends_at
    group by m.challenge_id, m.user_id, m.display_name, m.joined_at
  ),
  ranked as (
    -- Ties go to whoever joined first, so every place is distinct and the
    -- member above is well defined.
    select t.*,
           row_number() over w as rnk,
           lag(t.display_name) over w as ahead_name,
           count(*) over (partition by t.challenge_id) as members
    from totals t
    window w as (partition by t.challenge_id order by t.total desc, t.joined_at asc)
  ),
  state as (
    select r.*, s.rank as seen, s.notified_at,
           exists (select 1 from public.push_subscriptions p
                   where p.user_id = r.user_id and p.overtaken) as wants
    from ranked r
    left join public.challenge_rank_seen s
      on s.challenge_id = r.challenge_id and s.user_id = r.user_id
    where r.members > 1
  ),
  passed as (
    select * from state
    where seen is not null
      and rnk > seen
      and total > 0
      and wants
      and (notified_at is null or notified_at < now() - interval '1 hour')
    order by notified_at nulls first, challenge_id, rnk
    limit greatest(coalesce(p_limit, 20), 0)
  ),
  quiet as (
    select * from state st
    where (st.seen is null
           or st.rnk < st.seen
           or (st.rnk > st.seen and (st.total = 0 or not st.wants)))
      and not exists (select 1 from passed p
                      where p.challenge_id = st.challenge_id and p.user_id = st.user_id)
  ),
  remembered as (
    insert into public.challenge_rank_seen (challenge_id, user_id, rank)
    select challenge_id, user_id, rnk from quiet
    on conflict (challenge_id, user_id) do update set rank = excluded.rank
  ),
  claimed as (
    update public.challenge_rank_seen s
       set rank = p.rnk, notified_at = now()
      from passed p
     where s.challenge_id = p.challenge_id
       and s.user_id = p.user_id
       -- Re-checked under the row lock: a concurrent run that claimed it
       -- first changed the rank, so nobody is told twice.
       and s.rank = p.seen
    returning s.challenge_id, s.user_id
  )
  select d.endpoint, d.p256dh, d.auth, d.lang, d.origin,
         p.challenge_id, c.name, p.ahead_name, p.rnk::integer, p.members::integer
  from claimed k
  join passed p on p.challenge_id = k.challenge_id and p.user_id = k.user_id
  join running c on c.id = p.challenge_id
  join public.push_subscriptions d on d.user_id = p.user_id and d.overtaken
$$;

revoke execute on function public.overtaken_alerts(integer) from public, anon, authenticated;
grant execute on function public.overtaken_alerts(integer) to service_role;

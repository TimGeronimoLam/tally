-- Tally · daily "log your reps" push reminder
-- Run in the dashboard SQL Editor after the built-in exercises migration.
--
-- One row per device that turned the reminder on: its Web Push
-- subscription, the time it wants the nudge, and its time zone. The
-- Cloudflare Worker (worker/index.ts) calls due_reminders() every 15
-- minutes with the service-role key and sends whatever comes back.
-- Anonymous users count too: the toggle creates one silently when there is
-- no session, like joining a challenge does.

create table public.push_subscriptions (
  -- Only the browsers' own push services: the Worker POSTs to this URL, so
  -- an arbitrary one would turn it into a relay.
  endpoint     text primary key check (
    length(endpoint) <= 1024
    and endpoint ~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)/'
  ),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh       text not null check (length(p256dh) <= 128),
  auth         text not null check (length(auth) <= 64),
  tz           text not null,                 -- IANA, from Intl.DateTimeFormat().resolvedOptions()
  remind_at    time not null default '19:00',
  lang         text not null default 'en' check (lang ~ '^[a-z]{2}$'),
  -- Where the app runs (the subscription belongs to that origin's service
  -- worker); a tap on the reminder opens it. The cron run has no request
  -- to take it from.
  origin       text not null check (origin ~ '^(https://[a-z0-9.-]+|http://localhost)(:[0-9]{1,5})?$'),
  last_sent_on date,                          -- local date of the last reminder (claim marker)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- Reject an unknown zone name at write time; otherwise it would only fail
-- later, inside the cron query, for everyone.
create or replace function public.push_subscriptions_check_tz()
returns trigger
language plpgsql
as $$
begin
  perform now() at time zone new.tz;
  return new;
end
$$;

create trigger push_subscriptions_check_tz
  before insert or update of tz on public.push_subscriptions
  for each row execute function public.push_subscriptions_check_tz();

alter table public.push_subscriptions enable row level security;

-- Anonymous users carry the authenticated role too.
create policy "push_subscriptions: own rows"
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.push_subscriptions from anon, authenticated, service_role;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
-- The Worker deletes rows whose push service answers 404/410.
grant select, update, delete on public.push_subscriptions to service_role;

/* ---------- who is due ---------- */

-- Subscriptions whose reminder time has passed in their own zone, within a
-- 2-hour grace window (a missed cron run sends late rather than never),
-- not reminded yet for that day, and with no entry synced for that local
-- day. The rows returned are claimed in the same statement, so a second
-- run, even a concurrent one, never sends them again that day.
--
-- The slot is the latest occurrence of remind_at, which may be yesterday:
-- a 23:50 reminder is still due at 00:05.
create or replace function public.due_reminders()
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
  ), due as (
    select l.endpoint, l.slot::date as day
    from local l
    where now() at time zone l.tz < l.slot + interval '2 hours'
      and (l.last_sent_on is null or l.last_sent_on < l.slot::date)
      -- A range on logged_at so entries_user_logged_idx serves it.
      and not exists (
        select 1 from public.entries e
        where e.user_id = l.user_id
          and e.deleted_at is null
          and e.logged_at >= (l.slot::date)::timestamp at time zone l.tz
          and e.logged_at <  (l.slot::date + 1)::timestamp at time zone l.tz
      )
    -- One cron run stays under the free plan's 50 subrequests; the rest go
    -- out on the next run, still inside the grace window.
    limit 40
  )
  update public.push_subscriptions s
     set last_sent_on = due.day
    from due
   where s.endpoint = due.endpoint
     -- Re-checked under the row lock: a concurrent run that claimed the row
     -- first makes this false, so nobody is reminded twice.
     and (s.last_sent_on is null or s.last_sent_on < due.day)
  returning s.endpoint, s.p256dh, s.auth, s.lang, s.origin
$$;

-- Only the Worker (service role) calls this.
revoke execute on function public.due_reminders() from public, anon, authenticated;
grant execute on function public.due_reminders() to service_role;

/* ---------- keep reminder-only anonymous users ---------- */

-- Token refreshes do not bump last_sign_in_at, so an anonymous user whose
-- only footprint is a reminder would otherwise be purged after 90 days,
-- and the reminder with them. A dead device still gets cleaned up: its
-- push service answers 410, the Worker deletes the row, the purge resumes.
create or replace function public.purge_inactive_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  with doomed as (
    delete from auth.users u
    where u.is_anonymous
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '90 days'
      and not exists (
        select 1
        from public.challenge_members m
        join public.challenges c on c.id = m.challenge_id
        where m.user_id = u.id
          and c.ends_at > now() - interval '90 days'
      )
      and not exists (
        select 1 from public.push_subscriptions p where p.user_id = u.id
      )
    returning u.id
  )
  select count(*) into removed from doomed;
  return removed;
end
$$;

revoke execute on function public.purge_inactive_anonymous_users() from public, anon, authenticated;

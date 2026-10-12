-- Tally · purge inactive anonymous users (Phase 6)
-- Run in the dashboard SQL Editor. Requires the pg_cron extension:
-- Dashboard → Database → Extensions → enable "pg_cron" first.
--
-- Anonymous users who have not signed in for 90 days are deleted, together
-- with their rows (entries, memberships cascade). A user is kept while they
-- belong to any challenge that ended less than 90 days ago, so leaderboards
-- of recent challenges stay intact.

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
    returning u.id
  )
  select count(*) into removed from doomed;
  return removed;
end
$$;

-- Only the scheduler should call this.
revoke execute on function public.purge_inactive_anonymous_users() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'tally-purge-anonymous',
  '17 3 * * *',  -- daily at 03:17 UTC
  $$ select public.purge_inactive_anonymous_users() $$
);

-- Tally · delete your own account
-- Run in the dashboard SQL Editor after the profile pictures migration.
-- Until then Account → Delete account fails with "could not find the
-- function" and nothing is deleted.
--
-- Deleting the auth user cascades to everything else that is theirs:
-- exercises, entries, push subscriptions, challenge memberships (and with
-- them the "passed you" bookkeeping), the profiles row, and every
-- challenge they host, for all of its members.
--
-- Not the profile picture: Supabase refuses SQL deletes on storage
-- tables, so the app removes the file through the Storage API first.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

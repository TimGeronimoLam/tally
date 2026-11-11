-- Tally · profile pictures
-- Run in the dashboard SQL Editor after the "passed you" alerts migration.
-- The app works before it is run: leaderboards fall back to initials and
-- only uploading a photo fails.
--
-- Each email account can upload one square JPEG, stored at
-- avatars/<user id>.jpg in a public bucket. The file name never changes;
-- profiles.avatar_updated_at changes with every upload and goes into the
-- image URL, so caches can keep a picture forever and still see new ones.
--
-- The bucket is public-read: anyone who knows a member's user id can load
-- their picture. User ids are random UUIDs that only co-members see, and
-- whether someone has a picture at all is only readable by people who
-- share a challenge with them (profiles RLS below). Anonymous sessions
-- (joined a challenge without signing in) cannot upload: they are purged
-- after a while and their files would be left behind.

/* ---------- storage ---------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Own file only, email accounts only. Select is needed for upsert.
create policy "avatars: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

create policy "avatars: upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "avatars: replace own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '.jpg'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "avatars: remove own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

/* ---------- who has a picture ---------- */

create table public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  -- Set on every upload, null after removing the picture.
  avatar_updated_at timestamptz
);

-- True when the caller and p_user_id are in at least one challenge
-- together. Security definer: reads both membership rows without going
-- through challenge_members RLS from inside another policy.
create or replace function public.shares_challenge_with(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_members mine
    join public.challenge_members theirs
      on theirs.challenge_id = mine.challenge_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  )
$$;

revoke execute on function public.shares_challenge_with(uuid) from public, anon;
grant execute on function public.shares_challenge_with(uuid) to authenticated;

alter table public.profiles enable row level security;

create policy "profiles: read own and co-members"
  on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_challenge_with(user_id));

create policy "profiles: write own"
  on public.profiles for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The default privileges grant everything; delete is not needed (removing
-- the picture sets avatar_updated_at to null).
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

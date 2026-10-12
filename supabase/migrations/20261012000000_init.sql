-- Tally · initial schema (Phase 4)
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Or with the CLI: `supabase link` then `supabase db push`.
--
-- Tables mirror the local Dexie schema. IDs are client-generated UUIDs so
-- rows never collide across devices. Rows are immutable except `deleted_at`
-- (soft delete); `updated_at` drives incremental pulls.

create table public.exercises (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  unit       text not null default 'reps',
  created_at timestamptz not null,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.entries (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  amount      numeric not null check (amount > 0),
  logged_at   timestamptz not null,
  created_at  timestamptz not null,
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- pull(): "rows for me changed since lastSyncAt"
create index exercises_user_updated_idx on public.exercises (user_id, updated_at);
create index entries_user_updated_idx   on public.entries   (user_id, updated_at);
-- leaderboards (Phase 5) sum entries per user inside a time window
create index entries_user_logged_idx    on public.entries   (user_id, logged_at);

-- Keep updated_at honest on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- Row Level Security: a user only ever sees their own rows.
alter table public.exercises enable row level security;
alter table public.entries   enable row level security;

create policy "exercises: own rows"
  on public.exercises
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "entries: own rows"
  on public.entries
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

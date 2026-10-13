-- Tally · leave a challenge, edit a challenge
-- Run in the dashboard SQL Editor after the server-clock migration.
--
-- Members can leave a challenge; the host cannot (they delete it instead),
-- so a challenge never loses its host. The host can change the name, goal
-- and window of a challenge that has not ended. The exercise is fixed:
-- every member has mapped one of their own exercises onto it.

-- Leaving goes through leave_challenge, which keeps the host in. The old
-- policy let any member, the host included, delete their own row directly.
drop policy if exists "members: leave" on public.challenge_members;

-- Leave a challenge. Logged entries are untouched; they stop counting here.
-- Rejoining with the invite code puts the member back on the leaderboard.
create or replace function public.leave_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  owner uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select creator_id into owner from public.challenges where id = p_challenge_id;
  if owner is null then
    raise exception 'No such challenge';
  end if;
  if owner = uid then
    raise exception 'The host cannot leave; delete the challenge instead';
  end if;
  delete from public.challenge_members
  where challenge_id = p_challenge_id and user_id = uid;
  if not found then
    raise exception 'Not a member of this challenge';
  end if;
end
$$;

-- Host only: change name, goal and window. Only while the challenge has not
-- ended, and the new window must still end in the future (use end_challenge
-- to close it now), so an ended challenge cannot be reopened.
create or replace function public.update_challenge(
  p_challenge_id uuid,
  p_name         text,
  p_goal_type    text,
  p_goal_value   numeric,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz
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
    ends_at    = p_ends_at
  where id = c.id
  returning * into c;
  return c;
end
$$;

grant execute on function
  public.leave_challenge(uuid),
  public.update_challenge(uuid, text, text, numeric, timestamptz, timestamptz)
to authenticated;

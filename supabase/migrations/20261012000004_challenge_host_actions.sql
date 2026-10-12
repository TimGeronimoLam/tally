-- Tally · host actions on challenges
-- Run in the dashboard SQL Editor after the challenges migration.
--
-- The creator ("host") of a challenge can end it early or delete it.
-- Both go through RPCs so the rules live in one place; there is still no
-- update/delete policy on public.challenges.

-- End a running challenge now. The window closes at the current time, so
-- totals already logged stand and the challenge moves to "Past" for everyone.
create or replace function public.end_challenge(p_challenge_id uuid)
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
    raise exception 'Only the host can end a challenge';
  end if;
  if c.ends_at <= now() then
    raise exception 'Challenge has already ended';
  end if;
  if c.starts_at > now() then
    raise exception 'Challenge has not started yet; delete it instead';
  end if;
  update public.challenges set ends_at = now() where id = c.id
  returning * into c;
  return c;
end
$$;

-- Delete a challenge and its memberships (cascade). Members' entries are
-- untouched; they only stop being counted toward this challenge.
create or replace function public.delete_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select creator_id into owner from public.challenges where id = p_challenge_id;
  if owner is null then
    raise exception 'No such challenge';
  end if;
  if owner <> uid then
    raise exception 'Only the host can delete a challenge';
  end if;
  delete from public.challenges where id = p_challenge_id;
end
$$;

grant execute on function
  public.end_challenge(uuid),
  public.delete_challenge(uuid)
to authenticated;

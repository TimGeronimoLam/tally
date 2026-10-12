-- Tally · table grants
-- Run after 20261012000000_init.sql if API calls fail with
-- "permission denied for table ...". RLS still restricts rows per user;
-- these grants only let the API roles reach the tables at all.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.exercises, public.entries
  to authenticated;

-- Future tables created in the SQL editor get the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

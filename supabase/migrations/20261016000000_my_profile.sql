-- Speed: one call returns the signed-in member's own profile (replaces two calls per page).
create or replace function public.my_profile() returns setof public.profiles
language sql stable security invoker set search_path = public as $$
  select * from profiles where id = auth.uid()
$$;
grant execute on function public.my_profile() to anon, authenticated;

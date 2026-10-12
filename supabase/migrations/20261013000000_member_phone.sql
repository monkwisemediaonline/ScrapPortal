-- Password sign-in means the phone number no longer comes from the login itself.
-- Let a member enter it on the business form (while onboarding, or if still missing);
-- after that only admin can change it.

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  if new.role = 'admin' then
    raise exception 'Not allowed to set admin role';
  end if;
  new.public_code := old.public_code;
  new.admin_note  := old.admin_note;
  if not (old.status = 'incomplete' or old.phone is null) then
    new.phone := old.phone;
  end if;
  -- Only allowed self transition: incomplete -> pending (finishing onboarding)
  if new.status is distinct from old.status
     and not (old.status = 'incomplete' and new.status = 'pending') then
    new.status := old.status;
  end if;
  -- Role/GSTIN are locked once approved; admin changes them.
  if old.status = 'approved' then
    new.role  := old.role;
    new.gstin := old.gstin;
  end if;
  return new;
end $$;

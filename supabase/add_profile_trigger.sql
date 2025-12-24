-- 1. Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '사용자'),
    'user'
  );
  return new;
end;
$$;

-- 2. Create the trigger
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. (Important) Backfill for existing users who missed the trigger
insert into public.profiles (id, email, name, role)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '사용자'),
  'user'
from auth.users
where id not in (select id from public.profiles);

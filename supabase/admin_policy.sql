-- Enable RLS (if not already)
alter table public.reservations enable row level security;

-- Allow Update for everyone (or restrict to authenticated/admin if you have auth setup)
-- For this prototype/demo where admin might be anonymous or guest:
create policy "Enable update for all" 
on public.reservations 
for update 
using (true)
with check (true);

-- Allow Delete for everyone
create policy "Enable delete for all" 
on public.reservations 
for delete 
using (true);

-- Verify policies
select * from pg_policies where tablename = 'reservations';

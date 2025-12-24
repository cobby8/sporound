-- Drop the restrictive insert policy
drop policy if exists "Users can create reservations" on public.reservations;

-- Create a permissive insert policy for Admins (or everyone for this prototype)
create policy "Enable insert for all"
on public.reservations
for insert
with check (true);

-- Ensure update/delete are also open (verifying previous steps)
drop policy if exists "Enable update for all" on public.reservations;
create policy "Enable update for all"
on public.reservations
for update
using (true)
with check (true);

drop policy if exists "Enable delete for all" on public.reservations;
create policy "Enable delete for all"
on public.reservations
for delete
using (true);

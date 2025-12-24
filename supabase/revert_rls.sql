-- Revert anonymous access: Only authenticated users can reserve
drop policy if exists "Enable insert for authenticated users and anon" on public.reservations;

create policy "Users can create reservations"
on public.reservations for insert
to authenticated
with check (true);

-- Allow users to view their own reservations (already in schema.sql usually, but ensuring read access)
-- "Enable read access for all users" logic might be needed for Schedule Board (public read).
-- Ensure public read is still strictly allowed if we want everyone to SEE the schedule.

-- Check existing policies:
-- We probably want EVERYONE to SEE (select) reservations, but only AUTHENTICATED to INSERT.

drop policy if exists "Enable read access for all users" on public.reservations;
create policy "Enable read access for all users"
on public.reservations for select
using (true);

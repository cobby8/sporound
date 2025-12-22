-- Allow public anonymous access for a demo/guest mode
drop policy if exists "Users can create reservations" on public.reservations;

create policy "Enable insert for authenticated users and anon"
on public.reservations for insert
with check (true);

-- Also allow update if needed (e.g. canceling own reservation - requires more logic, but for now open it up or keep restricted)
-- For this phase, we just need INSERT to work.

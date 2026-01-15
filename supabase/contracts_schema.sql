-- Contracts Table
create table if not exists public.contracts (
  id uuid default gen_random_uuid() primary key,
  reservation_id uuid references public.reservations(id) on delete cascade not null,
  lessee_name text not null,
  lessee_phone text not null,
  signature_data text, -- Data URI of the signature
  signed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Contracts
alter table public.contracts enable row level security;

-- Admin can view all contracts
create policy "Admins can view all contracts"
  on public.contracts for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admin can update/delete contracts
create policy "Admins can update all contracts"
  on public.contracts for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete all contracts"
    on public.contracts for delete
    using (
        exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
        )
    );

-- Admin can insert contracts (e.g. on behalf of user)
create policy "Admins can insert contracts"
  on public.contracts for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Users can view their own contracts (linked via reservation -> user_id)
create policy "Users can view their own contracts"
  on public.contracts for select
  using (
    exists (
      select 1 from public.reservations
      where reservations.id = contracts.reservation_id
      and reservations.user_id = auth.uid()
    )
  );

-- Users can insert contracts for their own reservations
create policy "Users can insert contracts for their own reservations"
  on public.contracts for insert
  with check (
    exists (
      select 1 from public.reservations
      where reservations.id = reservation_id
      and reservations.user_id = auth.uid()
    )
  );

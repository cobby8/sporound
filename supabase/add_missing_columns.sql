-- Add missing columns for reservation details
alter table public.reservations 
add column if not exists team_name text,
add column if not exists guest_name text,
add column if not exists guest_phone text,
add column if not exists color text default '#db2777';

-- Ensure people_count and total_price exist (from phase 4, ensuring safety)
alter table public.reservations 
add column if not exists people_count integer default 1,
add column if not exists total_price integer default 0;

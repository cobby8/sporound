-- MASTER FIX SCRIPT
-- Run this to resolve all Schema and Permission issues

-- 1. Ensure Columns Exist
alter table public.reservations add column if not exists group_id uuid null;
alter table public.reservations add column if not exists recurrence_rule jsonb null;
alter table public.reservations add column if not exists team_name text null;
alter table public.reservations add column if not exists guest_name text null;
alter table public.reservations add column if not exists guest_phone text null;
alter table public.reservations add column if not exists color text default '#db2777';
alter table public.reservations add column if not exists people_count integer default 1;
alter table public.reservations add column if not exists total_price integer default 0;

-- 2. RESET RLS Policies completely
-- First, enable RLS (safe operation)
alter table public.reservations enable row level security;

-- Drop ALL existing policies to avoid conflicts
drop policy if exists "Reservations are viewable by everyone" on public.reservations;
drop policy if exists "Users can create reservations" on public.reservations;
drop policy if exists "Enable update for all" on public.reservations;
drop policy if exists "Enable delete for all" on public.reservations;
drop policy if exists "Enable insert for all" on public.reservations;
drop policy if exists "Public profiles are viewable by everyone." on public.reservations; -- just in case names overlap

-- Create NEW Permissive Policies (Admin Mode)
-- Allow SELECT for everyone
create policy "Allow Select for All"
on public.reservations for select
using (true);

-- Allow INSERT for everyone (Authenticated + Anon/Service Role if needed, 'true' covers all)
create policy "Allow Insert for All"
on public.reservations for insert
with check (true);

-- Allow UPDATE for everyone
create policy "Allow Update for All"
on public.reservations for update
using (true)
with check (true);

-- Allow DELETE for everyone
create policy "Allow Delete for All"
on public.reservations for delete
using (true);

-- 3. Verify Profiles RLS (Optional, but good sanity check)
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

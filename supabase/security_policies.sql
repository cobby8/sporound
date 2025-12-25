-- ==============================================================================
-- Sporound Consolidated Security Policies (RLS)
-- ==============================================================================
-- This script resets and re-defines all Row Level Security policies to ensure
-- a consistent and secure access model.
-- 
-- Roles assumed:
-- 1. 'anon' / Public: Can view schedule and courts.
-- 2. 'authenticated' (User): Can insert reservations, manage their own data.
-- 3. 'admin' (defined in profiles.role): Can manage ALL data.

-- ------------------------------------------------------------------------------
-- 0. Helper Functions
-- ------------------------------------------------------------------------------

-- Function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 1. Reset Policies (Clean Slate)
-- ------------------------------------------------------------------------------

-- Disable RLS temporarily to avoid lock issues during policy drop (optional, but safe)
alter table public.reservations disable row level security;
alter table public.profiles disable row level security;
alter table public.courts disable row level security;

-- Drop all existing policies to prevent conflicts
drop policy if exists "Enable update for all" on public.reservations;
drop policy if exists "Enable delete for all" on public.reservations;
drop policy if exists "Enable insert for all" on public.reservations;
drop policy if exists "Users can create reservations" on public.reservations;
drop policy if exists "Enable insert for authenticated users and anon" on public.reservations;
drop policy if exists "Enable read access for all users" on public.reservations;
drop policy if exists "Reservations are viewable by everyone" on public.reservations;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Courts are viewable by everyone." on public.courts;

-- Re-enable RLS
alter table public.reservations enable row level security;
alter table public.profiles enable row level security;
alter table public.courts enable row level security;

-- ------------------------------------------------------------------------------
-- 2. Policies for 'public.profiles'
-- ------------------------------------------------------------------------------

-- SELECT: Public read (needed for team name display in schedule)
create policy "Profiles are viewable by everyone"
on public.profiles for select
using (true);

-- INSERT: Users can insert their own profile on signup
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

-- UPDATE: Users can update their own profile; Admins can update any profile
create policy "Users manage own profile or Admin manages all"
on public.profiles for update
using (auth.uid() = id or public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Policies for 'public.courts'
-- ------------------------------------------------------------------------------

-- SELECT: Everyone can view courts
create policy "Courts are viewable by everyone"
on public.courts for select
using (true);

-- INSERT/UPDATE/DELETE: Only Admins
create policy "Admins can manage courts"
on public.courts for all
using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. Policies for 'public.reservations'
-- ------------------------------------------------------------------------------

-- SELECT: Everyone can view schedule (to check availability)
create policy "Reservations are viewable by everyone"
on public.reservations for select
using (true);

-- INSERT: Only Authenticated Users (and Admins)
create policy "Authenticated users can create reservations"
on public.reservations for insert
to authenticated
with check (
    -- User is inserting for themselves OR User is Admin
    auth.uid() = user_id or public.is_admin()
);

-- UPDATE: Users can update OWN reservations; Admins can update ANY
create policy "Users update own, Admins update all"
on public.reservations for update
using (
    (auth.uid() = user_id) or public.is_admin()
);

-- DELETE: Users can cancel OWN reservations; Admins can delete ANY
create policy "Users delete own, Admins delete all"
on public.reservations for delete
using (
    (auth.uid() = user_id) or public.is_admin()
);

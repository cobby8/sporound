-- Enable Row Level Security
alter default privileges revoke execute on functions from public;

-- 1. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  phone text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 2. Courts Table (Static data for courts)
create table public.courts (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- 'pink', 'mint'
  type text, -- 'full', 'half'
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Courts
alter table public.courts enable row level security;

create policy "Courts are viewable by everyone."
  on public.courts for select
  using ( true );

-- 3. Reservations Table
create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null, -- Nullable for manual admin entry
  court_id uuid references public.courts(id) on delete cascade not null,
  
  -- Time slot info
  date date not null, -- '2024-05-20'
  start_time time not null, -- '14:00:00'
  end_time time not null, -- '16:00:00'
  
  status text default 'pending' check (status in ('pending', 'confirmed', 'canceled', 'rejected')),
  purpose text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Reservations
alter table public.reservations enable row level security;

create policy "Reservations are viewable by everyone"
  on public.reservations for select
  using ( true );

create policy "Users can create reservations"
  on public.reservations for insert
  with check ( auth.uid() = user_id );

-- 4. Initial Seed Data
insert into public.courts (name, type, description) values
  ('pink', 'full', '핑크색 바닥의 풀 코트'),
  ('mint', 'full', '민트색 바닥의 풀 코트');

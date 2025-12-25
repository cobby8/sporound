-- ==============================================================================
-- Sporound Pricing Automation Schema
-- ==============================================================================
-- Defines tables for storing dynamic pricing rules and bundled packages.
-- Enables the "Aggressive Tiered Pricing" strategy.

-- ------------------------------------------------------------------------------
-- 1. Price Rules Table (For dynamic hourly rates)
-- ------------------------------------------------------------------------------
create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- e.g., "Super Off-Peak (Pink)"
  court_id uuid references public.courts(id), -- Specific court (Null = all courts, but we likely want specific)
  
  -- Conditions
  days_of_week int[] not null,      -- e.g., [1, 2, 3, 4, 5] (Mon-Fri). 0=Sun, 6=Sat
  start_time time not null,         -- e.g., '23:00'
  end_time time not null,           -- e.g., '08:00'
  
  -- Pricing
  price_per_hour integer not null,  -- e.g., 22000
  priority integer default 0,       -- Higher priority wins if ranges overlap
  
  -- Metadata
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Price Rules
alter table public.price_rules enable row level security;

-- Public Read (Needed for frontend calculation)
create policy "Price rules are viewable by everyone"
  on public.price_rules for select
  using (true);

-- Admin Write
create policy "Admins can manage price rules"
  on public.price_rules for all
  using (public.is_admin());


-- ------------------------------------------------------------------------------
-- 2. Packages Table (For bundled block reservations)
-- ------------------------------------------------------------------------------
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- e.g., "Weekday Morning Pass"
  court_id uuid references public.courts(id),
  
  -- Package Definition
  days_of_week int[] not null,      -- Valid days for this package
  start_time time not null,         -- e.g., '06:00'
  end_time time not null,           -- e.g., '10:00'
  total_price integer not null,     -- e.g., 160000 (Fixed total price)
  
  -- Display Info
  badge_text text,                  -- e.g., "53% OFF"
  description text,                 -- e.g., "06:00 ~ 10:00 (4 Hours)"
  
  -- Metadata
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Packages
alter table public.packages enable row level security;

-- Public Read
create policy "Packages are viewable by everyone"
  on public.packages for select
  using (true);

-- Admin Write
create policy "Admins can manage packages"
  on public.packages for all
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Initial Seed Data (Based on Pricing Strategy Report)
-- ------------------------------------------------------------------------------
-- Note: You can run this block to seed the initial rules.
-- Assumption: Court IDs need to be known. We will use subqueries to find them by name.

do $$
declare
  pink_id uuid;
  mint_id uuid;
begin
  select id into pink_id from public.courts where name = 'pink' limit 1;
  select id into mint_id from public.courts where name = 'mint' limit 1;

  if pink_id is not null and mint_id is not null then
    
    -- ==================================================================
    -- Delete existing data to avoid duplicates during re-runs
    -- ==================================================================
    delete from public.price_rules;
    delete from public.packages;

    -- ==================================================================
    -- PINK COURT RULES
    -- ==================================================================
    -- SS: Super Off-Peak (23:00-08:00) -> 22,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Pink) - Night', pink_id, '{0,1,2,3,4,5,6}', '23:00', '23:59:59', 22000, 10);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Pink) - Morning', pink_id, '{0,1,2,3,4,5,6}', '00:00', '08:00', 22000, 10);

    -- S: Off-Peak (08:00-15:00) -> 43,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S Tier (Pink)', pink_id, '{0,1,2,3,4,5,6}', '08:00', '15:00', 43000, 5);

    -- A: Shoulder (15:00-18:00) -> 60,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Pink)', pink_id, '{0,1,2,3,4,5,6}', '15:00', '18:00', 60000, 5);

    -- B: Peak (Rest is default, or explicit) -> 85,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B Tier (Pink)', pink_id, '{0,1,2,3,4,5,6}', '18:00', '23:00', 85000, 1);


    -- ==================================================================
    -- MINT COURT RULES
    -- ==================================================================
    -- SS: Super Off-Peak (23:00-08:00) -> 19,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Mint) - Night', mint_id, '{0,1,2,3,4,5,6}', '23:00', '23:59:59', 19000, 10);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Mint) - Morning', mint_id, '{0,1,2,3,4,5,6}', '00:00', '08:00', 19000, 10);

    -- S: Off-Peak (08:00-15:00) -> 38,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S Tier (Mint)', mint_id, '{0,1,2,3,4,5,6}', '08:00', '15:00', 38000, 5);

    -- A: Shoulder (15:00-18:00) -> 53,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Mint)', mint_id, '{0,1,2,3,4,5,6}', '15:00', '18:00', 53000, 5);

    -- B: Peak -> 75,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B Tier (Mint)', mint_id, '{0,1,2,3,4,5,6}', '18:00', '23:00', 75000, 1);


    -- ==================================================================
    -- PACKAGES (Example for Pink Court)
    -- ==================================================================
    -- Weekday Morning (06-10) -> 160,000 (Available Mon-Fri)
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 모닝 통대관', pink_id, '{1,2,3,4,5}', '06:00', '10:00', 160000, '53% SALE', '평일 아침 4시간 통대관 특가');

    -- Weekday All-Day (10-16) -> 300,000
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 낮 알뜰 패키지', pink_id, '{1,2,3,4,5}', '10:00', '16:00', 300000, '41% SALE', '낮 시간 6시간 여유로운 이용');
    
    -- Weekday Night (23-06) -> 250,000
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('심야 무제한 올나잇', pink_id, '{1,2,3,4,5}', '23:00', '06:00', 250000, '58% SALE', '밤샘 농구 매니아를 위한 패키지');

  end if;
end $$;

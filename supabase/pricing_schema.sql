-- ==============================================================================
-- Sporound Pricing Automation Schema
-- ==============================================================================
-- Defines tables for storing dynamic pricing rules and bundled packages.
-- Enables the "Aggressive Tiered Pricing" strategy.

-- ------------------------------------------------------------------------------
-- 1. Price Rules Table (For dynamic hourly rates)
-- ------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------
-- 1. Price Rules Table (For dynamic hourly rates)
-- ------------------------------------------------------------------------------
create table if not exists public.price_rules (
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
drop policy if exists "Price rules are viewable by everyone" on public.price_rules;
create policy "Price rules are viewable by everyone"
  on public.price_rules for select
  using (true);

-- Admin Write
drop policy if exists "Admins can manage price rules" on public.price_rules;
create policy "Admins can manage price rules"
  on public.price_rules for all
  using (public.is_admin());


-- ------------------------------------------------------------------------------
-- 2. Packages Table (For bundled block reservations)
-- ------------------------------------------------------------------------------
create table if not exists public.packages (
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
drop policy if exists "Packages are viewable by everyone" on public.packages;
create policy "Packages are viewable by everyone"
  on public.packages for select
  using (true);

-- Admin Write
drop policy if exists "Admins can manage packages" on public.packages;
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
    -- PINK COURT RULES (Peak: 85,000)
    -- ==================================================================
    
    -- [PINK WEEKDAY] (Mon-Fri)
    -- SS: Super Off-Peak (01:00-08:00) -> 25,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Pink) - Night', pink_id, '{1,2,3,4,5}', '01:00', '08:00', 25000, 10);
    
    -- S: Off-Peak (08:00-15:00) -> 50,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S Tier (Pink)', pink_id, '{1,2,3,4,5}', '08:00', '15:00', 50000, 5);

    -- A: Shoulder (15:00-18:00) -> 60,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Pink)', pink_id, '{1,2,3,4,5}', '15:00', '18:00', 60000, 5);

    -- A: Shoulder Late Night (23:00-01:00) -> 60,000 (Split for safety)
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Pink) - Late Night 1', pink_id, '{1,2,3,4,5}', '23:00', '23:59:59', 60000, 5);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Pink) - Late Night 2', pink_id, '{1,2,3,4,5}', '00:00', '01:00', 60000, 5);

    -- B: Peak (Rest/Default) -> 85,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B Tier (Pink)', pink_id, '{1,2,3,4,5}', '18:00', '23:00', 85000, 1);


    -- [PINK WEEKEND] (Sat, Sun)
    -- S-Weekend: Off-Peak (06:00-09:00) -> 60,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S-Weekend (Pink)', pink_id, '{0,6}', '06:00', '09:00', 60000, 10);

    -- B-Peak: (09:00-22:00) -> 85,000 (Default B Tier applies, but explicit for clarity)
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B-Weekend (Pink)', pink_id, '{0,6}', '09:00', '22:00', 85000, 5);

    -- A-Weekend: Shoulder (22:00-02:00) -> 75,000 (Slight Discount)
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A-Weekend (Pink) - Night 1', pink_id, '{0,6}', '22:00', '23:59:59', 75000, 8);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A-Weekend (Pink) - Night 2', pink_id, '{0,6}', '00:00', '02:00', 75000, 8);


    -- ==================================================================
    -- MINT COURT RULES (Peak: 75,000)
    -- ==================================================================
    
    -- [MINT WEEKDAY]
    -- SS: Super Off-Peak (01:00-08:00) -> 22,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('SS Tier (Mint) - Night', mint_id, '{1,2,3,4,5}', '01:00', '08:00', 22000, 10);

    -- S: Off-Peak (08:00-15:00) -> 40,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S Tier (Mint)', mint_id, '{1,2,3,4,5}', '08:00', '15:00', 40000, 5);

    -- A: Shoulder (15:00-18:00) -> 53,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Mint)', mint_id, '{1,2,3,4,5}', '15:00', '18:00', 53000, 5);

    -- A: Shoulder Late Night (23:00-01:00) -> 53,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Mint) - Late Night 1', mint_id, '{1,2,3,4,5}', '23:00', '23:59:59', 53000, 5);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A Tier (Mint) - Late Night 2', mint_id, '{1,2,3,4,5}', '00:00', '01:00', 53000, 5);

    -- B: Peak -> 75,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B Tier (Mint)', mint_id, '{1,2,3,4,5}', '18:00', '23:00', 75000, 1);

    -- [MINT WEEKEND]
    -- S-Weekend: Off-Peak (06:00-09:00) -> 53,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('S-Weekend (Mint)', mint_id, '{0,6}', '06:00', '09:00', 53000, 10);

    -- B-Peak: (09:00-22:00) -> 75,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('B-Weekend (Mint)', mint_id, '{0,6}', '09:00', '22:00', 75000, 5);
    
    -- A-Weekend: Shoulder (22:00-02:00) -> 65,000
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A-Weekend (Mint) - Night 1', mint_id, '{0,6}', '22:00', '23:59:59', 65000, 8);
    insert into public.price_rules (name, court_id, days_of_week, start_time, end_time, price_per_hour, priority)
    values ('A-Weekend (Mint) - Night 2', mint_id, '{0,6}', '00:00', '02:00', 65000, 8);


    -- ==================================================================
    -- WEEKDAY PACKAGES
    -- ==================================================================
    -- Pink
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 모닝 통대관', pink_id, '{1,2,3,4,5}', '06:00', '10:00', 120000, 'BEST', '평일 아침 4시간 통대관 특가');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 낮 알뜰 패키지', pink_id, '{1,2,3,4,5}', '10:00', '16:00', 240000, 'HOT', '낮 시간 6시간 여유로운 이용');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('심야 무제한 올나잇', pink_id, '{1,2,3,4,5}', '23:00', '06:00', 140000, 'NIGHT', '밤샘 농구 매니아를 위한 패키지');

    -- Mint
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 모닝 통대관', mint_id, '{1,2,3,4,5}', '06:00', '10:00', 100000, 'BEST', '평일 아침 4시간 통대관 특가');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('평일 낮 알뜰 패키지', mint_id, '{1,2,3,4,5}', '10:00', '16:00', 200000, 'HOT', '낮 시간 6시간 여유로운 이용');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('심야 무제한 올나잇', mint_id, '{1,2,3,4,5}', '23:00', '06:00', 120000, 'NIGHT', '밤샘 농구 매니아를 위한 패키지');

    -- ==================================================================
    -- WEEKEND PACKAGES (NEW)
    -- ==================================================================
    -- Weekend Morning Club (06-10)
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('주말 모닝 클럽', pink_id, '{0,6}', '06:00', '10:00', 210000, 'EARLY BIRD', '주말 아침 동호회/모임을 위한 패키지');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('주말 모닝 클럽', mint_id, '{0,6}', '06:00', '10:00', 190000, 'EARLY BIRD', '주말 아침 동호회/모임을 위한 패키지');

    -- Weekend Half-Day Event (13-18)
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('주말 하프데이 통대관', pink_id, '{0,6}', '13:00', '18:00', 400000, 'EVENT', '대회/행사를 위한 5시간 여유로운 대관');
    insert into public.packages (name, court_id, days_of_week, start_time, end_time, total_price, badge_text, description)
    values ('주말 하프데이 통대관', mint_id, '{0,6}', '13:00', '18:00', 350000, 'EVENT', '대회/행사를 위한 5시간 여유로운 대관');

  end if;
end $$;

-- Add new columns for Phase 4 features

-- 1. people_count (인원 수)
alter table public.reservations 
add column if not exists people_count integer default 1;

-- 2. total_price (총 대관료)
alter table public.reservations 
add column if not exists total_price integer default 0;

-- 3. purpose (사용 목적) - already exists but checking just in case
-- alter table public.reservations add column if not exists purpose text;

-- 4. status check constraint update (if needed, but 'confirmed'/'rejected' etc are already defined)

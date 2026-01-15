-- CMS Tables

-- Drop tables if they exist to ensure fresh schema with correct columns
drop table if exists public.coaches;
drop table if exists public.facilities;
drop table if exists public.site_config;

-- 1. Coaches
create table public.coaches (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text,
  description text,
  image_url text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Facilities
create table public.facilities (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description jsonb, -- Array of strings/features
  image_url text, -- For storing a single image path
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Site Config (Key-Value)
create table public.site_config (
  key text primary key,
  value jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.coaches enable row level security;
alter table public.facilities enable row level security;
alter table public.site_config enable row level security;

-- Policies (Drop first to avoid duplication error if re-run)
drop policy if exists "Public can view coaches" on public.coaches;
create policy "Public can view coaches" on public.coaches for select using (true);

drop policy if exists "Public can view facilities" on public.facilities;
create policy "Public can view facilities" on public.facilities for select using (true);

drop policy if exists "Public can view site_config" on public.site_config;
create policy "Public can view site_config" on public.site_config for select using (true);

-- Admin Policies
drop policy if exists "Admins can manage coaches" on public.coaches;
create policy "Admins can manage coaches" on public.coaches for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Admins can manage facilities" on public.facilities;
create policy "Admins can manage facilities" on public.facilities for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Admins can manage site_config" on public.site_config;
create policy "Admins can manage site_config" on public.site_config for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Initial Data Injection (Migrating hardcoded content)
-- Uses ON CONFLICT to avoid errors on re-run

-- Coaches
insert into public.coaches (name, role, description, order_index) values
('정훈 코치님', '유소년 / 대표팀 담당', '기본기가 탄탄해야 실력이 늡니다. 즐겁지만 진지하게 가르칩니다.', 1),
('창민 코치님', '중고등 / 성인반 담당', '열정만 가지고 오세요. 나머지는 제가 만들어 드립니다.', 2)
on conflict do nothing;

-- Facilities
insert into public.facilities (title, description, order_index) values
('제 1코트 (핑크)', '["국제 규격 농구 코트", "충격 흡수 최고급 마루", "냉난방 완비"]'::jsonb, 1),
('제 2코트 (민트)', '["3x3 전용 규격", "개인 연습 최적화", "독립된 연습 공간"]'::jsonb, 2)
on conflict do nothing;

-- Site Config: Rental Fees
insert into public.site_config (key, value) values
('rental_fees', '[
  {"category": "일일대관", "desc": "기본 대관", "pink_price": "85,000원", "mint_price": "75,000원", "note": "4시간 이상 시 대기실 무료"},
  {"category": "정기대관", "desc": "월 단위 계약", "pink_price": "75,000원", "mint_price": "65,000원", "note": "-"},
  {"category": "정기대관", "desc": "3개월 단위 계약", "pink_price": "70,000원", "mint_price": "60,000원", "note": "-"}
]'::jsonb)
on conflict(key) do update set value = EXCLUDED.value;

-- Site Config: Usage Rules
insert into public.site_config (key, value) values
('usage_rules', '{
  "attire": ["체육관 내에서는 반드시 전용 실내 운동화를 착용해야 합니다. (외부 신발 착용 금지)", "개인 수건 및 위생 용품을 지참하는 것을 권장합니다."],
  "safety": ["운동 전 충분한 준비 운동으로 부상을 예방해주세요.", "시설 파손 시 배상 책임이 발생할 수 있으니 시설물을 소중히 다뤄주세요.", "대관 시간 내 준비 및 정리 시간이 포함되어 있습니다. 다음 사용자를 위해 시간을 엄수해 주세요.", "음주자, 전염성 질환자 등 타인에게 피해를 줄 수 있는 경우 입장이 제한됩니다."],
  "cleanliness": ["체육관 내 음식물 반입은 원칙적으로 금지됩니다. (물, 뚜껑 있는 음료 제외)", "발생한 쓰레기는 반드시 지정된 장소에 분리수거 해주세요."]
}'::jsonb)
on conflict(key) do update set value = EXCLUDED.value;

-- Site Config: Parking
insert into public.site_config (key, value) values
('parking_info', '{
  "text": "건물 전면 및 지정된 주차 구역을 이용해 주세요. 주차 공간이 협소할 수 있으니 카풀을 권장합니다.",
  "image_url": "/parking_map_placeholder.png"
}'::jsonb)
on conflict(key) do update set value = EXCLUDED.value;

-- Site Config: Gallery (Initial placeholders)
insert into public.site_config (key, value) values
('gallery_images', '[]'::jsonb)
on conflict(key) do nothing;

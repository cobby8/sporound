-- Add group_id for grouping recurring reservations
alter table public.reservations 
add column if not exists group_id uuid null;

-- Add recurrence_rule to store the configuration (days, start/end date)
alter table public.reservations 
add column if not exists recurrence_rule jsonb null;

-- Add index for faster lookup by group
create index if not exists idx_reservations_group_id on public.reservations(group_id);

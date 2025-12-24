-- Add columns for Enhanced Recurring Reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS guest_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS guest_phone text DEFAULT NULL;

-- Ensure user_id is nullable (it should be already, but verifying constraint)
ALTER TABLE reservations ALTER COLUMN user_id DROP NOT NULL;

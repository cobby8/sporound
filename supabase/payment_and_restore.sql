-- 1. payment_status enum type (if not exists)
-- Using check constraint instead of enum for flexibility
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid', 'adjustment_requested')) DEFAULT 'unpaid';

-- 2. adjustment_reason
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 3. final_fee
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS final_fee INTEGER;

-- 4. Restore Function Logic
-- Since restoring involves inserting into profiles, we ensure the RLS allows admins to insert into profiles.
-- We already added "Admins can update all profiles" and "Admins can delete profiles".
-- We need INSERT permission for Admins on profiles (usually blocked except for self).

CREATE POLICY "Admins can insert profiles (Restore)"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- We also need to ensure the user (if they still exist in Auth) can "own" this profile again.
-- The standard policy "Users can insert their own profile" covers self-signup.
-- Admin restore needs the above policy.

-- 5. Enable admins to delete from deleted_profiles (to clean up after restore)
CREATE POLICY "Admins can delete from deleted_profiles"
ON public.deleted_profiles
FOR DELETE
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

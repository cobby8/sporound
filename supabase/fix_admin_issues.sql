-- 1. FIX: Update Trigger to capture Phone Number from Auth Metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '사용자'),
    COALESCE(new.phone, new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'contact'), -- FIX: Capture Phone
    'user'
  );
  RETURN new;
END;
$$;

-- 2. FIX: Backfill missing phone numbers for existing users
UPDATE public.profiles p
SET phone = COALESCE(u.phone, u.raw_user_meta_data->>'phone', u.raw_user_meta_data->>'mobile')
FROM auth.users u
WHERE p.id = u.id AND p.phone IS NULL;

-- 3. FIX: Create 'deleted_profiles' table for archiving
CREATE TABLE IF NOT EXISTS public.deleted_profiles (
    id UUID PRIMARY KEY, -- Keep original ID
    email TEXT,
    name TEXT,
    phone TEXT,
    role TEXT,
    reason TEXT, -- Withdrawal reason
    original_created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    backup_data JSONB -- Any extra data
);

-- 4. FIX: Enable RLS for deleted_profiles and allow Admin access
ALTER TABLE public.deleted_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted profiles"
ON public.deleted_profiles
FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admins can insert deleted profiles"
ON public.deleted_profiles
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 5. FIX: Grant Admins permission to UPDATE and DELETE profiles (Fixes Promotion & Withdrawal issues)
-- Allow Admins to UPDATE any profile (for Promotion/Role Change)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Allow Admins to DELETE any profile (for Withdrawal)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view all profiles
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow insert (for triggers or manual inserts)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Backfill profiles from auth.users
-- This ensures all registered users have a profile entry
INSERT INTO public.profiles (user_id, name, matricula, role, loja)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'name', email),
    COALESCE(raw_user_meta_data->>'matricula', 'N/A'),
    COALESCE(raw_user_meta_data->>'role', 'CADASTRO'),
    COALESCE(raw_user_meta_data->>'loja', '')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;


-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially restrictive policies or duplicates
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a permissive policy for authenticated users to view all profiles
-- This is required for the "Configurações de Acesso" page to list all users
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Re-run backfill to ensure all users have profiles
-- This fixes the issue where users exist in auth.users but not in profiles table
INSERT INTO public.profiles (user_id, matricula, name, loja, role)
SELECT 
  id, 
  raw_user_meta_data->>'matricula',
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'loja',
  COALESCE(raw_user_meta_data->>'role', 'CADASTRO')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

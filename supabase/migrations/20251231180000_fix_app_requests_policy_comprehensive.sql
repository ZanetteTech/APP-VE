
-- Revert to checking profiles table (but with CORRECT user_id column)
-- This ensures that if the user's JWT is stale (doesn't have role yet), 
-- but the profile is updated, they can still access.

DROP POLICY IF EXISTS "Users can view their own requests or GESTAO_APP can view all" ON public.app_requests;

CREATE POLICY "Users can view their own requests or GESTAO_APP can view all"
ON public.app_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'GESTAO_APP' OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

-- Fix update policy as well
DROP POLICY IF EXISTS "GESTAO_APP can update any request" ON public.app_requests;

CREATE POLICY "GESTAO_APP can update any request"
ON public.app_requests
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'GESTAO_APP' OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

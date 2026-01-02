
-- Update policies to use JWT metadata for role check
-- This avoids issues where profiles table might be out of sync with user_metadata

DROP POLICY IF EXISTS "Users can view their own requests or GESTAO_APP can view all" ON public.app_requests;

CREATE POLICY "Users can view their own requests or GESTAO_APP can view all"
ON public.app_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'GESTAO_APP'
);

DROP POLICY IF EXISTS "GESTAO_APP can update any request" ON public.app_requests;

CREATE POLICY "GESTAO_APP can update any request"
ON public.app_requests
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'GESTAO_APP'
);

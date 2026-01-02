
-- Re-create SELECT policy with CORRECT user_id check
DROP POLICY IF EXISTS "Users can view their own requests or GESTAO_APP can view all" ON public.app_requests;

CREATE POLICY "Users can view their own requests or GESTAO_APP can view all"
ON public.app_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

-- Fix update policy too just in case
DROP POLICY IF EXISTS "GESTAO_APP can update any request" ON public.app_requests;

CREATE POLICY "GESTAO_APP can update any request"
ON public.app_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

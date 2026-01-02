
-- Reload schema cache to ensure PostgREST knows about the new column
NOTIFY pgrst, 'reload schema';

-- Ensure permissions are granted
GRANT ALL ON public.app_requests TO authenticated;
GRANT ALL ON public.app_requests TO service_role;

-- Re-create SELECT policy with explicit casting and table reference
DROP POLICY IF EXISTS "Users can view their own requests or GESTAO_APP can view all" ON public.app_requests;

CREATE POLICY "Users can view their own requests or GESTAO_APP can view all"
ON public.app_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

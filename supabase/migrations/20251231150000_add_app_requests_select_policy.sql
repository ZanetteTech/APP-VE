
-- Enable RLS on app_requests
ALTER TABLE public.app_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Authenticated users can insert app_requests" ON public.app_requests;
DROP POLICY IF EXISTS "Users can view their own requests or GESTAO_APP can view all" ON public.app_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.app_requests;
DROP POLICY IF EXISTS "GESTAO_APP can update any request" ON public.app_requests;

-- Re-create INSERT policy
CREATE POLICY "Authenticated users can insert app_requests" 
ON public.app_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create SELECT policy
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

-- Create UPDATE policy for GESTAO_APP
CREATE POLICY "GESTAO_APP can update any request"
ON public.app_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'GESTAO_APP'
  )
);

-- Create UPDATE policy for Users (for 'notified' flag)
CREATE POLICY "Users can update their own requests"
ON public.app_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

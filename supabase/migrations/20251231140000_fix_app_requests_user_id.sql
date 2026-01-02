-- Ensure user_id column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_requests' AND column_name = 'user_id') THEN
        ALTER TABLE public.app_requests ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Update policies to ensure they work with user_id
DROP POLICY IF EXISTS "Authenticated users can insert app_requests" ON public.app_requests;
CREATE POLICY "Authenticated users can insert app_requests" 
ON public.app_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.app_requests ENABLE ROW LEVEL SECURITY;

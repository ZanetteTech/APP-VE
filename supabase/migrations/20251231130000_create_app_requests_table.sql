-- Create app_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    placa TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    sigla_patio TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    user_id UUID REFERENCES auth.users(id),
    notified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.app_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can view all app_requests" ON public.app_requests;
DROP POLICY IF EXISTS "Authenticated users can insert app_requests" ON public.app_requests;
DROP POLICY IF EXISTS "Authenticated users can update app_requests" ON public.app_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.app_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.app_requests;

-- Policies

-- Allow authenticated users to view all requests (simplification for dashboard visibility)
CREATE POLICY "Authenticated users can view all app_requests" 
ON public.app_requests 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert requests
CREATE POLICY "Authenticated users can insert app_requests" 
ON public.app_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update requests (for approval/rejection logic)
CREATE POLICY "Authenticated users can update app_requests" 
ON public.app_requests 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT ALL ON public.app_requests TO authenticated;

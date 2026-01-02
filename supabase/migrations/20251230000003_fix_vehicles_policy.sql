DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view all vehicles" 
ON public.vehicles 
FOR SELECT 
TO authenticated 
USING (true);

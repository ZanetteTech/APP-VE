-- Allow authenticated users to update vehicles (needed for solicitation and exit by any user)
CREATE POLICY "Authenticated users can update any vehicle" 
ON public.vehicles 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

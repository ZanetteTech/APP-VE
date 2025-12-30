-- Ensure columns exist (just in case previous migration failed)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS solicitante_nome TEXT,
ADD COLUMN IF NOT EXISTS solicitacao_data_retirada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS solicitacao_destino TEXT,
ADD COLUMN IF NOT EXISTS solicitacao_data_criacao TIMESTAMP WITH TIME ZONE;

-- Drop restrictive update policy if it exists
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;

-- Drop my previous attempt just to be clean
DROP POLICY IF EXISTS "Authenticated users can update any vehicle" ON public.vehicles;

-- Create the permissive update policy
CREATE POLICY "Authenticated users can update any vehicle" 
ON public.vehicles 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

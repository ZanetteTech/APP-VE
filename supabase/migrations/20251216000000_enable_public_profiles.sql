-- Permitir leitura pública da tabela profiles para listar matrículas no Login
-- Isso é necessário para que o campo de seleção funcione para usuários não logados.

-- Remove a política restritiva anterior se existir (opcional, pois políticas são aditivas, mas limpa a lógica)
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Cria uma nova política permitindo leitura pública
CREATE POLICY "Public profiles read access" 
ON public.profiles 
FOR SELECT 
USING (true);

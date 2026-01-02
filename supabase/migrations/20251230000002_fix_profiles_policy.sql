-- Permitir que usuários autenticados insiram seus próprios perfis
-- Isso é necessário porque o registro é feito no frontend após o signUp

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Opcionalmente, permitir update também para o próprio usuário
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

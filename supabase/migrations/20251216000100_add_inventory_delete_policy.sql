-- Adicionar política de exclusão para sessões de inventário
CREATE POLICY "Users can delete own inventory sessions" ON public.inventory_sessions
  FOR DELETE USING (auth.uid() = user_id);

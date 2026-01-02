
-- 1. Create system_features table (Dependency for user_feature_states)
CREATE TABLE IF NOT EXISTS system_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial features if they don't exist
INSERT INTO system_features (feature_key, label, description) VALUES
  ('menu_nova_entrada', 'Menu: Nova Entrada', 'Botão para registrar nova entrada de veículo'),
  ('menu_inclusao_placas', 'Menu: Inclusão Placas', 'Botão para inclusão de placas via link externo'),
  ('menu_relatorios', 'Menu: Relatórios', 'Acesso aos relatórios do sistema'),
  ('menu_balanco', 'Menu: Balanço Mensal', 'Acesso ao balanço financeiro'),
  ('menu_inventario', 'Menu: Inventário', 'Acesso à lista de inventário'),
  ('menu_telefone', 'Menu: Telefone', 'Gerenciador de telefones'),
  ('vehicle_ver', 'Veículo: Ver Detalhes', 'Visualizar detalhes do veículo'),
  ('vehicle_pdf', 'Veículo: Gerar PDF', 'Gerar comprovante em PDF'),
  ('vehicle_solicitar', 'Veículo: Solicitar', 'Solicitar veículo (status entrada)'),
  ('vehicle_saida', 'Veículo: Registrar Saída', 'Registrar saída do veículo'),
  ('vehicle_reverter', 'Veículo: Reverter Saída', 'Reverter status de saída para entrada'),
  ('vehicle_editar', 'Veículo: Editar', 'Editar dados do veículo'),
  ('vehicle_whatsapp', 'Veículo: WhatsApp', 'Compartilhar via WhatsApp'),
  ('vehicle_excluir', 'Veículo: Excluir', 'Excluir registro do veículo')
ON CONFLICT (feature_key) DO NOTHING;

-- 2. Create user_feature_states table (The missing table causing error)
CREATE TABLE IF NOT EXISTS user_feature_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feature_key TEXT REFERENCES system_features(feature_key) NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, feature_key)
);

ALTER TABLE user_feature_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can view user feature states"
ON user_feature_states FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can insert user feature states"
ON user_feature_states FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update user feature states" ON user_feature_states;
CREATE POLICY "Authenticated users can update user feature states"
ON user_feature_states FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON user_feature_states TO authenticated;


-- 3. Create app_requests table (Referenced in delete_users)
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

ALTER TABLE public.app_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.app_requests TO authenticated;


-- 4. Create inventory tables (Referenced in delete_users)
CREATE TABLE IF NOT EXISTS public.inventory_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_vehicles INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
);

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.inventory_sessions(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  placa TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;


-- 5. Create or Update delete_users function
CREATE OR REPLACE FUNCTION public.delete_users(target_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete from related tables
  -- We check if tables exist before deleting just in case, or we rely on them existing now
  
  DELETE FROM public.user_feature_states WHERE user_id = ANY(target_user_ids);
  DELETE FROM public.app_requests WHERE user_id = ANY(target_user_ids);
  DELETE FROM public.inventory_sessions WHERE user_id = ANY(target_user_ids);
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE user_id = ANY(target_user_ids);
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = ANY(target_user_ids);
END;
$$;

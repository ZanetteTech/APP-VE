-- Create table
CREATE TABLE IF NOT EXISTS system_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE system_features ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view system features" ON system_features;
CREATE POLICY "Authenticated users can view system features"
ON system_features FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can update system features" ON system_features;
CREATE POLICY "Authenticated users can update system features"
ON system_features FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON system_features TO authenticated;

-- Insert default data
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
ON CONFLICT (feature_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Create system_features table if it doesn't exist (it probably does, but good to be safe)
CREATE TABLE IF NOT EXISTS public.system_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert 'menu_solicitacoes' feature if it doesn't exist
INSERT INTO public.system_features (feature_key, label, description, is_active)
VALUES 
    ('menu_solicitacoes', 'Menu Solicitações', 'Exibe o item "Solicitações" no menu dropdown para aprovação de cadastros.', true)
ON CONFLICT (feature_key) DO UPDATE 
SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description;

-- Grant access to authenticated users
GRANT SELECT ON public.system_features TO authenticated;
GRANT ALL ON public.system_features TO service_role;

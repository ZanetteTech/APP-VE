-- Adicionar campos para solicitação de saída na tabela vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS solicitante_nome TEXT,
ADD COLUMN IF NOT EXISTS solicitacao_data_retirada TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS solicitacao_destino TEXT,
ADD COLUMN IF NOT EXISTS solicitacao_data_criacao TIMESTAMP WITH TIME ZONE;

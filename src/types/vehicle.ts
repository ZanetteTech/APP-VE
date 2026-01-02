export interface VehicleEntry {
  id: string;
  user_id?: string;
  placa: string;
  modelo: string;
  origem: string;
  tipo_entrada?: string;
  guincho: string;
  placa_guincho?: string;
  motorista: string;
  chave_principal: boolean;
  chave_reserva: boolean;
  step: boolean;
  macaco: boolean;
  triangulo: boolean;
  chave_roda: boolean;
  observacoes: string;
  fotos: string[];
  foto_chassi: string;
  data_entrada: string;
  status: 'entrada' | 'saida';
  // Campos de saída
  destino?: string;
  empresa_guincho_saida?: string;
  placa_guincho_saida?: string;
  motorista_saida?: string;
  solicitante?: string;
  data_saida?: string;
  created_by_matricula?: string;
  operator_name?: string;
  exit_operator_name?: string;
  loja?: string;
  // Campos de solicitação de saída
  solicitante_nome?: string;
  solicitacao_data_retirada?: string;
  solicitacao_destino?: string;
  solicitacao_data_criacao?: string;
}

export interface PhoneNumber {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  created_at: string;
}

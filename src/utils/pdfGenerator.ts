import { VehicleEntry } from '@/types/vehicle';

export const generatePDF = (vehicle: VehicleEntry) => {
  const items = [];
  if (vehicle.chave_principal) items.push('CHAVE PRINCIPAL');
  if (vehicle.chave_reserva) items.push('CHAVE RESERVA');
  if (vehicle.step) items.push('STEP');
  if (vehicle.macaco) items.push('MACACO');
  if (vehicle.triangulo) items.push('TRIÂNGULO');
  if (vehicle.chave_roda) items.push('CHAVE DE RODA');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>RELATÓRIO - ${vehicle.placa}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a472a; padding-bottom: 20px; }
        .header h1 { color: #1a472a; margin: 0; }
        .header p { color: #666; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #1a472a; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .row { display: flex; margin-bottom: 8px; }
        .label { font-weight: bold; width: 180px; color: #555; }
        .value { flex: 1; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-entrada { background: #dcfce7; color: #166534; }
        .status-saida { background: #fee2e2; color: #991b1b; }
        .items { display: flex; flex-wrap: wrap; gap: 8px; }
        .item { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
        .photo { width: 100%; height: 150px; object-fit: cover; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SISTEMA DE PÁTIO</h1>
        <p>RELATÓRIO DE VEÍCULO</p>
      </div>
      
      <div class="section">
        <h2>DADOS DO VEÍCULO</h2>
        <div class="row"><span class="label">PLACA:</span><span class="value">${vehicle.placa}</span></div>
        <div class="row"><span class="label">MODELO:</span><span class="value">${vehicle.modelo}</span></div>
        <div class="row"><span class="label">ORIGEM:</span><span class="value">${vehicle.origem}</span></div>
        <div class="row"><span class="label">LANÇADO POR:</span><span class="value">${vehicle.created_by_matricula || 'N/A'}</span></div>
        <div class="row"><span class="label">STATUS:</span><span class="value"><span class="status ${vehicle.status === 'entrada' ? 'status-entrada' : 'status-saida'}">${vehicle.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA REALIZADA'}</span></span></div>
      </div>

      <div class="section">
        <h2>DADOS DE ENTRADA</h2>
        <div class="row"><span class="label">GUINCHO:</span><span class="value">${vehicle.guincho}</span></div>
        ${vehicle.placa_guincho ? `<div class="row"><span class="label">PLACA GUINCHO:</span><span class="value">${vehicle.placa_guincho}</span></div>` : ''}
        <div class="row"><span class="label">MOTORISTA:</span><span class="value">${vehicle.motorista}</span></div>
        <div class="row"><span class="label">DATA:</span><span class="value">${new Date(vehicle.data_entrada).toLocaleString('pt-BR')}</span></div>
      </div>

      <div class="section">
        <h2>ITENS RECEBIDOS</h2>
        <div class="items">
          ${items.length > 0 ? items.map(item => `<span class="item">${item}</span>`).join('') : '<span class="value">NENHUM ITEM REGISTRADO</span>'}
        </div>
      </div>

      ${vehicle.observacoes ? `
      <div class="section">
        <h2>OBSERVAÇÕES</h2>
        <p>${vehicle.observacoes}</p>
      </div>
      ` : ''}

      ${vehicle.fotos && vehicle.fotos.length > 0 ? `
      <div class="section">
        <h2>FOTOS DO VEÍCULO</h2>
        <div class="photos">
          ${vehicle.fotos.map((foto, index) => `<img src="${foto}" alt="FOTO ${index + 1}" class="photo" />`).join('')}
        </div>
      </div>
      ` : ''}

      ${vehicle.foto_chassi ? `
      <div class="section">
        <h2>FOTO DO CHASSI</h2>
        <img src="${vehicle.foto_chassi}" alt="CHASSI" class="photo" style="width: 300px;" />
      </div>
      ` : ''}

      ${vehicle.status === 'saida' ? `
      <div class="section">
        <h2>DADOS DE SAÍDA</h2>
        <div class="row"><span class="label">DESTINO:</span><span class="value">${vehicle.destino}</span></div>
        <div class="row"><span class="label">EMPRESA GUINCHO:</span><span class="value">${vehicle.empresa_guincho_saida}</span></div>
        <div class="row"><span class="label">PLACA GUINCHO:</span><span class="value">${vehicle.placa_guincho_saida || '-'}</span></div>
        <div class="row"><span class="label">MOTORISTA:</span><span class="value">${vehicle.motorista_saida}</span></div>
        <div class="row"><span class="label">SOLICITANTE:</span><span class="value">${vehicle.solicitante}</span></div>
        <div class="row"><span class="label">DATA:</span><span class="value">${new Date(vehicle.data_saida!).toLocaleString('pt-BR')}</span></div>
      </div>
      ` : ''}

      <div class="footer">
        <p>DOCUMENTO GERADO EM ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }
};

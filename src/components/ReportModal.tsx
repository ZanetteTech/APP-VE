import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { VehicleEntry } from '@/types/vehicle';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleEntry[];
}

export default function ReportModal({ isOpen, onClose, vehicles }: ReportModalProps) {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'all' | 'date' | 'status'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'entrada' | 'saida'>('entrada');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNoDataAlert, setShowNoDataAlert] = useState(false);

  const getFilteredData = () => {
    let filtered = [...vehicles];

    if (filterType === 'date') {
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filtered = filtered.filter(v => {
          const date = new Date(v.data_entrada);
          return date >= start && date <= end;
        });
      }
    } else if (filterType === 'status') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    return filtered;
  };

  const convertImageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image:", error);
      return '';
    }
  };

  const exportPDF = async () => {
    setIsGenerating(true);
    try {
      const data = getFilteredData();

      if (data.length === 0) {
        setShowNoDataAlert(true);
        setIsGenerating(false);
        return;
      }

      const doc = new jsPDF();
      
      // Header Verde do Sistema
      doc.setFillColor(26, 71, 42); // #1a472a
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Relatório de Veículos', 105, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 23, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Total de registros: ${data.length}`, 14, 40);

      const tableBody = [];
      
      for (const v of data) {
        let photoBase64 = '';
        // Prioritize foto_chassi, then first of fotos
        const photoUrl = v.foto_chassi || (v.fotos && v.fotos.length > 0 ? v.fotos[0] : '');
        
        if (photoUrl) {
          photoBase64 = await convertImageUrlToBase64(photoUrl);
        }

        tableBody.push([
            v.placa,
            v.modelo,
            v.tipo_entrada || '-',
            v.created_by_matricula || 'N/A',
            new Date(v.data_entrada).toLocaleDateString('pt-BR'),
            v.status.toUpperCase(),
            v.status === 'saida' && v.data_saida ? new Date(v.data_saida).toLocaleDateString('pt-BR') : '-',
            photoBase64
        ]);
      }

      autoTable(doc, {
        startY: 44,
        head: [['Placa', 'Modelo', 'Tipo', 'Usuário', 'Data Entrada', 'Status', 'Data Saída', 'Foto']],
        body: tableBody,
        didDrawCell: (data) => {
            if (data.column.index === 7 && data.cell.section === 'body') {
                 const base64Img = data.cell.raw as string;
                 if (base64Img) {
                     const dim = 20; 
                     const x = data.cell.x + (data.cell.width - dim) / 2;
                     const y = data.cell.y + (data.cell.height - dim) / 2;
                     try {
                        // Extract format from base64 string or default to JPEG
                        const format = base64Img.includes('image/png') ? 'PNG' : 'JPEG';
                        doc.addImage(base64Img, format, x, y, dim, dim);
                     } catch (e) {
                         console.error("Error adding image to PDF", e);
                     }
                 }
            }
        },
        didParseCell: (data) => {
            if (data.column.index === 7 && data.cell.section === 'body') {
                data.cell.text = []; // Hide text content (base64 string)
            }
        },
        styles: { minCellHeight: 24, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: [26, 71, 42] },
        columnStyles: {
            7: { cellWidth: 26 }
        }
      });

      doc.save('relatorio-veiculos.pdf');
      toast({ title: "Sucesso", description: "Relatório PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ 
        title: "Erro ao gerar PDF", 
        description: error instanceof Error ? error.message : "Erro desconhecido", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  const exportExcel = () => {
    try {
      const data = getFilteredData();
      
      if (data.length === 0) {
        setShowNoDataAlert(true);
        return;
      }

      const excelData = data.map(v => ({
        'Placa': v.placa,
        'Modelo': v.modelo,
        'Tipo Entrada': v.tipo_entrada || '-',
        'Lançado Por': v.created_by_matricula || 'N/A',
        'Origem': v.origem,
        'Motorista Entrada': v.motorista,
        'Data Entrada': new Date(v.data_entrada).toLocaleString('pt-BR'),
        'Status': v.status.toUpperCase(),
        'Destino': v.destino || '-',
        'Motorista Saída': v.motorista_saida || '-',
        'Data Saída': v.data_saida ? new Date(v.data_saida).toLocaleString('pt-BR') : '-',
        'Foto URL': v.foto_chassi || (v.fotos && v.fotos.length > 0 ? v.fotos[0] : ''),
        'Observações': v.observacoes
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Veículos");
      XLSX.writeFile(wb, "relatorio-veiculos.xlsx");
      toast({ title: "Sucesso", description: "Relatório Excel gerado com sucesso!" });
      onClose();
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ 
        title: "Erro ao gerar Excel", 
        description: error instanceof Error ? error.message : "Erro desconhecido", 
        variant: "destructive" 
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] glass-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>GERAR RELATÓRIO</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label>FILTRAR POR</Label>
              <RadioGroup value={filterType} onValueChange={(v: any) => setFilterType(v)} className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" className="border-primary text-primary" />
                  <Label htmlFor="all" className="cursor-pointer">TODA A BASE DE DADOS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="date" className="border-primary text-primary" />
                  <Label htmlFor="date" className="cursor-pointer">POR DATA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="status" id="status" className="border-primary text-primary" />
                  <Label htmlFor="status" className="cursor-pointer">POR STATUS (ENTRADA/SAÍDA)</Label>
                </div>
              </RadioGroup>
            </div>

            {filterType === 'date' && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div className="space-y-2">
                  <Label>DATA INICIAL</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>DATA FINAL</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
              </div>
            )}

            {filterType === 'status' && (
              <div className="space-y-2 animate-fade-in">
                <Label>SELECIONE O STATUS</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">ENTRADA (NO PÁTIO)</SelectItem>
                    <SelectItem value="saida">SAÍDA (FINALIZADOS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={exportPDF} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? 'GERANDO...' : 'PDF'}
              </Button>
              <Button 
                onClick={exportExcel} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isGenerating}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                EXCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNoDataAlert} onOpenChange={setShowNoDataAlert}>
        <AlertDialogContent className="glass-card border-destructive/50 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">SEM DADOS</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80">
              Nenhum registro foi encontrado para os filtros selecionados.
              Por favor, tente ajustar os filtros e tente novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowNoDataAlert(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              ENTENDI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

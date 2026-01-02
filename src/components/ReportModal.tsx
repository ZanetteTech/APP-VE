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

  const exportPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const today = new Date().toLocaleDateString('pt-BR');
      
      doc.setFontSize(16);
      doc.text('Relatório de Veículos - CAR PATIO', 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${today}`, 14, 22);

      const tableData = getFilteredData().map(v => [
        v.placa,
        v.modelo,
        v.origem,
        new Date(v.data_entrada).toLocaleString('pt-BR'),
        v.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA',
        v.data_saida ? new Date(v.data_saida).toLocaleString('pt-BR') : '-',
        v.destino || '-',
        v.solicitante_nome || '-',
        v.solicitacao_data_retirada ? new Date(v.solicitacao_data_retirada).toLocaleString('pt-BR') : '-',
        v.solicitacao_destino || '-'
      ]);

      autoTable(doc, {
        head: [['Placa', 'Modelo', 'Origem', 'Entrada', 'Status', 'Saída', 'Destino', 'Solicitante', 'Prev. Saída', 'Dest. Solicitado']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }
      });

      doc.save(`relatorio_veiculos_${today.replace(/\//g, '-')}.pdf`);
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O download do PDF começará em instantes.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o PDF.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportExcel = () => {
    setIsGenerating(true);
    try {
      const data = getFilteredData().map(v => ({
        'Placa': v.placa,
        'Modelo': v.modelo,
        'Origem': v.origem,
        'Data Entrada': new Date(v.data_entrada).toLocaleString('pt-BR'),
        'Status': v.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA',
        'Data Saída': v.data_saida ? new Date(v.data_saida).toLocaleString('pt-BR') : '-',
        'Destino': v.destino || '-',
        'Motorista Entrada': v.motorista,
        'Guincho Entrada': v.guincho,
        'Solicitante': v.solicitante_nome || '-',
        'Previsão Retirada': v.solicitacao_data_retirada ? new Date(v.solicitacao_data_retirada).toLocaleString('pt-BR') : '-',
        'Destino Solicitado': v.solicitacao_destino || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Veículos");
      
      XLSX.writeFile(wb, `relatorio_veiculos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
      
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O download do Excel começará em instantes.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o Excel.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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

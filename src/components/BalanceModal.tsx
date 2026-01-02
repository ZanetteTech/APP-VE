import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VehicleEntry } from '@/types/vehicle';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, BarChart3, Calendar, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleEntry[];
}

export default function BalanceModal({ isOpen, onClose, vehicles }: BalanceModalProps) {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [statusFilter, setStatusFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract unique years from data
  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    vehicles.forEach(v => {
      yearsSet.add(new Date(v.data_entrada).getFullYear().toString());
      if (v.data_saida) {
        yearsSet.add(new Date(v.data_saida).getFullYear().toString());
      }
    });
    // Always include current year
    yearsSet.add(new Date().getFullYear().toString());
    return Array.from(yearsSet).sort().reverse();
  }, [vehicles]);

  // Extract unique locations (Origem for Entry, Destino for Exit)
  const locations = useMemo(() => {
    const locs = new Set<string>();
    vehicles.forEach(v => {
      if (v.origem) locs.add(v.origem);
      if (v.destino) locs.add(v.destino);
    });
    return Array.from(locs).sort();
  }, [vehicles]);

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const filterData = () => {
    return vehicles.filter(v => {
      // Filter by Year and Month based on status
      let dateToCheck: Date;
      
      // If status is specific, use that date. If 'all', check if either entry or exit matches.
      // For simplicity in "Monthly Balance", we usually look at when the event happened.
      
      const entryDate = new Date(v.data_entrada);
      const exitDate = v.data_saida ? new Date(v.data_saida) : null;
      
      const matchesEntry = 
        entryDate.getFullYear().toString() === selectedYear &&
        (entryDate.getMonth() + 1).toString() === selectedMonth;
        
      const matchesExit = exitDate &&
        exitDate.getFullYear().toString() === selectedYear &&
        (exitDate.getMonth() + 1).toString() === selectedMonth;

      let dateMatch = false;
      if (statusFilter === 'entrada') dateMatch = matchesEntry;
      else if (statusFilter === 'saida') dateMatch = matchesExit || false;
      else dateMatch = matchesEntry || matchesExit || false;

      if (!dateMatch) return false;

      // Filter by Location
      if (locationFilter !== 'all') {
        if (statusFilter === 'entrada') {
          if (v.origem !== locationFilter) return false;
        } else if (statusFilter === 'saida') {
          if (v.destino !== locationFilter) return false;
        } else {
          // If 'all' status, match either origin or destination
          if (v.origem !== locationFilter && v.destino !== locationFilter) return false;
        }
      }

      return true;
    });
  };

  const generateDetailedReport = () => {
    setIsGenerating(true);
    try {
      const data = filterData();
      
      if (data.length === 0) {
        toast.error("Nenhum registro encontrado com os filtros selecionados.");
        setIsGenerating(false);
        return;
      }

      const doc = new jsPDF();
      const monthName = months.find(m => m.value === selectedMonth)?.label;

      // Header
      doc.setFillColor(26, 71, 42); // System Green
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Relatório Detalhado', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Período: ${monthName}/${selectedYear}`, 105, 23, { align: 'center' });

      // Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 40);
      doc.text(`Total de registros: ${data.length}`, 14, 46);
      
      if (statusFilter !== 'all') {
         doc.text(`Tipo: ${statusFilter === 'entrada' ? 'Entradas' : 'Saídas'}`, 14, 52);
      }
      if (locationFilter !== 'all') {
         doc.text(`Local: ${locationFilter}`, 100, 52);
      }

      const tableBody = data.map(v => [
        v.status === 'entrada' ? 'ENTRADA' : 'SAÍDA',
        v.placa,
        v.modelo,
        v.tipo_entrada || '-',
        v.motorista || '-',
        v.status === 'entrada' ? (v.origem || '-') : (v.destino || '-'),
        v.solicitante_nome || '-',
        v.solicitacao_data_retirada ? new Date(v.solicitacao_data_retirada).toLocaleDateString('pt-BR') : '-',
        v.solicitacao_destino || '-'
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['Status', 'Placa', 'Modelo', 'Tipo', 'Motorista', 'Origem/Destino', 'Entrada', 'Saída', 'Solicitante', 'Prev. Saída', 'Dest. Solicitado']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [26, 71, 42] },
        styles: { fontSize: 8 },
      });

      doc.save(`relatorio_detalhado_${selectedMonth}_${selectedYear}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateGeneralBalance = (type: 'monthly' | 'annual') => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(26, 71, 42); // System Green
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text(type === 'monthly' ? 'Balanço Geral Mensal' : 'Balanço Geral Anual', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(type === 'monthly' 
        ? `Mês: ${months.find(m => m.value === selectedMonth)?.label}/${selectedYear}`
        : `Ano: ${selectedYear}`, 105, 23, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 40);

      // Data Processing
      let summaryData: any[] = [];
      let totalEntradas = 0;
      let totalSaidas = 0;

      if (type === 'monthly') {
        // Breakdown by day or by category? 
        // Let's do a simple summary: Total entries, Total exits, and maybe breakdown by Destination/Origin
        
        const relevantVehicles = vehicles.filter(v => {
          const entryDate = new Date(v.data_entrada);
          const exitDate = v.data_saida ? new Date(v.data_saida) : null;
          
          const inMonth = entryDate.getFullYear().toString() === selectedYear && 
                         (entryDate.getMonth() + 1).toString() === selectedMonth;
          
          const outMonth = exitDate && 
                          exitDate.getFullYear().toString() === selectedYear && 
                          (exitDate.getMonth() + 1).toString() === selectedMonth;
                          
          return inMonth || outMonth;
        });

        const entries = relevantVehicles.filter(v => {
           const d = new Date(v.data_entrada);
           return d.getFullYear().toString() === selectedYear && (d.getMonth() + 1).toString() === selectedMonth;
        });
        
        const exits = relevantVehicles.filter(v => {
           if (!v.data_saida) return false;
           const d = new Date(v.data_saida);
           return d.getFullYear().toString() === selectedYear && (d.getMonth() + 1).toString() === selectedMonth;
        });

        totalEntradas = entries.length;
        totalSaidas = exits.length;

        // Group by Destino (for exits)
        const exitsByDest = exits.reduce((acc, curr) => {
          const dest = curr.destino || 'Não informado';
          acc[dest] = (acc[dest] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        summaryData = Object.entries(exitsByDest).map(([dest, count]) => ['Saídas para ' + dest, count]);
        
        // Group by Origem (for entries)
        const entriesByOrig = entries.reduce((acc, curr) => {
          const orig = curr.origem || 'Não informado';
          acc[orig] = (acc[orig] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        Object.entries(entriesByOrig).forEach(([orig, count]) => {
           summaryData.push(['Entradas de ' + orig, count]);
        });

      } else {
        // Annual
        // Breakdown by Month
        months.forEach(m => {
          const entriesCount = vehicles.filter(v => {
            const d = new Date(v.data_entrada);
            return d.getFullYear().toString() === selectedYear && (d.getMonth() + 1).toString() === m.value;
          }).length;
          
          const exitsCount = vehicles.filter(v => {
            if (!v.data_saida) return false;
            const d = new Date(v.data_saida);
            return d.getFullYear().toString() === selectedYear && (d.getMonth() + 1).toString() === m.value;
          }).length;
          
          if (entriesCount > 0 || exitsCount > 0) {
            summaryData.push([m.label, entriesCount, exitsCount, entriesCount + exitsCount]);
            totalEntradas += entriesCount;
            totalSaidas += exitsCount;
          }
        });
      }

      // Stats Section
      doc.setFontSize(14);
      doc.text('Resumo', 14, 55);
      
      doc.setFontSize(12);
      doc.text(`Total Entradas: ${totalEntradas}`, 14, 65);
      doc.text(`Total Saídas: ${totalSaidas}`, 14, 72);
      doc.text(`Volume Total: ${totalEntradas + totalSaidas}`, 14, 79);

      // Table
      if (type === 'monthly') {
        autoTable(doc, {
          startY: 90,
          head: [['Categoria / Local', 'Quantidade']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: [26, 71, 42] }
        });
      } else {
        autoTable(doc, {
          startY: 90,
          head: [['Mês', 'Entradas', 'Saídas', 'Total']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: [26, 71, 42] }
        });
      }

      doc.save(`balanco_${type}_${selectedYear}.pdf`);
      toast.success("Balanço gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar balanço.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-5 h-5 text-primary" />
            Balanço e Relatórios
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="detailed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="detailed">Relatório Detalhado</TabsTrigger>
            <TabsTrigger value="general">Balanço Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="detailed" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destino / Origem</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={generateDetailedReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Relatório Detalhado
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label>Ano de Referência</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button 
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => generateGeneralBalance('monthly')}
                disabled={isGenerating}
              >
                <Calendar className="w-8 h-8 text-primary" />
                <span>Balanço Mensal<br/><span className="text-xs text-muted-foreground">({months.find(m => m.value === selectedMonth)?.label})</span></span>
              </Button>

              <Button 
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => generateGeneralBalance('annual')}
                disabled={isGenerating}
              >
                <BarChart3 className="w-8 h-8 text-primary" />
                <span>Balanço Anual<br/><span className="text-xs text-muted-foreground">({selectedYear})</span></span>
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center mt-4">
              * O Balanço Mensal usa o mês selecionado na aba anterior.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

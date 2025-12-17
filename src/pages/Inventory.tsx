import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Car, Check, AlertCircle, History, FileText, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MaskedInput } from '@/components/MaskedInput';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScannedVehicle {
  id: string;
  placa: string;
  modelo: string;
  cor?: string;
  foto?: string;
  scanned_at: Date;
}

interface PreviewVehicle {
  id: string;
  placa: string;
  modelo: string;
  foto?: string;
}

interface InventorySession {
  id: string;
  created_at: string;
  total_vehicles: number;
  items?: any[];
}

const Inventory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('new');
  
  // New Inventory State
  const [placaInput, setPlacaInput] = useState('');
  const [scannedVehicles, setScannedVehicles] = useState<ScannedVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Finish Inventory State
  const [finishStep, setFinishStep] = useState<'idle' | 'counting' | 'result'>('idle');
  const [countedVehicles, setCountedVehicles] = useState(0);

  // Preview Modal State
  const [previewVehicle, setPreviewVehicle] = useState<PreviewVehicle | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // History State
  const [history, setHistory] = useState<InventorySession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [deleteConfig, setDeleteConfig] = useState<{
    isOpen: boolean;
    type: 'single' | 'all';
    sessionId?: string;
  }>({ isOpen: false, type: 'single' });

  useEffect(() => {
    if (activeTab === 'new') {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      loadHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (finishStep === 'counting') {
      let current = 0;
      const total = scannedVehicles.length;
      const duration = 2000; // 2 seconds animation
      const intervalTime = duration / total;
      
      const timer = setInterval(() => {
        current += 1;
        setCountedVehicles(current);
        if (current >= total) {
          clearInterval(timer);
          setTimeout(() => setFinishStep('result'), 500);
        }
      }, Math.max(intervalTime, 50)); // Min 50ms interval

      return () => clearInterval(timer);
    }
  }, [finishStep, scannedVehicles.length]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('inventory_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({ title: 'ERRO AO CARREGAR HISTÓRICO', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkAndAddPlaca = async () => {
    if (!placaInput || placaInput.length < 7) return;

    // Check if already scanned
    if (scannedVehicles.some(v => v.placa === placaInput)) {
      toast({ 
        title: 'VEÍCULO JÁ ADICIONADO', 
        description: `A placa ${placaInput} já está na lista deste inventário.`,
        variant: 'destructive' 
      });
      setPlacaInput('');
      return;
    }

    setLoading(true);
    try {
      // Verifica se está no pátio (status = entrada)
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, placa, modelo')
        .eq('placa', placaInput)
        .eq('status', 'entrada')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch photos
        const { data: photos } = await supabase
          .from('vehicle_photos')
          .select('*')
          .eq('vehicle_id', data.id);
          
        const frontPhoto = photos?.find(p => p.photo_type === 'foto_1' || p.photo_type.startsWith('foto_'))?.photo_url;

        setPreviewVehicle({
          id: data.id,
          placa: data.placa,
          modelo: data.modelo,
          foto: frontPhoto
        });
        setShowPreviewModal(true);
        setPlacaInput('');
      } else {
        // Se não achou como entrada, verifica se já saiu ou se não existe
        const { data: saidaData } = await supabase
          .from('vehicles')
          .select('id')
          .eq('placa', placaInput)
          .eq('status', 'saida')
          .limit(1)
          .maybeSingle();

        if (saidaData) {
          toast({ 
            title: 'VEÍCULO JÁ SAIU', 
            description: `O veículo ${placaInput} consta como SAÍDA no sistema.`,
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: 'PLACA NÃO ENCONTRADA', 
            description: `O veículo ${placaInput} não possui registro no sistema.`,
            variant: 'destructive' 
          });
        }
        setPlacaInput('');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error checking placa:', error);
      toast({ title: 'ERRO AO VERIFICAR PLACA', variant: 'destructive' });
      setPlacaInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const confirmAddVehicle = () => {
    if (!previewVehicle) return;
    
    setScannedVehicles(prev => [{
      id: previewVehicle.id,
      placa: previewVehicle.placa,
      modelo: previewVehicle.modelo,
      foto: previewVehicle.foto,
      scanned_at: new Date()
    }, ...prev]);
    
    toast({ 
      title: 'VEÍCULO ADICIONADO',
      className: "bg-green-500 text-white"
    });
    
    setShowPreviewModal(false);
    setPreviewVehicle(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleFinishInventory = async () => {
    if (scannedVehicles.length === 0) {
      toast({ title: 'NENHUM VEÍCULO ESCANEADO', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create Session
      const { data: session, error: sessionError } = await supabase
        .from('inventory_sessions')
        .insert({
          user_id: user.id,
          total_vehicles: scannedVehicles.length,
          status: 'completed'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create Items
      const items = scannedVehicles.map(v => ({
        session_id: session.id,
        vehicle_id: v.id,
        placa: v.placa,
        scanned_at: v.scanned_at.toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('inventory_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: 'INVENTÁRIO FINALIZADO COM SUCESSO!' });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setFinishStep('counting');
    } catch (error) {
      console.error('Error finishing inventory:', error);
      toast({ title: 'ERRO AO FINALIZAR INVENTÁRIO', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (session: InventorySession) => {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*, vehicles(modelo)')
        .eq('session_id', session.id);

      if (error) throw error;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text('RELATÓRIO DE INVENTÁRIO', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Data: ${new Date(session.created_at).toLocaleDateString('pt-BR')} às ${new Date(session.created_at).toLocaleTimeString('pt-BR')}`, 14, 30);
      doc.text(`Total de Veículos: ${session.total_vehicles}`, 14, 37);

      const tableData = items?.map((item: any) => [
        item.placa,
        item.vehicles?.modelo || 'N/A',
        new Date(item.scanned_at).toLocaleTimeString('pt-BR')
      ]) || [];

      autoTable(doc, {
        startY: 45,
        head: [['PLACA', 'MODELO', 'HORA']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }, // Black header
      });

      doc.save(`inventario-${new Date(session.created_at).toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'ERRO AO GERAR PDF', variant: 'destructive' });
    }
  };

  const generateCurrentInventoryPDF = async () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('RELATÓRIO DE INVENTÁRIO COMPLETO', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
      doc.text(`Total de Veículos: ${scannedVehicles.length}`, 14, 37);

      // Preload images
      const tableBody = await Promise.all(scannedVehicles.map(async (vehicle) => {
        let photoData = '';
        if (vehicle.foto) {
          try {
            const response = await fetch(vehicle.foto);
            const blob = await response.blob();
            photoData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.error("Error loading image for PDF", e);
          }
        }
        return [vehicle.placa, vehicle.modelo, photoData];
      }));

      autoTable(doc, {
        startY: 45,
        head: [['PLACA', 'MODELO', 'FOTO']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] },
        bodyStyles: { minCellHeight: 25, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 }
        },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.section === 'body') {
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.column.index === 2 && data.cell.section === 'body') {
             const img = data.cell.raw as string;
             if (img) {
                 try {
                     doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 20);
                 } catch (e) {
                     // Ignore image errors
                 }
             }
          }
        }
      });

      doc.save(`inventario-completo-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'ERRO AO GERAR PDF', variant: 'destructive' });
    }
  };

  const handleCloseFinishModal = () => {
    setFinishStep('idle');
    setScannedVehicles([]);
    setActiveTab('history');
  };

  const confirmDelete = (type: 'single' | 'all', sessionId?: string) => {
    setDeleteConfig({ isOpen: true, type, sessionId });
  };

  const executeDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (deleteConfig.type === 'all') {
        const { error } = await supabase
          .from('inventory_sessions')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        toast({ title: 'HISTÓRICO EXCLUÍDO COM SUCESSO' });
      } else if (deleteConfig.type === 'single' && deleteConfig.sessionId) {
        const { error } = await supabase
          .from('inventory_sessions')
          .delete()
          .eq('id', deleteConfig.sessionId);

        if (error) throw error;
        toast({ title: 'INVENTÁRIO EXCLUÍDO COM SUCESSO' });
      }

      loadHistory();
    } catch (error) {
      console.error('Error deleting inventory:', error);
      toast({ title: 'ERRO AO EXCLUIR', variant: 'destructive' });
    } finally {
      setDeleteConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Check className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">INVENTÁRIO</h1>
          </div>
        </div>
      </header>

      <Button
        onClick={() => navigate('/dashboard')}
        className="fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg z-50 gradient-primary text-primary-foreground"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary mb-6">
            <TabsTrigger value="new" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              NOVO INVENTÁRIO
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              HISTÓRICO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-full">
                    <Label className="text-foreground mb-2 block">DIGITE A PLACA</Label>
                    <MaskedInput
                      ref={inputRef}
                      mask="placa"
                      placeholder="ABC-1234"
                      value={placaInput}
                      onChange={setPlacaInput}
                      onKeyDown={(e) => e.key === 'Enter' && checkAndAddPlaca()}
                      className="bg-input border-border text-foreground text-lg uppercase h-12 w-full"
                      disabled={loading}
                    />
                  </div>
                </CardContent>
              </Card>

              {scannedVehicles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      VEÍCULOS ESCANEADOS ({scannedVehicles.length})
                    </h3>
                    <Button 
                      onClick={handleFinishInventory}
                      className="gradient-primary text-primary-foreground"
                    >
                      FINALIZAR INVENTÁRIO
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {scannedVehicles.map((vehicle) => (
                      <Card key={vehicle.id} className="glass-card">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <Car className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{vehicle.placa}</p>
                              <p className="text-sm text-muted-foreground">{vehicle.modelo}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {vehicle.scanned_at.toLocaleTimeString()}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">HISTÓRICO DE INVENTÁRIOS</h3>
                {history.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => confirmDelete('all')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    EXCLUIR TUDO
                  </Button>
                )}
              </div>

              {loadingHistory ? (
                <p className="text-center text-muted-foreground mt-8">CARREGANDO...</p>
              ) : history.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">NENHUM INVENTÁRIO REALIZADO</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {history.map((session) => (
                    <Card key={session.id} className="glass-card hover:bg-secondary/50 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                            <History className="w-5 h-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {new Date(session.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.created_at).toLocaleTimeString('pt-BR')} • {session.total_vehicles} veículos
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generatePDF(session)}
                            className="border-border text-foreground hover:bg-secondary"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => confirmDelete('single', session.id)}
                            className="h-9 w-9"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AlertDialog open={deleteConfig.isOpen} onOpenChange={(open) => setDeleteConfig(prev => ({ ...prev, isOpen: open }))}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {deleteConfig.type === 'all' ? 'EXCLUIR TODO O HISTÓRICO?' : 'EXCLUIR ESTE INVENTÁRIO?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteConfig.type === 'all' 
                      ? 'Esta ação não pode ser desfeita. Todo o histórico de inventários será apagado permanentemente.'
                      : 'Esta ação não pode ser desfeita. O registro deste inventário será apagado permanentemente.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>CANCELAR</AlertDialogCancel>
                  <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    EXCLUIR
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showPreviewModal} onOpenChange={(open) => {
        if (!open) {
          setShowPreviewModal(false);
          setPreviewVehicle(null);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }}>
        <DialogContent className="glass-card border-border max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-center">CONFIRMAR VEÍCULO</DialogTitle>
          </DialogHeader>
          
          {previewVehicle && (
            <div className="flex flex-col items-center gap-4 py-4">
              {previewVehicle.foto ? (
                <div className="w-full aspect-video relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={previewVehicle.foto} 
                    alt={`Veículo ${previewVehicle.placa}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted/20 flex items-center justify-center">
                  <Car className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-bold text-foreground">{previewVehicle.placa}</h2>
                <p className="text-lg text-muted-foreground">{previewVehicle.modelo}</p>
              </div>
              
              <Button 
                onClick={confirmAddVehicle}
                className="w-full h-12 text-lg font-bold gradient-primary text-primary-foreground mt-2"
              >
                <Plus className="w-5 h-5 mr-2" />
                ADICIONAR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={finishStep !== 'idle'} onOpenChange={(open) => {
        if (!open && finishStep === 'result') {
          handleCloseFinishModal();
        }
      }}>
        <DialogContent className="glass-card border-border max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-center text-2xl">
              {finishStep === 'counting' ? 'PROCESSANDO...' : 'INVENTÁRIO CONCLUÍDO'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-8">
            {finishStep === 'counting' ? (
              <>
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="text-center space-y-2">
                  <p className="text-xl font-bold text-foreground">
                    {countedVehicles}
                  </p>
                  <p className="text-muted-foreground">
                    Contabilizando veículos...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-12 h-12 text-success" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-4xl font-bold text-foreground">
                    {scannedVehicles.length}
                  </p>
                  <p className="text-muted-foreground">
                    Veículos contabilizados com sucesso
                  </p>
                </div>

                <div className="w-full space-y-3 mt-4">
                  <Button 
                    onClick={generateCurrentInventoryPDF}
                    className="w-full h-12 text-lg font-bold gradient-primary text-primary-foreground"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    IMPRIMIR RELATÓRIO
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleCloseFinishModal}
                    className="w-full h-12 text-lg"
                  >
                    FINALIZAR
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Car, Plus, Search, LogOut, Phone, ArrowRightLeft, FileText, MessageSquare, ArrowLeft, Share2, ClipboardList } from 'lucide-react';
import { VehicleEntry } from '@/types/vehicle';
import { useToast } from '@/hooks/use-toast';
import VehicleCard from '@/components/VehicleCard';
import ExitModal from '@/components/ExitModal';
import PhoneManager from '@/components/PhoneManager';
import ReportModal from '@/components/ReportModal';
import { MaskedInput } from '@/components/MaskedInput';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchPlaca, setSearchPlaca] = useState('');
  const [vehicles, setVehicles] = useState<VehicleEntry[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPhoneManager, setShowPhoneManager] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [whatsAppModalStep, setWhatsAppModalStep] = useState<'type-selection' | 'phone-selection'>('type-selection');
  const [whatsAppVehicle, setWhatsAppVehicle] = useState<VehicleEntry | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<{id: string; name: string; phone: string}[]>([]);
  const [userMatricula, setUserMatricula] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      let matricula = user.user_metadata?.matricula;

      if (!matricula) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('matricula')
          .eq('user_id', user.id)
          .single();
        
        if (profile) matricula = profile.matricula;
      }

      if (matricula) setUserMatricula(matricula);

      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load photos for each vehicle
      const vehiclesWithPhotos = await Promise.all(
        (vehiclesData || []).map(async (vehicle) => {
          const { data: photos } = await supabase
            .from('vehicle_photos')
            .select('*')
            .eq('vehicle_id', vehicle.id);

          const fotos = photos?.filter(p => p.photo_type.startsWith('foto_')).map(p => p.photo_url) || [];
          const fotoChassi = photos?.find(p => p.photo_type === 'chassi')?.photo_url || '';

          return {
            ...vehicle,
            fotos,
            foto_chassi: fotoChassi,
            created_by_matricula: matricula
          } as VehicleEntry;
        })
      );

      setVehicles(vehiclesWithPhotos);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({ title: 'ERRO AO CARREGAR VEÍCULOS', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadPhoneNumbers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', user.id);

    setPhoneNumbers(data || []);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      loadVehicles();
      loadPhoneNumbers();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleExit = (vehicle: VehicleEntry) => {
    setSelectedVehicle(vehicle);
    setShowExitModal(true);
  };

  const handleEdit = (vehicle: VehicleEntry) => {
    navigate(`/editar/${vehicle.id}`);
  };

  const handleSearch = () => {
    if (!searchPlaca) return;
    const vehicle = vehicles.find(v => v.placa.toUpperCase() === searchPlaca.toUpperCase() && v.status === 'entrada');
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setShowExitModal(true);
    } else {
      const exitedVehicle = vehicles.find(v => v.placa.toUpperCase() === searchPlaca.toUpperCase());
      if (exitedVehicle) {
        toast({ title: 'ESTE VEÍCULO JÁ TEVE SAÍDA REGISTRADA', variant: 'destructive' });
      } else {
        toast({ title: 'VEÍCULO NÃO ENCONTRADO', variant: 'destructive' });
      }
    }
    setSearchPlaca('');
  };

  const handleRevert = async (vehicle: VehicleEntry) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: 'entrada',
          data_saida: null,
          destino: null,
          empresa_guincho_saida: null,
          placa_guincho_saida: null,
          motorista_saida: null,
          solicitante: null,
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      toast({ title: 'VEÍCULO REVERTIDO PARA O PÁTIO', className: 'bg-green-500 text-white' });
      await loadVehicles();
    } catch (error) {
      console.error('Error reverting vehicle:', error);
      toast({ title: 'ERRO AO REVERTER VEÍCULO', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (vehicle: VehicleEntry) => {
    setWhatsAppVehicle(vehicle);
    loadPhoneNumbers();
    setWhatsAppModalStep('type-selection');
    setShowWhatsAppModal(true);
  };

  const sendWhatsApp = (phone: string) => {
    if (!whatsAppVehicle) return;

    const items = [];
    if (whatsAppVehicle.chave_principal) items.push('CHAVE PRINCIPAL');
    if (whatsAppVehicle.chave_reserva) items.push('CHAVE RESERVA');
    if (whatsAppVehicle.step) items.push('STEP');
    if (whatsAppVehicle.macaco) items.push('MACACO');
    if (whatsAppVehicle.triangulo) items.push('TRIÂNGULO');
    if (whatsAppVehicle.chave_roda) items.push('CHAVE DE RODA');

    let message = `*REGISTRO DE VEÍCULO*\n\n`;
    message += `🚗 *PLACA:* ${whatsAppVehicle.placa}\n`;
    message += `📋 *MODELO:* ${whatsAppVehicle.modelo}\n`;
    message += `📍 *ORIGEM:* ${whatsAppVehicle.origem}\n`;
    message += `🚚 *GUINCHO:* ${whatsAppVehicle.guincho}\n`;
    if (whatsAppVehicle.placa_guincho) {
      message += `🔢 *PLACA GUINCHO:* ${whatsAppVehicle.placa_guincho}\n`;
    }
    message += `👤 *MOTORISTA:* ${whatsAppVehicle.motorista}\n`;
    message += `📅 *DATA ENTRADA:* ${new Date(whatsAppVehicle.data_entrada).toLocaleDateString('pt-BR')}\n`;
    message += `✅ *ITENS:* ${items.join(', ') || 'NENHUM'}\n`;
    
    if (whatsAppVehicle.observacoes) {
      message += `📝 *OBS:* ${whatsAppVehicle.observacoes}\n`;
    }

    // Add photos
    if (whatsAppVehicle.fotos && whatsAppVehicle.fotos.length > 0) {
      message += `\n📷 *FOTOS DO VEÍCULO:*\n`;
      whatsAppVehicle.fotos.forEach((foto, index) => {
        if (foto) message += `FOTO ${index + 1}: ${foto}\n`;
      });
    }

    if (whatsAppVehicle.foto_chassi) {
      message += `📷 *FOTO CHASSI:* ${whatsAppVehicle.foto_chassi}\n`;
    }

    if (whatsAppVehicle.status === 'saida') {
      message += `\n*--- SAÍDA ---*\n`;
      message += `📍 *DESTINO:* ${whatsAppVehicle.destino}\n`;
      message += `🚚 *EMPRESA:* ${whatsAppVehicle.empresa_guincho_saida}\n`;
      message += `🚗 *PLACA GUINCHO:* ${whatsAppVehicle.placa_guincho_saida || '-'}\n`;
      message += `👤 *MOTORISTA:* ${whatsAppVehicle.motorista_saida}\n`;
      message += `📋 *SOLICITANTE:* ${whatsAppVehicle.solicitante}\n`;
      message += `📅 *DATA SAÍDA:* ${new Date(whatsAppVehicle.data_saida!).toLocaleDateString('pt-BR')}\n`;
    }

    const url = phone 
      ? `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  const entradas = vehicles.filter(v => v.status === 'entrada');
  const saidas = vehicles.filter(v => v.status === 'saida');

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-none">SISTEMA DE PÁTIO</h1>
              {userMatricula && <p className="text-xs text-muted-foreground mt-1">OLÁ, {userMatricula}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowPhoneManager(true)} className="text-muted-foreground hover:text-foreground">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              SAIR
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">TOTAL VEÍCULOS</p>
                <p className="text-2xl font-bold text-foreground">{vehicles.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">NO PÁTIO</p>
                <p className="text-2xl font-bold text-foreground">{entradas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">SAÍDAS</p>
                <p className="text-2xl font-bold text-foreground">{saidas.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <MaskedInput
              mask="placa"
              placeholder="BUSCAR PLACA"
              value={searchPlaca}
              onChange={setSearchPlaca}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => setShowReportModal(true)} className="gradient-primary text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            RELATÓRIO
          </Button>
          <Button onClick={() => navigate('/inventory')} className="gradient-primary text-primary-foreground">
            <ClipboardList className="w-4 h-4 mr-2" />
            INVENTÁRIO
          </Button>
          <Button onClick={() => navigate('/cadastro')} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            NOVA ENTRADA
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="registros" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="registros" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              REGISTROS ({entradas.length})
            </TabsTrigger>
            <TabsTrigger value="saidas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              SAÍDAS ({saidas.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="registros" className="mt-4">
            <div className="space-y-4">
              {loading ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">CARREGANDO...</p>
                  </CardContent>
                </Card>
              ) : entradas.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">NENHUM VEÍCULO NO PÁTIO</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {entradas.map((vehicle) => (
                    <VehicleCard 
                      key={vehicle.id} 
                      vehicle={vehicle} 
                      onWhatsApp={handleWhatsApp} 
                      onExit={handleExit}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saidas" className="mt-4">
            <div className="space-y-4">
              {loading ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">CARREGANDO...</p>
                  </CardContent>
                </Card>
              ) : saidas.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">NENHUMA SAÍDA REGISTRADA</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {saidas.map((vehicle) => (
                    <VehicleCard 
                      key={vehicle.id} 
                      vehicle={vehicle} 
                      onWhatsApp={handleWhatsApp} 
                      onRevert={handleRevert}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Exit Modal */}
      {selectedVehicle && (
        <ExitModal
          open={showExitModal}
          onClose={() => {
            setShowExitModal(false);
            setSelectedVehicle(null);
          }}
          vehicle={selectedVehicle}
          onUpdate={loadVehicles}
        />
      )}

      {/* Phone Manager */}
      <PhoneManager
        open={showPhoneManager}
        onClose={() => setShowPhoneManager(false)}
      />

      {/* WhatsApp Modal */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              ENVIAR VIA WHATSAPP
            </DialogTitle>
          </DialogHeader>

          {whatsAppModalStep === 'type-selection' ? (
            <div className="space-y-4 py-4">
              <Button 
                className="w-full gradient-primary text-primary-foreground h-12 text-lg"
                onClick={() => setWhatsAppModalStep('phone-selection')}
              >
                <Phone className="w-5 h-5 mr-2" />
                NÚMERO CADASTRADO
              </Button>
              <Button 
                variant="outline"
                className="w-full border-primary text-primary h-12 text-lg hover:bg-primary/10"
                onClick={() => sendWhatsApp('')}
              >
                <Share2 className="w-5 h-5 mr-2" />
                GERAL / TODOS
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setWhatsAppModalStep('type-selection')} 
                className="mb-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> 
                VOLTAR
              </Button>
              {phoneNumbers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  NENHUM TELEFONE CADASTRADO
                </p>
              ) : (
                phoneNumbers.map((phone) => (
                  <Button
                    key={phone.id}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-secondary"
                    onClick={() => sendWhatsApp(phone.phone)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {phone.name} - {phone.phone}
                  </Button>
                ))
              )}
            </div>
          )}

          {whatsAppModalStep === 'phone-selection' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPhoneManager(true)} className="border-border text-foreground">
                <Plus className="w-4 h-4 mr-2" />
                GERENCIAR TELEFONES
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        vehicles={vehicles} 
      />
    </div>
  );
};

export default Dashboard;

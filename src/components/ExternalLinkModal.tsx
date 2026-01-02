import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Trash2, Edit, Save, FileText, Link as LinkIcon, Clock, Plus, RefreshCw, LayoutList, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MaskedInput } from '@/components/MaskedInput';
import CreatableSelect from '@/components/CreatableSelect';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExternalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userLoja?: string;
  onSelectRequestForEntry?: (request: any) => void;
}

const STORAGE_KEY = 'car_diary_external_link';

export default function ExternalLinkModal({ isOpen, onClose, userId, userLoja, onSelectRequestForEntry }: ExternalLinkModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'form' | 'history'>('form');
  const [link, setLink] = useState('');
  const [savedLink, setSavedLink] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Form Data
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    sigla_patio: ''
  });
  const [carModels, setCarModels] = useState<{value: string, label: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingPlate, setCheckingPlate] = useState(false);
  const [plateStatus, setPlateStatus] = useState<{
    exists: boolean;
    status?: 'entrada' | 'saida';
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const storedLink = localStorage.getItem(STORAGE_KEY);
      if (storedLink) {
        setSavedLink(storedLink);
        setLink(storedLink);
        setIsEditing(false);
      } else {
        setSavedLink('');
        setLink('');
        setIsEditing(true);
      }
      fetchCarModels();
      if (userId) {
        fetchMyRequests();
      }
      if (userLoja && userLoja !== 'undefined') {
        setFormData(prev => ({ ...prev, sigla_patio: `LJ ${userLoja}` }));
      }
    }
  }, [isOpen, userId, userLoja]);

  const fetchMyRequests = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('app_requests')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'completed') // Hide completed requests
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }
      
      if (data) {
        // Double check against vehicles table to filter out requests that are already registered
        // This handles cases where auto-completion might have failed or race conditions
        const plates = data.map(r => r.placa);
        if (plates.length > 0) {
            const { data: existingVehicles } = await supabase
                .from('vehicles')
                .select('placa')
                .in('placa', plates);
            
            const existingPlates = new Set(existingVehicles?.map(v => v.placa) || []);
            
            // Filter out requests that have corresponding vehicles
            const filteredRequests = data.filter(r => !existingPlates.has(r.placa));
            setMyRequests(filteredRequests);

            // Background cleanup: mark filtered requests as completed
            const requestsToComplete = data.filter(r => existingPlates.has(r.placa));
            if (requestsToComplete.length > 0) {
                await supabase
                    .from('app_requests')
                    .update({ status: 'completed', notified: true })
                    .in('id', requestsToComplete.map(r => r.id));
            }
        } else {
            setMyRequests(data);
        }
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchCarModels = async () => {
    // Deprecated: Models are now derived from BRAND_MODELS_MAP based on selected brand
    // Keeping function signature if needed for future hybrid approach
  };

  const handleSaveLink = () => {
    if (!link) {
      toast.error('Por favor, insira um link válido.');
      return;
    }

    // Basic URL validation
    try {
      new URL(link);
    } catch (_) {
      toast.error('Por favor, insira uma URL válida (ex: https://...).');
      return;
    }

    localStorage.setItem(STORAGE_KEY, link);
    setSavedLink(link);
    setIsEditing(false);
    toast.success('Link salvo com sucesso!');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedLink('');
    setLink('');
    setIsEditing(true);
    toast.success('Link removido com sucesso!');
  };

  const checkPlate = async (placa: string) => {
    if (placa.length < 7) {
      setPlateStatus(null);
      return;
    }

    setCheckingPlate(true);
    try {
      // Check in vehicles table (active/history)
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('status, created_at')
        .eq('placa', placa)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (vehicles && vehicles.length > 0) {
        const vehicle = vehicles[0];
        setPlateStatus({
          exists: true,
          status: vehicle.status as 'entrada' | 'saida',
          message: vehicle.status === 'entrada' 
            ? 'ATENÇÃO: Este veículo já consta como NO PÁTIO.'
            : 'Este veículo já tem histórico de entrada e saída.'
        });
        
        if (vehicle.status === 'entrada') {
          toast.warning('Este veículo já está cadastrado e consta no pátio.');
        }
      } else {
        setPlateStatus({ exists: false, message: 'Veículo não encontrado na base (Novo Cadastro)' });
      }
    } catch (error) {
      console.error('Error checking plate:', error);
    } finally {
      setCheckingPlate(false);
    }
  };

  const handlePlateChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, placa: upperValue }));
    
    // Check if it's a full plate (assuming Mercosul or old format, 7 chars ignoring mask)
    const cleanPlate = upperValue.replace(/[^A-Z0-9]/g, '');
    if (cleanPlate.length === 7) {
      checkPlate(upperValue); // Passing masked or unmasked, checkPlate query handles text exact match. 
      // Usually stored masked "ABC-1234" or "ABC1D23". 
      // Let's assume standard mask usage. If mask is part of value, it's fine.
    } else {
      setPlateStatus(null);
    }
  };

  const handleSubmitForm = async () => {
    if (!formData.placa || !formData.marca || !formData.modelo || !formData.sigla_patio) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      let currentUserId = userId;
      
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }

      if (!currentUserId) {
        throw new Error('Usuário não identificado');
      }

      const { error } = await supabase.from('app_requests').insert({
        placa: formData.placa,
        marca: formData.marca,
        modelo: formData.modelo,
        sigla_patio: formData.sigla_patio,
        status: 'pending',
        user_id: currentUserId
      });

      if (error) throw error;

      toast.success('Solicitação enviada com sucesso!');
      if (currentUserId) fetchMyRequests();
      setFormData({
        placa: '',
        marca: '',
        modelo: '',
        sigla_patio: ''
      });
      onClose();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(`Erro ao enviar solicitação: ${error.message || 'Erro desconhecido'} (${error.code || 'No Code'})`);
    } finally {
      setLoading(false);
    }
  };
  
  // Common brands list for Marca field
  const commonBrands = [
    { value: 'CHEVROLET', label: 'CHEVROLET' },
    { value: 'FIAT', label: 'FIAT' },
    { value: 'VOLKSWAGEN', label: 'VOLKSWAGEN' },
    { value: 'FORD', label: 'FORD' },
    { value: 'TOYOTA', label: 'TOYOTA' },
    { value: 'HONDA', label: 'HONDA' },
    { value: 'HYUNDAI', label: 'HYUNDAI' },
    { value: 'RENAULT', label: 'RENAULT' },
    { value: 'NISSAN', label: 'NISSAN' },
    { value: 'JEEP', label: 'JEEP' },
    { value: 'CAOA CHERY', label: 'CAOA CHERY' },
    { value: 'PEUGEOT', label: 'PEUGEOT' },
    { value: 'CITROEN', label: 'CITROEN' },
    { value: 'MITSUBISHI', label: 'MITSUBISHI' },
    { value: 'BMW', label: 'BMW' },
    { value: 'MERCEDES-BENZ', label: 'MERCEDES-BENZ' },
    { value: 'AUDI', label: 'AUDI' },
    { value: 'KIA', label: 'KIA' },
    { value: 'VOLVO', label: 'VOLVO' },
    { value: 'LAND ROVER', label: 'LAND ROVER' }
  ].sort((a, b) => a.label.localeCompare(b.label));

  const BRAND_MODELS_MAP: Record<string, string[]> = {
    'CHEVROLET': ['ONIX', 'ONIX PLUS', 'TRACKER', 'S10', 'SPIN', 'MONTANA', 'CRUZE', 'EQUINOX', 'TRAILBLAZER', 'CAMARO', 'CELTA', 'CLASSIC', 'CORSA', 'PRISMA', 'AGILE', 'MERIVA', 'ZAFIRA', 'CAPTIVA', 'COBALT', 'SONIC', 'VECTRA', 'ASTRA', 'OMEGA'],
    'FIAT': ['STRADA', 'MOBI', 'ARGO', 'TORO', 'PULSE', 'CRONOS', 'FASTBACK', 'FIORINO', 'DUCATO', 'SCUDO', 'TITANO', 'UNO', 'PALIO', 'SIENA', 'GRAND SIENA', 'PUNTO', 'LINEA', 'IDEA', 'DOBLO', 'STILO', 'BRAVO', '500', 'FREEMONT'],
    'VOLKSWAGEN': ['POLO', 'T-CROSS', 'NIVUS', 'SAVEIRO', 'VIRTUS', 'TAOS', 'TIGUAN', 'AMAROK', 'JETTA', 'GOL', 'VOYAGE', 'FOX', 'SPACEFOX', 'UP', 'GOLF', 'PARATI', 'SAVEIRO CROSS', 'KOMBI', 'PASSAT', 'FUSCA', 'BEETLE'],
    'FORD': ['RANGER', 'MAVERICK', 'TERRITORY', 'MUSTANG', 'TRANSIT', 'BRONCO', 'F-150', 'KA', 'ECOSPORT', 'FIESTA', 'FOCUS', 'FUSION', 'EDGE', 'COURIER', 'CARGO'],
    'TOYOTA': ['HILUX', 'COROLLA', 'COROLLA CROSS', 'YARIS', 'RAV4', 'SW4', 'CAMRY', 'PRIUS', 'ETIOS', 'FIELDER'],
    'HONDA': ['HR-V', 'CITY', 'CIVIC', 'ZR-V', 'CR-V', 'ACCORD', 'FIT', 'WR-V'],
    'HYUNDAI': ['HB20', 'HB20S', 'CRETA', 'TUCSON', 'SANTA FE', 'PALISADE', 'IONIQ', 'KONA', 'HR', 'IX35', 'AZERA', 'ELANTRA', 'I30', 'VELOSTER', 'VERA CRUZ'],
    'RENAULT': ['KWID', 'DUSTER', 'OROCH', 'MASTER', 'STEPWAY', 'LOGAN', 'SANDERO', 'CAPTUR', 'KARDIAN', 'MEGANE', 'KANGOO', 'FLUENCE', 'CLIO', 'SYMBOL', 'SCENIC'],
    'NISSAN': ['KICKS', 'VERSA', 'SENTRA', 'FRONTIER', 'LEAF', 'MARCH', 'TIIDA', 'LIVINA', 'GRAND LIVINA'],
    'JEEP': ['RENEGADE', 'COMPASS', 'COMMANDER', 'WRANGLER', 'GLADIATOR', 'GRAND CHEROKEE', 'CHEROKEE'],
    'CAOA CHERY': ['TIGGO 5X', 'TIGGO 7', 'TIGGO 8', 'ARRIZO 6', 'ICAR', 'QQ', 'CELER', 'TIGGO 2'],
    'PEUGEOT': ['208', '2008', '3008', 'EXPERT', 'PARTNER', '308', '408', '207', '206', '307'],
    'CITROEN': ['C3', 'C3 AIRCROSS', 'C4 CACTUS', 'JUMPY', 'JUMPER', 'C4', 'C3 PICASSO', 'AIRCROSS', 'C4 LOUNGE', 'C4 PALLAS', 'XSARA PICASSO'],
    'MITSUBISHI': ['L200', 'PAJERO', 'ECLIPSE CROSS', 'OUTLANDER', 'ASX', 'LANCER'],
    'BMW': ['SÉRIE 3', 'X1', 'X3', 'X5', 'X6', 'SÉRIE 1', 'SÉRIE 5', 'X4', 'Z4', 'IX'],
    'MERCEDES-BENZ': ['CLASSE C', 'CLASSE A', 'GLA', 'GLB', 'GLC', 'GLE', 'SPRINTER', 'ACCELO', 'ATEGO', 'ACTROS'],
    'AUDI': ['A3', 'A4', 'A5', 'Q3', 'Q5', 'Q7', 'Q8', 'E-TRON'],
    'KIA': ['SPORTAGE', 'SELTOS', 'NIRO', 'CARNIVAL', 'BONGO', 'CERATO', 'PICANTO', 'SOUL', 'SORENTO'],
    'VOLVO': ['XC60', 'XC40', 'XC90', 'C40', 'S60', 'V60', 'V40'],
    'LAND ROVER': ['DEFENDER', 'DISCOVERY', 'RANGE ROVER EVOQUE', 'RANGE ROVER VELAR', 'RANGE ROVER SPORT']
  };

  useEffect(() => {
    if (formData.marca && BRAND_MODELS_MAP[formData.marca]) {
      const models = BRAND_MODELS_MAP[formData.marca].map(model => ({
        value: model,
        label: model
      })).sort((a, b) => a.label.localeCompare(b.label));
      setCarModels(models);
      
      // Clear model if it doesn't belong to the new brand
      if (formData.modelo && !BRAND_MODELS_MAP[formData.marca].includes(formData.modelo)) {
        setFormData(prev => ({ ...prev, modelo: '' }));
      }
    } else if (formData.marca) {
       // If brand not in map, maybe fetch all or leave empty? 
       // Let's try to keep existing "learned" models if they match? 
       // For now, if unknown brand, we might want to allow anything, so maybe show all?
       // But to be consistent, let's show empty and let user type.
       setCarModels([]);
    }
  }, [formData.marca]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border w-[95%] max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              INCLUSÃO DE PLACAS
            </span>
            
            {activeTab === 'link' && savedLink && !isEditing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleEdit} className="text-muted-foreground hover:text-foreground">
                  <Edit className="w-4 h-4 mr-1" />
                  EDITAR
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1" />
                  EXCLUIR
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Top Navigation */}
        {/* Desktop View */}
        <div className="hidden md:flex border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <button 
            className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'form' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            onClick={() => setActiveTab('form')}
          >
            <FileText className="w-4 h-4" />
            CADASTRO VIA FORM
          </button>
          <button 
            className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'link' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            onClick={() => setActiveTab('link')}
          >
            <LinkIcon className="w-4 h-4" />
            CADASTRO VIA LINK
          </button>
          <button 
            className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
            onClick={() => {
                setActiveTab('history');
                if (userId) fetchMyRequests();
            }}
          >
            <Clock className="w-4 h-4" />
            HISTÓRICO
          </button>
        </div>

        {/* Mobile View - Hamburger Menu */}
        <div className="md:hidden border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10 p-2 flex items-center justify-between">
          <span className="text-sm font-bold pl-2 flex items-center gap-2 text-primary">
            {activeTab === 'form' && <><FileText className="w-4 h-4" /> CADASTRO VIA FORM</>}
            {activeTab === 'link' && <><LinkIcon className="w-4 h-4" /> CADASTRO VIA LINK</>}
            {activeTab === 'history' && <><Clock className="w-4 h-4" /> HISTÓRICO</>}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setActiveTab('form')} className="gap-2 p-3">
                <FileText className="w-4 h-4" />
                CADASTRO VIA FORM
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('link')} className="gap-2 p-3">
                <LinkIcon className="w-4 h-4" />
                CADASTRO VIA LINK
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setActiveTab('history');
                  if (userId) fetchMyRequests();
                }} 
                className="gap-2 p-3"
              >
                <Clock className="w-4 h-4" />
                HISTÓRICO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-hidden relative bg-background/50">
          {activeTab === 'link' && (
            (!savedLink || isEditing) ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-url">Link do Formulário</Label>
                    <Input
                      id="link-url"
                      placeholder="Cole o link aqui (https://...)"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <Button onClick={handleSaveLink} className="w-full gradient-primary text-primary-foreground">
                    <Save className="w-4 h-4 mr-2" />
                    SALVAR LINK
                  </Button>
                </div>
              </div>
            ) : (
              <iframe 
                src={savedLink} 
                className="w-full h-full border-0"
                title="Formulário Externo"
                allow="camera; microphone; geolocation"
              />
            )
          )}

          {activeTab === 'form' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-2">
                  <Label>PLACA *</Label>
                  <MaskedInput
                    mask="placa"
                    placeholder="ABC-1234"
                    value={formData.placa}
                    onChange={handlePlateChange}
                    className={`bg-input border-border text-foreground placeholder:text-muted-foreground uppercase ${plateStatus?.status === 'entrada' ? 'border-red-500' : ''}`}
                  />
                  {checkingPlate && <p className="text-xs text-muted-foreground animate-pulse">Verificando placa...</p>}
                  {plateStatus && (
                    <p className={`text-xs ${plateStatus.status === 'entrada' ? 'text-red-500 font-bold' : 'text-green-500'}`}>
                      {plateStatus.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>MARCA *</Label>
                  <CreatableSelect
                    options={commonBrands}
                    value={formData.marca}
                    onChange={(value) => setFormData(prev => ({ ...prev, marca: value }))}
                    placeholder="SELECIONE A MARCA"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label>MODELO *</Label>
                  <CreatableSelect
                    options={carModels}
                    value={formData.modelo}
                    onChange={(value) => setFormData(prev => ({ ...prev, modelo: value }))}
                    placeholder="SELECIONE O MODELO"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label>SIGLA PÁTIO *</Label>
                  <Input
                    placeholder="DIGITE A SIGLA"
                    value={formData.sigla_patio}
                    onChange={(e) => setFormData(prev => ({ ...prev, sigla_patio: e.target.value.toUpperCase() }))}
                    className="bg-input border-border text-foreground uppercase"
                  />
                </div>

                <Button 
                  onClick={handleSubmitForm} 
                  className="w-full gradient-primary text-primary-foreground h-12"
                  disabled={loading}
                >
                  {loading ? 'ENVIANDO...' : 'CONFIRMAR DADOS E SALVAR'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">Minhas Solicitações</h3>
                  <Button variant="ghost" size="sm" onClick={fetchMyRequests}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
                
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {myRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border border-border bg-card/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg">{request.placa}</span>
                            <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'} className="uppercase">
                              {request.status === 'pending' ? 'PENDENTE' : request.status === 'approved' ? 'APROVADO' : request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {request.marca} - {request.modelo} • {request.sigla_patio}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Solicitado em {new Date(request.created_at).toLocaleDateString('pt-BR')} às {new Date(request.created_at).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                        {request.status === 'approved' && onSelectRequestForEntry && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                            onClick={() => onSelectRequestForEntry(request)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            REALIZAR ENTRADA
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

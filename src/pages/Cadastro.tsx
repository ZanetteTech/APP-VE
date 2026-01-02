import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Camera, Car, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaskedInput } from '@/components/MaskedInput';
import { UppercaseInput } from '@/components/UppercaseInput';
import PhotoUpload from '@/components/PhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import CreatableSelect from '@/components/CreatableSelect';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Cadastro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { guinchos, origens, tiposEntrada } = useHistoricalData();
  const placaRef = useRef<HTMLInputElement>(null);
  const origemRef = useRef<HTMLButtonElement>(null);
  const placaGuinchoRef = useRef<HTMLInputElement>(null);
  const isEditing = !!id;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentStep, setCurrentStep] = useState(0);
  const [carModels, setCarModels] = useState<{value: string, label: string}[]>([]);

  useEffect(() => {
    const fetchCarModels = async () => {
      try {
        const { data } = await supabase.from('car_models').select('*');
        if (data) {
          // console.log('Car models raw data:', data); // Debug
          const uniqueModels = new Map();
          
          data.forEach((m: any) => {
            // Prioriza a coluna 'model' conforme o SQL fornecido
            let name = m.model || m.name || m.modelo || m.descricao || m.brand || m.marca;
            
            if (!name) {
               // Fallback: procura qualquer coluna string que não pareça metadado
               const stringKey = Object.keys(m).find(k => 
                 typeof m[k] === 'string' && 
                 !['id', 'created_at', 'updated_at', 'uuid'].includes(k)
               );
               if (stringKey) name = m[stringKey];
            }

            if (name) {
              const finalName = name.trim(); // Remove espaços extras
              if (finalName && !uniqueModels.has(finalName)) {
                uniqueModels.set(finalName, { value: finalName, label: finalName });
              }
            }
          });
          
          const models = Array.from(uniqueModels.values())
            .sort((a, b) => a.label.localeCompare(b.label));
          
          setCarModels(models);
        }
      } catch (error) {
        console.error('Error fetching car models:', error);
      }
    };
    fetchCarModels();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadVehicleData();
    } else {
      // Check location state first, then session storage
      const approvedRequest = location.state?.approvedRequest || 
        (sessionStorage.getItem('entryRequest') ? JSON.parse(sessionStorage.getItem('entryRequest') || '{}') : null);

      if (approvedRequest && approvedRequest.placa) {
        setRequestId(approvedRequest.id);
        setFormData(prev => ({
          ...prev,
          placa: approvedRequest.placa || '',
          modelo: approvedRequest.modelo || '',
        }));
        
        // Auto-add model to the list if it doesn't exist
        if (approvedRequest.modelo) {
           setCarModels(prev => {
               const exists = prev.some(m => m.value === approvedRequest.modelo);
               if (!exists) {
                   return [...prev, { value: approvedRequest.modelo, label: approvedRequest.modelo }].sort((a, b) => a.label.localeCompare(b.label));
               }
               return prev;
           });
        }
        
        toast({
          title: 'DADOS IMPORTADOS',
          description: 'Os dados da solicitação foram preenchidos automaticamente.',
        });
        
        // Clear session storage to avoid persisting on reload if not desired, 
        // or keep it if we want to survive reload. Let's clear it to be safe.
        sessionStorage.removeItem('entryRequest');
      } else {
        setTimeout(() => placaRef.current?.focus(), 100);
      }
    }
  }, [id, location.state]);

  const loadVehicleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          placa: data.placa,
          modelo: data.modelo,
          origem: data.origem || '',
          tipo_entrada: data.tipo_entrada || '',
          guincho: data.guincho || '',
          placa_guincho: data.placa_guincho || '',
          motorista: data.motorista || '',
          chave_principal: data.chave_principal || false,
          chave_reserva: data.chave_reserva || false,
          step: data.step || false,
          macaco: data.macaco || false,
          triangulo: data.triangulo || false,
          chave_roda: data.chave_roda || false,
          observacoes: data.observacoes || '',
        });

        const { data: photos } = await supabase
          .from('vehicle_photos')
          .select('*')
          .eq('vehicle_id', id);
        
        if (photos) {
          const newFotos = ['', '', '', ''];
          photos.forEach(p => {
            if (p.photo_type === 'chassi') {
              setFotoChassi(p.photo_url);
            } else if (p.photo_type.startsWith('foto_')) {
              const index = parseInt(p.photo_type.split('_')[1]) - 1;
              if (index >= 0 && index < 4) newFotos[index] = p.photo_url;
            }
          });
          setFotos(newFotos);
        }
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      toast({ title: 'ERRO AO CARREGAR VEÍCULO', variant: 'destructive' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    origem: '',
    tipo_entrada: '',
    guincho: '',
    placa_guincho: '',
    motorista: '',
    chave_principal: false,
    chave_reserva: false,
    step: false,
    macaco: false,
    triangulo: false,
    chave_roda: false,
    observacoes: '',
  });

  const [fotos, setFotos] = useState<string[]>(['', '', '', '']);
  const [fotoChassi, setFotoChassi] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGlobalCameraMode, setIsGlobalCameraMode] = useState(false);
  const [duplicateVehicleLoja, setDuplicateVehicleLoja] = useState<string | null>(null);
  const [duplicateVehicleOperator, setDuplicateVehicleOperator] = useState<string | null>(null);
  const [duplicateVehicleMatricula, setDuplicateVehicleMatricula] = useState<string | null>(null);
  const [duplicateVehicleDate, setDuplicateVehicleDate] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelChange = async (value: string) => {
    handleChange('modelo', value);
    
    if (!value) return;

    // Check if model exists in current list (case insensitive)
    const modelExists = carModels.some(m => m.value.toUpperCase() === value.toUpperCase());
    
    if (!modelExists) {
        // Optimistically add to list
        const newModel = { value: value.toUpperCase(), label: value.toUpperCase() };
        setCarModels(prev => [...prev, newModel].sort((a, b) => a.label.localeCompare(b.label)));

        // Save to DB
        try {
            const { error } = await supabase.from('car_models').insert({ model: value.toUpperCase() });
            if (!error) {
              toast({ 
                title: 'NOVO MODELO CADASTRADO', 
                description: `O modelo ${value.toUpperCase()} foi adicionado à lista.` 
              });
            }
        } catch (error) {
            console.error('Error saving new model:', error);
        }
    }
    
    // Focus Origem field
    setTimeout(() => {
        origemRef.current?.focus();
    }, 100);
  };

  const handleGuinchoChange = (value: string, data?: any) => {
    setFormData(prev => ({
      ...prev,
      guincho: value,
      placa_guincho: data?.placa || prev.placa_guincho,
      motorista: data?.motorista || prev.motorista
    }));

    if (!value) return;

    const guinchoExists = guinchos.some(g => g.name.toUpperCase() === value.toUpperCase());
    
    if (!guinchoExists) {
        toast({ 
          title: 'NOVO GUINCHO IDENTIFICADO', 
          description: `O guincho ${value.toUpperCase()} será registrado ao salvar.` 
        });
    }

    setTimeout(() => {
        placaGuinchoRef.current?.focus(); // Assuming placaGuinchoRef is attached to MaskedInput wrapper or input
    }, 100);
  };

  const handleFotoChange = (index: number, value: string) => {
    const newFotos = [...fotos];
    newFotos[index] = value;
    setFotos(newFotos);
  };

  const validatePlaca = (placa: string) => {
    // Old: ABC-1234
    // Mercosul: ABC1C34
    const regexOld = /^[A-Z]{3}-\d{4}$/;
    const regexMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    return regexOld.test(placa) || regexMercosul.test(placa);
  };

  const checkPlaca = async (placa: string) => {
    // Validação mínima de tamanho para evitar consultas desnecessárias
    if (placa.length < 7) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Não retorna se não tiver user, pois pode ser verificação offline ou apenas informativa, 
      // mas para pegar "userLoja" precisamos do user. 
      // O foco aqui é achar duplicidade.

      let userLoja = '';
      if (user) {
        userLoja = user.user_metadata?.loja;
        if (!userLoja) {
          const { data: profile } = await supabase.from('profiles').select('loja').eq('user_id', user.id).single();
          if (profile) userLoja = profile.loja;
        }
      }

      let query = supabase
        .from('vehicles')
        .select('id, loja, operator_name, user_id, created_at')
        .eq('placa', placa)
        .eq('status', 'entrada');

      if (isEditing && id) {
        query = query.neq('id', id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error checking placa:', error);
        return;
      }

      if (data) {
        let operatorName = data.operator_name;
        let operatorMatricula = '';
        
        // Buscar dados atualizados do perfil do usuário que cadastrou
        let vehicleLoja = data.loja;
        
        if (data.user_id) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('name, matricula, loja')
                .eq('user_id', data.user_id)
                .maybeSingle();
            
            if (profileData) {
                operatorName = profileData.name || operatorName;
                operatorMatricula = profileData.matricula || '';
                if (!vehicleLoja) vehicleLoja = profileData.loja;
            }
        }

        setDuplicateVehicleLoja(vehicleLoja || 'LOJA DESCONHECIDA');
        setDuplicateVehicleOperator(operatorName || 'DESCONHECIDO');
        setDuplicateVehicleMatricula(operatorMatricula);
        
        // Formatar data
        if (data.created_at) {
            const date = new Date(data.created_at);
            setDuplicateVehicleDate(date.toLocaleString('pt-BR'));
        } else {
            setDuplicateVehicleDate(null);
        }

        setShowDuplicateModal(true);
      }
    } catch (error) {
      console.error('Error checking placa:', error);
    }
  };

  const allItems = ['chave_principal', 'chave_reserva', 'step', 'macaco', 'triangulo', 'chave_roda'];
  const isAllSelected = allItems.every(item => formData[item as keyof typeof formData]);

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => {
      const newData = { ...prev };
      allItems.forEach(item => {
        // @ts-ignore
        newData[item] = checked;
      });
      return newData;
    });
  };

  const scrollToElement = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const nextStep = () => {
    if (currentStep === 0) {
      if (!validatePlaca(formData.placa)) {
        toast({ title: 'PLACA INVÁLIDA', variant: 'destructive' });
        return;
      }
      if (!formData.modelo || !formData.origem || !formData.guincho || !formData.motorista) {
        toast({ title: 'PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS', variant: 'destructive' });
        return;
      }
    }
    
    setCurrentStep(prev => prev + 1);
    
    // Scroll to the next section
    if (currentStep === 0) scrollToElement('card-items');
    if (currentStep === 1) scrollToElement('card-obs');
    if (currentStep === 2) scrollToElement('card-photos');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePlaca(formData.placa)) {
      toast({ title: 'PLACA INVÁLIDA. USE O FORMATO ABC-1234 OU ABC1C34', variant: 'destructive' });
      return;
    }

    if (!formData.modelo || !formData.origem || !formData.guincho || !formData.motorista) {
      toast({ title: 'PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'USUÁRIO NÃO AUTENTICADO', variant: 'destructive' });
        return;
      }

      // Fetch user name for operator_name and loja
      let operatorName = user.user_metadata?.name;
      let loja = user.user_metadata?.loja;

      if (!operatorName || !loja) {
         const { data: profile } = await supabase.from('profiles').select('name, loja').eq('user_id', user.id).single();
         if (profile) {
            operatorName = operatorName || profile.name;
            loja = loja || profile.loja;
         }
      }

      // Check for duplicate placa again to be safe
      let duplicateQuery = supabase
        .from('vehicles')
        .select('id, loja, operator_name')
        .eq('placa', formData.placa)
        .eq('status', 'entrada');
      
      if (isEditing && id) {
        duplicateQuery = duplicateQuery.neq('id', id);
      }
        
      const { data: duplicate } = await duplicateQuery.maybeSingle();

      if (duplicate) {
        setDuplicateVehicleLoja(duplicate.loja || loja || 'LOJA DESCONHECIDA');
        setDuplicateVehicleOperator(duplicate.operator_name || 'DESCONHECIDO');
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      let vehicleId = id;

      if (isEditing && id) {
        // Update
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({
            loja: loja,
            placa: formData.placa,
            modelo: formData.modelo,
            origem: formData.origem,
            tipo_entrada: formData.tipo_entrada,
            guincho: formData.guincho,
            placa_guincho: formData.placa_guincho || null,
            motorista: formData.motorista,
            chave_principal: formData.chave_principal,
            chave_reserva: formData.chave_reserva,
            step: formData.step,
            macaco: formData.macaco,
            triangulo: formData.triangulo,
            chave_roda: formData.chave_roda,
            observacoes: formData.observacoes,
          })
          .eq('id', id);
          
        if (updateError) throw updateError;
        
        // Clear existing photos to re-insert
        await supabase.from('vehicle_photos').delete().eq('vehicle_id', id);
      } else {
        // Insert
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            user_id: user.id,
            operator_name: operatorName,
            loja: loja,
            placa: formData.placa,
            modelo: formData.modelo,
            origem: formData.origem,
            tipo_entrada: formData.tipo_entrada,
            guincho: formData.guincho,
            placa_guincho: formData.placa_guincho || null,
            motorista: formData.motorista,
            chave_principal: formData.chave_principal,
            chave_reserva: formData.chave_reserva,
            step: formData.step,
            macaco: formData.macaco,
            triangulo: formData.triangulo,
            chave_roda: formData.chave_roda,
            observacoes: formData.observacoes,
            status: 'entrada',
          })
          .select()
          .single();

        if (vehicleError) throw vehicleError;
        vehicleId = vehicleData.id;
      }

      // Save photos
      // @ts-ignore
      const photosToSave = fotos.filter(f => f).map((url, index) => ({
        vehicle_id: vehicleId,
        photo_url: url,
        photo_type: `foto_${index + 1}`,
      }));

      if (fotoChassi) {
        photosToSave.push({
          // @ts-ignore
          vehicle_id: vehicleId,
          photo_url: fotoChassi,
          photo_type: 'chassi',
        });
      }

      if (photosToSave.length > 0) {
        const { error: photosError } = await supabase
          .from('vehicle_photos')
          .insert(photosToSave);

        if (photosError) console.error('Error saving photos:', photosError);
      }

      if (requestId) {
        // Mark request as completed to hide it and stop notifications
        const { error: requestError } = await supabase
          .from('app_requests')
          .update({ 
            status: 'completed',
            notified: true // Ensure it doesn't notify again just in case
          })
          .eq('id', requestId);
          
        if (requestError) console.error('Error updating request status:', requestError);
      } else {
        // Try to find any pending/approved request for this plate and mark as completed
        // This covers manual entry without clicking the "Realizar Entrada" button
        const { data: requests } = await supabase
          .from('app_requests')
          .select('id')
          .eq('placa', formData.placa)
          .neq('status', 'completed');
          
        if (requests && requests.length > 0) {
           const { error: updateError } = await supabase
            .from('app_requests')
            .update({ 
              status: 'completed',
              notified: true 
            })
            .in('id', requests.map(r => r.id));
            
           if (updateError) console.error('Error auto-completing requests:', updateError);
        }
      }

      toast({ title: isEditing ? 'VEÍCULO ATUALIZADO COM SUCESSO!' : 'VEÍCULO CADASTRADO COM SUCESSO!' });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({ title: isEditing ? 'ERRO AO ATUALIZAR VEÍCULO' : 'ERRO AO CADASTRAR VEÍCULO', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{isEditing ? 'EDITAR VEÍCULO' : 'CADASTRO DE ENTRADA'}</h1>
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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          {/* Dados do Veículo */}
          <Card className="glass-card animate-fade-in" id="card-vehicle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-foreground">DADOS DO VEÍCULO</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-foreground border-border hover:bg-accent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                VOLTAR
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">PLACA *</Label>
                  <MaskedInput
                    ref={placaRef}
                    mask="placa"
                    placeholder="ABC-1234"
                    value={formData.placa}
                    onChange={(value) => {
                      handleChange('placa', value.toUpperCase());
                      if (value.length >= 7) {
                        checkPlaca(value.toUpperCase());
                      }
                    }}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">MODELO *</Label>
                  <CreatableSelect
                    options={carModels}
                    value={formData.modelo}
                    onChange={(value) => handleModelChange(value)}
                    placeholder="SELECIONE OU DIGITE NOVO MODELO"
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">ORIGEM *</Label>
                  <CreatableSelect
                    ref={origemRef}
                    options={origens.map(o => ({ value: o, label: o }))}
                    value={formData.origem}
                    onChange={(value) => handleChange('origem', value)}
                    placeholder="SELECIONE OU DIGITE A ORIGEM"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">GUINCHO *</Label>
                  <CreatableSelect
                    options={guinchos.map(g => ({ value: g.name, label: g.name, data: g }))}
                    value={formData.guincho}
                    onChange={handleGuinchoChange}
                    placeholder="SELECIONE OU DIGITE O GUINCHO"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">PLACA DO GUINCHO</Label>
                  <MaskedInput
                    ref={placaGuinchoRef}
                    mask="placa"
                    placeholder="ABC-1234"
                    value={formData.placa_guincho}
                    onChange={(value) => handleChange('placa_guincho', value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">NOME DO MOTORISTA *</Label>
                  <UppercaseInput
                    placeholder="NOME COMPLETO"
                    value={formData.motorista}
                    onChange={(e) => handleChange('motorista', e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {isMobile && !isEditing && currentStep === 0 && (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="w-full gradient-primary text-primary-foreground mt-4"
                >
                  PRÓXIMO
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Tipo de Entrada */}
          {(!isMobile || isEditing || currentStep >= 1) && (
            <Card className="glass-card animate-fade-in mb-4" style={{ animationDelay: '0.05s' }}>
              <CardHeader>
                <CardTitle className="text-foreground">DADOS DE ENTRADA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-foreground">TIPO DE ENTRADA</Label>
                  <CreatableSelect
                    options={tiposEntrada.map(t => ({ value: t, label: t }))}
                    value={formData.tipo_entrada}
                    onChange={(value) => handleChange('tipo_entrada', value)}
                    placeholder="SELECIONE OU DIGITE O TIPO"
                    className="uppercase"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Itens */}
          {(!isMobile || isEditing || currentStep >= 1) && (
            <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }} id="card-items">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-foreground">ITENS DO VEÍCULO</CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="select-all" className="text-foreground text-sm cursor-pointer font-medium">
                    MARCAR TODOS
                  </Label>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'chave_principal', label: 'CHAVE PRINCIPAL' },
                    { key: 'chave_reserva', label: 'CHAVE RESERVA' },
                    { key: 'step', label: 'STEP' },
                    { key: 'macaco', label: 'MACACO' },
                    { key: 'triangulo', label: 'TRIÂNGULO' },
                    { key: 'chave_roda', label: 'CHAVE DE RODA' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.key}
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onCheckedChange={(checked) => handleChange(item.key, checked as boolean)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label htmlFor={item.key} className="text-foreground text-sm cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>

                {isMobile && !isEditing && currentStep === 1 && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="w-full gradient-primary text-primary-foreground mt-6"
                  >
                    PRÓXIMO
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {(!isMobile || isEditing || currentStep >= 2) && (
            <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }} id="card-obs">
              <CardHeader>
                <CardTitle className="text-foreground">OBSERVAÇÕES</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="OBSERVAÇÕES ADICIONAIS SOBRE O VEÍCULO..."
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value.toUpperCase())}
                  rows={4}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none uppercase"
                />

                {isMobile && !isEditing && currentStep === 2 && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="w-full gradient-primary text-primary-foreground mt-4"
                  >
                    PRÓXIMO
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fotos */}
          {(!isMobile || isEditing || currentStep >= 3) && (
            <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.3s' }} id="card-photos">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  FOTOS DO VEÍCULO
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="camera-mode" className="text-foreground text-sm cursor-pointer font-medium">
                    {isGlobalCameraMode ? 'CÂMERA' : 'UPLOAD'}
                  </Label>
                  <Switch
                    id="camera-mode"
                    checked={isGlobalCameraMode}
                    onCheckedChange={setIsGlobalCameraMode}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {fotos.map((foto, index) => {
                    const labels = ['FRENTE', 'TRASEIRA', 'LATERAL DIREITA', 'LATERAL ESQUERDA'];
                    return (
                      <PhotoUpload
                        key={index}
                        label={labels[index]}
                        value={foto}
                        onChange={(url) => handleFotoChange(index, url)}
                        isCameraMode={isGlobalCameraMode}
                      />
                    );
                  })}
                </div>
                <PhotoUpload
                  label="FOTO DO CHASSI"
                  value={fotoChassi}
                  onChange={setFotoChassi}
                  isCameraMode={isGlobalCameraMode}
                />
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          {(!isMobile || isEditing || currentStep >= 3) && (
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 text-lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'SALVANDO...' : (isEditing ? 'SALVAR ALTERAÇÕES' : 'SALVAR ENTRADA')}
            </Button>
          )}
        </form>
      </main>

      <AlertDialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold text-xl">VEÍCULO JÁ CADASTRADO</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground text-lg space-y-1">
              <div>
                A PLACA <span className="font-bold">{formData.placa}</span> JÁ ESTÁ CADASTRADA NA: <span className="font-bold text-primary">{duplicateVehicleLoja}</span>
              </div>
              <div>
                POR: <span className="font-bold text-primary">{duplicateVehicleOperator} {duplicateVehicleMatricula && ` - ${duplicateVehicleMatricula}`}</span>
              </div>
              {duplicateVehicleDate && (
                <div>
                  DATA: <span className="font-bold text-primary">{duplicateVehicleDate}</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowDuplicateModal(false);
                handleChange('placa', '');
                setTimeout(() => placaRef.current?.focus(), 100);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              ENTENDI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cadastro;

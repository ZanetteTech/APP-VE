import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Car, Plus, Search, LogOut, Phone, ArrowRightLeft, FileText, MessageSquare, ArrowLeft, Share2, ClipboardList, Menu, ExternalLink, BarChart3, Filter, LayoutGrid, List, Edit, Trash2, RotateCcw, Lock, Check, Settings } from 'lucide-react';
import { VehicleEntry } from '@/types/vehicle';
import { toast } from 'sonner';
import VehicleCard from '@/components/VehicleCard';
import ExitModal from '@/components/ExitModal';
import PhoneManager from '@/components/PhoneManager';
import ReportModal from '@/components/ReportModal';
import BalanceModal from '@/components/BalanceModal';
import ExternalLinkModal from '@/components/ExternalLinkModal';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';
import { MaskedInput } from '@/components/MaskedInput';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isFeatureEnabled } = useSystemFeatures();
  const [searchPlaca, setSearchPlaca] = useState('');
  const [vehicles, setVehicles] = useState<VehicleEntry[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPhoneManager, setShowPhoneManager] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
  const [whatsAppModalStep, setWhatsAppModalStep] = useState<'type-selection' | 'phone-selection'>('type-selection');
  const [whatsAppVehicle, setWhatsAppVehicle] = useState<VehicleEntry | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<{id: string; name: string; phone: string}[]>([]);
  const [userMatricula, setUserMatricula] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('CADASTRO');
  const [userLoja, setUserLoja] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleEntry | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vehicleToRevert, setVehicleToRevert] = useState<VehicleEntry | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLockAlert, setShowLockAlert] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchedPlate, setSearchedPlate] = useState('');
  const [viewLoja, setViewLoja] = useState<string>('TODOS');
  const [availableLojas, setAvailableLojas] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [appRequests, setAppRequests] = useState<any[]>([]);
  const [requestToApprove, setRequestToApprove] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [myApprovedRequests, setMyApprovedRequests] = useState<any[]>([]);
  const [showApprovedListModal, setShowApprovedListModal] = useState(false);

  const loadVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);

      let matricula = user.user_metadata?.matricula;
      let name = user.user_metadata?.name;
      let loja = user.user_metadata?.loja || '';
      let role = user.user_metadata?.role || '';

      // Force fetch from profiles if any critical data is missing
      if (!matricula || !name || !loja || !role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('matricula, name, loja, role')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          matricula = matricula || profile.matricula;
          name = name || profile.name;
          loja = loja || profile.loja;
          role = role || profile.role || 'CADASTRO';
        }
      }

      // If loja is still empty, try to infer from matricula or set a default
      // if (!loja && role !== 'PESQUISA') {
      //    loja = 'LOJA NÃO DEFINIDA';
      // }

      if (role === 'PESQUISA' && !loja) loja = 'TODAS';

      if (matricula) setUserMatricula(matricula);
      if (name) setUserName(name);
      if (loja) setUserLoja(loja);
      if (role) setUserRole(role);

      // Always fetch my approved requests, regardless of role
      let myRequestsQuery = supabase
        .from('app_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('user_id', user.id) // Ensure we only get requests for the current user
        .order('created_at', { ascending: false });

      const { data: myRequests } = await myRequestsQuery;
      
      let filteredRequests = myRequests || [];
      
      // Filter out requests that are already registered (same logic as ExternalLinkModal)
      if (filteredRequests.length > 0) {
        const plates = filteredRequests.map(r => r.placa);
        const { data: existingVehicles } = await supabase
          .from('vehicles')
          .select('placa')
          .in('placa', plates);
          
        const existingPlates = new Set(existingVehicles?.map(v => v.placa) || []);
        filteredRequests = filteredRequests.filter(r => !existingPlates.has(r.placa));
      }

      console.log('My Approved Requests (Filtered):', filteredRequests); // Debug log
      setMyApprovedRequests(filteredRequests);

      if (role === 'GESTAO_APP') {
        console.log('Fetching app_requests for GESTAO_APP...');
        // Carregar solicitações
        const { data: requestsData, error: requestsError } = await supabase
          .from('app_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (requestsError) {
          console.error('Error fetching app_requests:', requestsError);
          toast.error(`Erro ao carregar solicitações: ${requestsError.message}`);
        } else {
          console.log('app_requests fetched:', requestsData);
          console.log('Number of requests:', requestsData?.length);
        }

        setAppRequests(requestsData || []);

        // Carregar TODOS os veículos (similar ao PESQUISA)
        let query = supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: vehiclesData, error } = await query;
        if (error) throw error;

        // Extrair lojas disponíveis
        if (vehiclesData) {
          const lojas = Array.from(new Set(vehiclesData.map(v => v.loja).filter(Boolean))) as string[];
          setAvailableLojas(lojas);
        }

        // Carregar fotos
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
      } else {
        // Only load vehicles if not GESTAO_APP (already handled above)
        
        let query = supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false });

        if (role !== 'PESQUISA' && loja) {
          query = query.eq('loja', loja);
        } else if (role !== 'PESQUISA') {
          query = query.eq('user_id', user.id);
        }

        const { data: vehiclesData, error } = await query;

        if (error) throw error;

        // Extract unique lojas for PESQUISA user
        if (role === 'PESQUISA' && vehiclesData) {
          const lojas = Array.from(new Set(vehiclesData.map(v => v.loja).filter(Boolean))) as string[];
          setAvailableLojas(lojas);
          if (viewLoja === 'TODOS' || !viewLoja) {
            // Keep TODOS
          }
        }

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
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('ERRO AO CARREGAR VEÍCULOS');
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

  const checkNotifications = async (uid: string) => {
    try {
      // Check if notified column exists by trying to select it. 
      // If it doesn't, this query will fail, but we catch it.
      // However, to avoid 400 error in console, we can just select * and filter in JS if needed,
      // OR better, ensure migration is applied.
      // Assuming migration applied, let's log the error if any.
      
      const { data: notifications, error } = await supabase
        .from('app_requests')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'approved')
        .eq('notified', false);
      
      if (error) {
        // If error is about missing column, we might ignore it or log it differently
        if (error.code === '42703') { // Undefined column
           console.warn('Column notified does not exist on app_requests yet.');
           return;
        }
        console.error('Error checking notifications:', error);
        return;
      }
        
      if (notifications && notifications.length > 0) {
        // Double check against existing vehicles before showing notification
        const plates = notifications.map(n => n.placa);
        const { data: existingVehicles } = await supabase
          .from('vehicles')
          .select('placa')
          .in('placa', plates);
          
        const existingPlates = new Set(existingVehicles?.map(v => v.placa) || []);
        
        // Notifications to show (vehicles not yet registered)
        const notificationsToShow = notifications.filter(n => !existingPlates.has(n.placa));
        
        // Notifications to silent complete (vehicles already registered)
        const notificationsToSilent = notifications.filter(n => existingPlates.has(n.placa));
        
        if (notificationsToSilent.length > 0) {
           await supabase
             .from('app_requests')
             .update({ status: 'completed', notified: true })
             .in('id', notificationsToSilent.map(n => n.id));
        }

        notificationsToShow.forEach(async (notification) => {
          toast.success(`SOLICITAÇÃO APROVADA: A placa ${notification.placa} foi aprovada! Você já pode dar entrada no sistema.`, {
            duration: 10000,
            style: {
              background: '#22c55e',
              color: 'white',
              border: 'none'
            }
          });
          
          await supabase
            .from('app_requests')
            .update({ notified: true })
            .eq('id', notification.id);
        });
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const handleApproveRequest = (request: any) => {
    setRequestToApprove(request);
    setShowApproveDialog(true);
  };

  const confirmApproveRequest = async () => {
    if (!requestToApprove) return;

    try {
      const { error } = await supabase
        .from('app_requests')
        .update({ status: 'approved' })
        .eq('id', requestToApprove.id);

      if (error) throw error;

      toast.success('SOLICITAÇÃO APROVADA');
      
      const { data: requestsData } = await supabase
        .from('app_requests')
        .select('*')
        .order('created_at', { ascending: false });
      setAppRequests(requestsData || []);

    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('ERRO AO APROVAR SOLICITAÇÃO');
    } finally {
      setShowApproveDialog(false);
      setRequestToApprove(null);
    }
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
      checkNotifications(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      } else if (event === 'SIGNED_IN' && session) {
        checkNotifications(session.user.id);
      }
    });

    // Realtime subscription
    const channel = supabase
      .channel('app_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_requests',
        },
        (payload: any) => {
          const currentRole = userRoleRef.current;
          const currentLoja = userLojaRef.current;

          // Handle NEW requests (INSERT)
          if (payload.eventType === 'INSERT') {
            if (currentRole === 'GESTAO_APP') {
              setAppRequests(prev => [payload.new, ...prev]);
              toast.info(`NOVA SOLICITAÇÃO: Placa ${payload.new.placa}`);
            }
          }

          // Handle UPDATES (Approved, etc)
          if (payload.eventType === 'UPDATE') {
             if (payload.new.status === 'approved' && payload.old.status !== 'approved') {
               supabase.auth.getUser().then(async ({ data: { user } }) => {
                  if (!user) return;
  
                  if (currentRole !== 'GESTAO_APP') {
                      // Verifica se a solicitação pertence à loja do usuário (ou se usuário vê tudo)
                      const requestLoja = payload.new.sigla_patio;
                      const isLojaMatch = !currentLoja || currentLoja === 'TODAS' || currentLoja === 'LOJA NÃO DEFINIDA' || currentLoja === requestLoja;
  
                      if (isLojaMatch) {
                          toast.success(`NOVA APROVAÇÃO: Placa ${payload.new.placa} disponível para cadastro!`, {
                              duration: 8000,
                              style: {
                                background: '#22c55e',
                                color: 'white',
                                border: 'none'
                              }
                          });
                          
                          setMyApprovedRequests(prev => {
                              // Evitar duplicatas
                              if (prev.find(r => r.id === payload.new.id)) return prev;
                              return [payload.new, ...prev];
                          });
                          
                          // Se for o próprio solicitante, marca como notificado
                          if (user.id === payload.new.user_id) {
                               await supabase
                                  .from('app_requests')
                                  .update({ notified: true })
                                  .eq('id', payload.new.id);
                          }
                      }
                  } else {
                    // If admin, update the list item
                    setAppRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
                  }
               });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
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

  const handleDelete = (vehicle: VehicleEntry) => {
    setVehicleToDelete(vehicle);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete.id);

      if (error) throw error;

      toast.success("VEÍCULO EXCLUÍDO: O veículo foi removido com sucesso.");
      
      await loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error("ERRO AO EXCLUIR: Não foi possível excluir o veículo.");
    } finally {
      setShowDeleteDialog(false);
      setVehicleToDelete(null);
    }
  };

  const handleSearch = () => {
    if (!searchPlaca) {
      toast.error("Por favor, digite a placa para pesquisar.", {
        style: {
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none'
        }
      });
      return;
    }
    
    setSearchedPlate(searchPlaca.toUpperCase());
    
    // Find the most recent entry for this plate
    // vehicles is already sorted by created_at desc
    const vehicle = vehicles.find(v => v.placa.toUpperCase() === searchPlaca.toUpperCase());
    
    setSelectedVehicle(vehicle || null);
    setShowSearchDialog(true);
    setSearchPlaca('');
  };

  const handleRevert = (vehicle: VehicleEntry) => {
    setVehicleToRevert(vehicle);
    setShowRevertDialog(true);
  };

  const confirmRevert = async () => {
    if (!vehicleToRevert) return;

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
        .eq('id', vehicleToRevert.id);

      if (error) throw error;

      toast.success('VEÍCULO REVERTIDO PARA O PÁTIO');
      await loadVehicles();
    } catch (error) {
      console.error('Error reverting vehicle:', error);
      toast.error('ERRO AO REVERTER VEÍCULO');
    } finally {
      setLoading(false);
      setShowRevertDialog(false);
      setVehicleToRevert(null);
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
    if (whatsAppVehicle.tipo_entrada) {
      message += `🔖 *TIPO:* ${whatsAppVehicle.tipo_entrada}\n`;
    }
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
      const labels = ['FRENTE', 'TRASEIRA', 'LATERAL DIREITA', 'LATERAL ESQUERDA'];
      message += `\n📷 *FOTOS DO VEÍCULO:*\n`;
      whatsAppVehicle.fotos.forEach((foto, index) => {
        if (foto) message += `${labels[index] || `FOTO ${index + 1}`}: ${foto}\n`;
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

  const filteredVehicles = vehicles.filter(v => {
    if (userRole === 'PESQUISA') {
      if (viewLoja && viewLoja !== 'TODOS') {
        return v.loja === viewLoja;
      }
      return true;
    }
    return true;
  });

  const entradas = filteredVehicles.filter(v => v.status === 'entrada');
  const saidas = filteredVehicles.filter(v => v.status === 'saida');

  return (
    <div className="min-h-screen gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground leading-none truncate hidden sm:block">SISTEMA DE PÁTIO</h1>
              <h1 className="text-xl font-bold text-foreground leading-none truncate sm:hidden">PÁTIO</h1>
              {userMatricula && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {userName ? `${userName.split(' ')[0]} - ` : ''}MAT-{userMatricula} {userLoja && userLoja !== 'undefined' ? `LJ ${userLoja}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Filter by Loja for Pesquisa User */}
            {userRole === 'PESQUISA' && availableLojas.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 px-2 sm:px-4">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[150px] truncate">
                      {viewLoja === 'TODOS' ? 'TODOS OS PÁTIOS' : viewLoja}
                    </span>
                    <span className="sm:hidden">
                      {viewLoja === 'TODOS' ? 'TODOS' : viewLoja}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewLoja('TODOS')}>
                    TODOS OS PÁTIOS
                  </DropdownMenuItem>
                  {availableLojas.map((loja) => (
                    <DropdownMenuItem key={loja} onClick={() => setViewLoja(loja)}>
                      {loja}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              {userRole !== 'PESQUISA' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2 border-primary/20 hover:bg-primary/10 relative"
                    >
                      <Menu className="w-4 h-4" />
                      MENU
                      {myApprovedRequests.length > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                            {myApprovedRequests.length}
                          </span>
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 gap-2 flex flex-col">
                    {isFeatureEnabled('menu_nova_entrada') && (
                      <DropdownMenuItem 
                        onClick={() => navigate('/cadastro')} 
                        className="cursor-pointer py-2.5"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        NOVA ENTRADA
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_inclusao_placas') && (
                      <DropdownMenuItem 
                        onClick={() => setShowExternalLinkModal(true)} 
                        className="cursor-pointer py-2.5 relative"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        INCLUSÃO PLACAS
                        {myApprovedRequests.length > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {myApprovedRequests.length}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_relatorios') && (
                      <DropdownMenuItem 
                        onClick={() => setShowReportModal(true)} 
                        className="cursor-pointer py-2.5"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        RELATÓRIOS
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_balanco') && (
                      <DropdownMenuItem 
                        onClick={() => setShowBalanceModal(true)} 
                        className="cursor-pointer py-2.5"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        BALANÇO MENSAL
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_inventario') && (
                      <DropdownMenuItem 
                        onClick={() => navigate('/inventory')} 
                        className="cursor-pointer py-2.5"
                      >
                        <ClipboardList className="w-4 h-4 mr-2" />
                        INVENTÁRIO
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_telefone') && (
                      <DropdownMenuItem 
                        onClick={() => setShowPhoneManager(true)} 
                        className="cursor-pointer py-2.5"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        TELEFONE
                      </DropdownMenuItem>
                    )}

                    {isFeatureEnabled('menu_solicitacoes') && (
                      <DropdownMenuItem 
                        onClick={() => setShowRequestsModal(true)} 
                        className="cursor-pointer py-2.5 relative"
                      >
                        <ClipboardList className="w-4 h-4 mr-2" />
                        SOLICITAÇÕES
                        {appRequests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {appRequests.filter(r => r.status === 'pending').length}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}

                    {(userRole === 'GESTAO_APP' || userRole === 'ADMIN') && (
                      <>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem 
                          onClick={() => navigate('/settings')} 
                          className="cursor-pointer py-2.5"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          CONFIGURAÇÕES
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="destructive" onClick={handleLogout} className="hover:bg-destructive/80">
                <LogOut className="w-4 h-4 mr-2" />
                SAIR
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              {userRole !== 'PESQUISA' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Menu className="w-6 h-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
                    {isFeatureEnabled('menu_nova_entrada') && (
                      <DropdownMenuItem onClick={() => navigate('/cadastro')} className="py-3">
                        <Plus className="w-4 h-4 mr-2" />
                        NOVA ENTRADA
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_inclusao_placas') && (
                      <DropdownMenuItem onClick={() => setShowExternalLinkModal(true)} className="py-3">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        INCLUSÃO PLACAS
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_relatorios') && (
                      <DropdownMenuItem onClick={() => setShowReportModal(true)} className="py-3">
                        <FileText className="w-4 h-4 mr-2" />
                        RELATÓRIOS
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_balanco') && (
                      <DropdownMenuItem onClick={() => setShowBalanceModal(true)} className="py-3">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        BALANÇO MENSAL
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_inventario') && (
                      <DropdownMenuItem onClick={() => navigate('/inventory')} className="py-3">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        INVENTÁRIO
                      </DropdownMenuItem>
                    )}
                    {isFeatureEnabled('menu_telefone') && (
                      <DropdownMenuItem onClick={() => setShowPhoneManager(true)} className="py-3">
                        <Phone className="w-4 h-4 mr-2" />
                        TELEFONE
                      </DropdownMenuItem>
                    )}
                    
                    {isFeatureEnabled('menu_solicitacoes') && (
                      <DropdownMenuItem onClick={() => setShowRequestsModal(true)} className="py-3 relative">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        SOLICITAÇÕES
                        {appRequests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {appRequests.filter(r => r.status === 'pending').length}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    
                    {(userRole === 'GESTAO_APP' || userRole === 'ADMIN') && (
                      <DropdownMenuItem onClick={() => navigate('/settings')} className="py-3">
                        <Settings className="w-4 h-4 mr-2" />
                        CONFIGURAÇÕES
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-white focus:bg-destructive py-3">
                      <LogOut className="w-4 h-4 mr-2" />
                      SAIR
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive/80"
                  onClick={handleLogout}
                >
                  <LogOut className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-2 grid-cols-3">
          <Card className="glass-card">
            <CardContent className="p-2 md:p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] md:text-sm truncate">TOTAL</p>
                <p className="text-lg md:text-2xl font-bold text-foreground leading-none">{vehicles.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2 md:p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5 md:w-6 md:h-6 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] md:text-sm truncate">NO PÁTIO</p>
                <p className="text-lg md:text-2xl font-bold text-foreground leading-none">{entradas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-2 md:p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] md:text-sm truncate">SAÍDAS</p>
                <p className="text-lg md:text-2xl font-bold text-foreground leading-none">{saidas.length}</p>
              </div>
            </CardContent>
          </Card>

          {myApprovedRequests.length > 0 && userRole !== 'GESTAO_APP' && (
            <Card 
              className="glass-card cursor-pointer hover:bg-accent/50 transition-colors border-green-500/50"
              onClick={() => setShowApprovedListModal(true)}
            >
              <CardContent className="p-2 md:p-4 flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-center md:text-left">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0 relative">
                  <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] md:text-sm truncate">APROVAÇÕES</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground leading-none">{myApprovedRequests.length}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-row gap-2 items-center">
          <div className="flex gap-2 flex-1 min-w-0">
            <MaskedInput
              mask="placa"
              placeholder="BUSCAR"
              value={searchPlaca}
              onChange={setSearchPlaca}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
            />
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex bg-secondary p-1 rounded-lg shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-10 px-3"
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-10 px-3"
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="registros" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary h-auto p-1">
            <TabsTrigger value="registros" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 md:py-1.5 h-auto">
              <span className="mr-2 truncate text-xs md:text-sm">REGISTROS</span>
              <span className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.5rem] flex items-center justify-center">
                {entradas.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="saidas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 md:py-1.5 h-auto">
              <span className="mr-2 truncate text-xs md:text-sm">SAÍDAS</span>
              <span className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.5rem] flex items-center justify-center">
                {saidas.length}
              </span>
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
              ) : viewMode === 'table' ? (
                <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>PLACA</TableHead>
                        <TableHead className="hidden md:table-cell">MODELO</TableHead>
                        <TableHead className="hidden md:table-cell">LOJA</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="hidden md:table-cell">DATA ENTRADA</TableHead>
                        <TableHead className="text-right">AÇÕES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entradas.map((vehicle) => {
                        const isLocked = vehicle.status === 'entrada' && !!vehicle.solicitante_nome;
                        return (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-bold">{vehicle.placa}</TableCell>
                            <TableCell className="hidden md:table-cell">{vehicle.modelo}</TableCell>
                            <TableCell className="hidden md:table-cell">{vehicle.loja}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={isLocked ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}>
                                {isLocked ? 'SAÍDA SOLICITADA' : 'NO PÁTIO'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {new Date(vehicle.data_entrada).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {userRole !== 'PESQUISA' && (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(vehicle)} title="WhatsApp">
                                      <MessageSquare className="w-4 h-4 text-green-500" />
                                    </Button>
                                    {isLocked ? (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setShowLockAlert(true)}
                                        title="Bloqueado - Clique para desbloquear"
                                      >
                                        <Lock className="w-4 h-4 text-red-500" />
                                      </Button>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)} title="Editar">
                                          <Edit className="w-4 h-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleExit(vehicle)} title="Registrar Saída">
                                          <LogOut className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {entradas.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onWhatsApp={userRole !== 'PESQUISA' ? handleWhatsApp : undefined}
                    onExit={userRole !== 'PESQUISA' ? handleExit : undefined}
                    onEdit={userRole !== 'PESQUISA' ? handleEdit : undefined}
                    onDelete={userRole !== 'PESQUISA' ? handleDelete : undefined}
                    hideActions={userRole === 'PESQUISA'}
                    currentUser={{ name: userName, matricula: userMatricula, role: userRole }}
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
              ) : viewMode === 'table' ? (
                <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>PLACA</TableHead>
                        <TableHead className="hidden md:table-cell">MODELO</TableHead>
                        <TableHead className="hidden md:table-cell">DESTINO</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="hidden md:table-cell">DATA SAÍDA</TableHead>
                        <TableHead className="text-right">AÇÕES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saidas.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-bold">{vehicle.placa}</TableCell>
                          <TableCell className="hidden md:table-cell">{vehicle.modelo}</TableCell>
                          <TableCell className="hidden md:table-cell">{vehicle.destino || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">SAÍDA</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {vehicle.data_saida ? new Date(vehicle.data_saida).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {userRole !== 'PESQUISA' && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(vehicle)} title="WhatsApp">
                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                  </Button>
                                  {userId === vehicle.user_id && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRevert(vehicle)} title="Reverter Entrada">
                                      <RotateCcw className="w-4 h-4 text-orange-500" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(vehicle)} title="Excluir Histórico">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {saidas.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onWhatsApp={userRole !== 'PESQUISA' ? handleWhatsApp : undefined}
                    onRevert={userRole !== 'PESQUISA' ? handleRevert : undefined}
                    onDelete={userRole !== 'PESQUISA' ? handleDelete : undefined}
                    hideActions={userRole === 'PESQUISA'}
                    currentUser={{ name: userName, matricula: userMatricula, role: userRole }}
                  />
                ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Search Result Modal */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="glass-card border-border w-[95%] max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">RESULTADO DA BUSCA</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedVehicle ? (
              <>
                <div className={`p-4 rounded-lg border ${
                  selectedVehicle.status === 'entrada' 
                    ? 'bg-success/20 border-success/50' 
                    : 'bg-destructive/20 border-destructive/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedVehicle.status === 'entrada' ? (
                      <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                        <Car className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
                        <LogOut className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className={`font-bold text-lg ${
                        selectedVehicle.status === 'entrada' ? 'text-success' : 'text-destructive'
                      }`}>
                        {selectedVehicle.status === 'entrada' ? 'VEÍCULO NO PÁTIO' : 'VEÍCULO JÁ SAIU'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedVehicle.status === 'entrada' 
                          ? `Entrada: ${new Date(selectedVehicle.data_entrada).toLocaleString('pt-BR')}`
                          : `Saída: ${selectedVehicle.data_saida ? new Date(selectedVehicle.data_saida).toLocaleString('pt-BR') : 'N/A'}`
                        }
                      </p>
                      {selectedVehicle.loja && selectedVehicle.loja !== 'undefined' && selectedVehicle.loja !== 'null' && (
                        <p className="text-xs font-bold mt-1 text-foreground uppercase bg-secondary/50 px-2 py-0.5 rounded-md inline-block">
                          LOJA: {selectedVehicle.loja}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">PLACA</p>
                    <p className="font-medium text-foreground">{selectedVehicle.placa}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MODELO</p>
                    <p className="font-medium text-foreground">{selectedVehicle.modelo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MOTORISTA</p>
                    <p className="font-medium text-foreground">{selectedVehicle.motorista}</p>
                  </div>
                   <div>
                    <p className="text-muted-foreground">ORIGEM</p>
                    <p className="font-medium text-foreground">{selectedVehicle.origem}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">NENHUM REGISTRO ENCONTRADO</h3>
                <p className="text-muted-foreground mt-2">
                  Não encontramos nenhum histórico para a placa <span className="font-bold text-foreground">{searchedPlate}</span>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSearchDialog(false)} className="w-full sm:w-auto">
              FECHAR
            </Button>
            {selectedVehicle && selectedVehicle.status === 'entrada' && userRole !== 'PESQUISA' && (
              <Button 
                onClick={() => {
                  setShowSearchDialog(false);
                  handleExit(selectedVehicle);
                }}
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                REGISTRAR SAÍDA
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[90%] sm:max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o veículo {vehicleToDelete?.placa} e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              EXCLUIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="w-[90%] sm:max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              SAIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent className="w-[90%] sm:max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente reverter?</AlertDialogTitle>
            <AlertDialogDescription>
              O veículo {vehicleToRevert?.placa} voltará para o status de ENTRADA (NO PÁTIO). Todos os dados de saída serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRevertDialog(false)}>CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert}>
              REVERTER
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLockAlert} onOpenChange={setShowLockAlert}>
        <AlertDialogContent className="w-[90%] sm:max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" />
              VEÍCULO BLOQUEADO
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este veículo está aguardando liberação. Para realizar o desbloqueio ou visualizar os dados, é necessário alternar para o modo de visualização em CARDS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLockAlert(false)}>CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowLockAlert(false);
              setViewMode('grid');
            }}>
              IR PARA MODO CARDS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        vehicles={vehicles} 
      />

      <BalanceModal 
        isOpen={showBalanceModal} 
        onClose={() => setShowBalanceModal(false)} 
        vehicles={vehicles} 
      />

      <ExternalLinkModal 
        isOpen={showExternalLinkModal} 
        onClose={() => setShowExternalLinkModal(false)}
        userId={userId}
        userLoja={userLoja}
        onSelectRequestForEntry={(request) => {
          setShowExternalLinkModal(false);
          // Usando Query Params para garantir persistência dos dados
          const params = new URLSearchParams();
          if (request.id) params.append('requestId', request.id);
          if (request.placa) params.append('placa', request.placa);
          if (request.modelo) params.append('modelo', request.modelo);
          
          navigate(`/cadastro?${params.toString()}`);
        }}
      />

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar a solicitação para a placa <strong>{requestToApprove?.placa}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApproveRequest} className="bg-green-600 hover:bg-green-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showApprovedListModal} onOpenChange={setShowApprovedListModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitações Aprovadas</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PLACA</TableHead>
                <TableHead>MODELO</TableHead>
                <TableHead>DATA APROVAÇÃO</TableHead>
                <TableHead className="text-right">AÇÃO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myApprovedRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-bold">{req.placa}</TableCell>
                  <TableCell>{req.modelo}</TableCell>
                  <TableCell>{new Date(req.updated_at || req.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowApprovedListModal(false);
                        navigate('/cadastro', { 
                          state: { 
                            approvedRequest: req
                          } 
                        });
                      }}
                    >
                      CONFIRMAR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      <Dialog open={showRequestsModal} onOpenChange={setShowRequestsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              SOLICITAÇÕES DE CADASTRO
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>PLACA</TableHead>
                  <TableHead>MARCA</TableHead>
                  <TableHead>MODELO</TableHead>
                  <TableHead>SIGLA PÁTIO</TableHead>
                  <TableHead>DATA SOLICITAÇÃO</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      NENHUMA SOLICITAÇÃO PENDENTE
                    </TableCell>
                  </TableRow>
                ) : (
                  appRequests
                    .filter(request => request.status === 'pending')
                    .map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-bold">{request.placa}</TableCell>
                      <TableCell>{request.marca}</TableCell>
                      <TableCell>{request.modelo}</TableCell>
                      <TableCell>{request.sigla_patio}</TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="uppercase">
                          PENDENTE
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApproveRequest(request)}
                          title="Aprovar Solicitação"
                          className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white rounded-md"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

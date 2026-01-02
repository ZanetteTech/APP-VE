import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, User, Search, Shield, Check, X, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  matricula: string;
  role: string;
  loja?: string;
}

const FeatureSettings = () => {
  const navigate = useNavigate();
  const { features: systemFeatures, loading: loadingFeatures } = useSystemFeatures();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Delete State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'all'>('single');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setUserOverrides({});
      return;
    }

    const fetchUserFeatures = async () => {
      try {
        const { data, error } = await supabase
          .from('user_feature_states')
          .select('*')
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;

        const overrides: Record<string, boolean> = {};
        if (data) {
          data.forEach((f: any) => {
            overrides[f.feature_key] = f.is_active;
          });
        }
        setUserOverrides(overrides);
      } catch (error) {
        console.error('Error fetching user features:', error);
        toast.error('Erro ao carregar permissões do usuário');
      }
    };

    fetchUserFeatures();
  }, [selectedUser]);

  const handleToggle = async (featureKey: string) => {
    if (!selectedUser) return;

    const globalFeature = systemFeatures.find(f => f.feature_key === featureKey);
    const globalState = globalFeature?.is_active ?? true;
    const currentEffectiveState = featureKey in userOverrides ? userOverrides[featureKey] : globalState;
    const newState = !currentEffectiveState;

    try {
      const { error } = await supabase
        .from('user_feature_states')
        .upsert({
          user_id: selectedUser.user_id,
          feature_key: featureKey,
          is_active: newState
        }, { onConflict: 'user_id, feature_key' });

      if (error) throw error;

      setUserOverrides(prev => ({ ...prev, [featureKey]: newState }));
      toast.success('Permissão atualizada com sucesso');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.matricula?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Delete Handlers
  const initiateDeleteSingle = (user: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserToDelete(user);
    setDeleteTarget('single');
    setShowDeleteDialog(true);
  };

  const initiateDeleteAll = () => {
    if (filteredUsers.length === 0) return;
    setDeleteTarget('all');
    setShowDeleteDialog(true);
  };

  const confirmDeleteInitial = () => {
    setShowDeleteDialog(false);
    setPassword('');
    setShowPasswordDialog(true);
  };

  const executeDelete = async () => {
    if (!password) {
      toast.error('Por favor, digite sua senha.');
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Verify Password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('Usuário não autenticado');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        toast.error('Senha incorreta.');
        setIsDeleting(false);
        return;
      }

      // 2. Perform Deletion via RPC
      let userIdsToDelete: string[] = [];
      if (deleteTarget === 'single' && userToDelete) {
        userIdsToDelete = [userToDelete.user_id];
      } else if (deleteTarget === 'all') {
        userIdsToDelete = filteredUsers.map(u => u.user_id);
      }

      if (userIdsToDelete.length === 0) return;

      const { error: deleteError } = await supabase.rpc('delete_users', {
        target_user_ids: userIdsToDelete
      });

      if (deleteError) throw deleteError;

      toast.success(deleteTarget === 'single' ? 'Usuário excluído com sucesso!' : 'Usuários excluídos com sucesso!');
      setShowPasswordDialog(false);
      setUserToDelete(null);
      if (selectedUser && userIdsToDelete.includes(selectedUser.user_id)) {
        setSelectedUser(null);
      }
      fetchUsers();

    } catch (error: any) {
      console.error('Error deleting user(s):', error);
      const errorMessage = error?.message || (error instanceof Error ? error.message : 'Erro desconhecido');
      
      if (errorMessage && errorMessage.includes('function') && errorMessage.includes('not found')) {
         toast.error('Erro de configuração: Função de exclusão não encontrada. Atualize o banco de dados.');
      } else {
         toast.error(`Erro ao excluir: ${errorMessage}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configurações de Acesso
          </h1>
          <p className="text-muted-foreground">
            Gerencie as permissões e visibilidade de recursos por usuário.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Users List Sidebar */}
        <Card className="md:col-span-4 lg:col-span-3 flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Usuários
              </CardTitle>
              {filteredUsers.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={initiateDeleteAll}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir Todos
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-1 p-2">
                {loadingUsers ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4 text-sm">Nenhum usuário encontrado</p>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`group flex items-center gap-2 p-2 rounded-lg transition-colors text-sm cursor-pointer
                        ${selectedUser?.id === user.id 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-secondary/50'
                        }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-bold
                        ${selectedUser?.id === user.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {user.name || 'Sem Nome'}
                        </div>
                        <div className="text-xs opacity-70 truncate">Matrícula: {user.matricula}</div>
                        {user.loja && <div className="text-[10px] opacity-60">Loja: {user.loja}</div>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => initiateDeleteSingle(user, e)}
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Feature Management Area */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-4 overflow-hidden h-full">
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-card/30 border border-border/50 rounded-xl p-8 text-center">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium mb-2">Selecione um Usuário</h3>
              <p>Escolha um usuário na lista ao lado para gerenciar suas permissões de acesso.</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6 pb-10">
                <div className="flex items-center justify-between bg-card/50 p-4 rounded-xl border border-border/50">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      {selectedUser.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Gerenciando permissões para {selectedUser.matricula} ({selectedUser.role})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(userOverrides).length} Personalizações
                    </Badge>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={(e) => initiateDeleteSingle(selectedUser, e)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Usuário
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {loadingFeatures ? (
                    <div className="col-span-full text-center py-10">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p>Carregando funcionalidades...</p>
                    </div>
                  ) : (
                    systemFeatures.map((feature) => {
                      const isOverridden = feature.feature_key in userOverrides;
                      const isActive = isOverridden ? userOverrides[feature.feature_key] : feature.is_active;
                      
                      return (
                        <Card key={feature.id} className={`transition-all duration-200 ${!isActive ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                          <CardHeader className="pb-3 space-y-1">
                            <CardTitle className="text-base font-medium leading-none">{feature.label}</CardTitle>
                            <CardDescription className="text-xs line-clamp-2" title={feature.description}>
                              {feature.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between gap-2">
                              <Label 
                                htmlFor={`switch-${feature.id}`} 
                                className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none
                                  ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}
                              >
                                {isActive ? (
                                  <><Check className="w-3 h-3" /> ATIVO</>
                                ) : (
                                  <><X className="w-3 h-3" /> INATIVO</>
                                )}
                              </Label>
                              <Switch
                                id={`switch-${feature.id}`}
                                checked={isActive}
                                onCheckedChange={() => handleToggle(feature.feature_key)}
                              />
                            </div>
                            {isOverridden && (
                              <p className="text-[10px] text-primary mt-2 text-right italic">
                                * Personalizado para usuário
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'single' 
                ? `Tem certeza que deseja excluir o usuário ${userToDelete?.name}? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja excluir TODOS os ${filteredUsers.length} usuários listados? Esta ação é irreversível e removerá permanentemente os acessos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInitial} className="bg-destructive hover:bg-destructive/90">
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Modal */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmação de Segurança</DialogTitle>
            <CardDescription>
              Para excluir {deleteTarget === 'single' ? 'este usuário' : 'estes usuários'}, por favor confirme sua senha de administrador.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sua Senha</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={executeDelete} 
              disabled={isDeleting || !password}
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureSettings;

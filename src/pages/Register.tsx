import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, UserPlus, ArrowLeft, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loja, setLoja] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (value: string) => {
    setRole(value);
    if (value === 'PESQUISA') {
      // Focus on name input when switching to PESQUISA
      setTimeout(() => {
        const nameInput = document.getElementById('name');
        if (nameInput) nameInput.focus();
      }, 0);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Skip validation for loja if role is PESQUISA or GESTAO_APP
    const isLojaValid = (role === 'PESQUISA' || role === 'GESTAO_APP') ? true : !!loja;

    if (!name || !matricula || !isLojaValid || !password || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos.", {
        style: {
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none'
        }
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('AS SENHAS NÃO COINCIDEM');
      return;
    }

    if (password.length < 6) {
      toast.error('A SENHA DEVE TER NO MÍNIMO 6 CARACTERES');
      return;
    }

    setLoading(true);
    try {
      // Create user with email format from matricula
      const email = `${matricula.toLowerCase()}@sistema.local`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            matricula: matricula.toUpperCase(),
            name: name.toUpperCase(),
            loja: (role === 'PESQUISA' || role === 'GESTAO_APP') ? 'TODAS' : loja.toUpperCase(),
            role: role,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('MATRÍCULA JÁ CADASTRADA');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Profile is created automatically by database trigger
        await supabase.auth.signOut(); // Ensure user is not logged in so they land on Login page
        toast.success('CADASTRO REALIZADO COM SUCESSO!');
        navigate('/login', { state: { focusMatricula: true } });
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('ERRO AO CADASTRAR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/login')}
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            VOLTAR
          </Button>
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            NOVO CADASTRO
          </CardTitle>
          <p className="text-muted-foreground">CRIAR CONTA DE ACESSO</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-foreground">TIPO DE USUÁRIO</Label>
                  <Select value={role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="SELECIONE O TIPO" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CADASTRO">USUÁRIO CADASTRO</SelectItem>
                      <SelectItem value="PESQUISA">USUÁRIO PESQUISA</SelectItem>
                      <SelectItem value="GESTAO_APP">GESTÃO APP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">NOME COMPLETO</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="SEU NOME"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase pr-10"
                    />
                    {name && (
                      <button
                        type="button"
                        onClick={() => setName('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matricula" className="text-foreground">MATRÍCULA</Label>
                  <div className="relative">
                    <Input
                      id="matricula"
                      type="text"
                      placeholder="SUA MATRÍCULA"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase pr-10"
                    />
                    {matricula && (
                      <button
                        type="button"
                        onClick={() => setMatricula('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {role !== 'PESQUISA' && role !== 'GESTAO_APP' && (
                  <div className="space-y-2">
                    <Label htmlFor="loja" className="text-foreground">LOJA</Label>
                    <div className="relative">
                      <Input
                        id="loja"
                        type="text"
                        placeholder="SUA LOJA"
                        value={loja}
                        onChange={(e) => setLoja(e.target.value.toUpperCase())}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase pr-10"
                      />
                      {loja && (
                        <button
                          type="button"
                          onClick={() => setLoja('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">SENHA</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">CONFIRMAR SENHA</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'CADASTRANDO...' : 'CADASTRAR'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [matricula, setMatricula] = useState('');
  const [availableMatriculas, setAvailableMatriculas] = useState<string[]>([]);
  const [loadingMatriculas, setLoadingMatriculas] = useState(true);
  const [useManualInput, setUseManualInput] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const fetchMatriculas = async () => {
      try {
        setLoadingMatriculas(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('matricula')
          .order('matricula');
        
        if (error) {
          console.error('Error fetching matriculas:', error);
          setUseManualInput(true);
          return;
        }

        if (data && data.length > 0) {
          const uniqueMatriculas = Array.from(new Set(data.map(p => p.matricula).filter(Boolean)));
          setAvailableMatriculas(uniqueMatriculas);
          if (uniqueMatriculas.length === 0) {
             setUseManualInput(true);
          }
        } else {
          setUseManualInput(true);
        }
      } catch (error) {
        console.error('Error fetching matriculas:', error);
        setUseManualInput(true);
      } finally {
        setLoadingMatriculas(false);
      }
    };
    fetchMatriculas();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matricula || !password) {
      toast.error("Por favor, preencha a matrícula e a senha.", {
        style: {
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none'
        }
      });
      return;
    }

    setLoading(true);
    try {
      const email = `${matricula.toLowerCase()}@sistema.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('MATRÍCULA OU SENHA INCORRETOS');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('LOGIN REALIZADO COM SUCESSO!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('ERRO AO FAZER LOGIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            SISTEMA DE PÁTIO
          </CardTitle>
          <p className="text-muted-foreground">CONTROLE DE ENTRADA E SAÍDA</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="matricula" className="text-foreground">MATRÍCULA</Label>
                {!loadingMatriculas && availableMatriculas.length > 0 && (
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => setUseManualInput(!useManualInput)}
                  >
                    {useManualInput ? 'Selecionar da lista' : 'Digitar manualmente'}
                  </Button>
                )}
              </div>
              
              {useManualInput || (loadingMatriculas && availableMatriculas.length === 0) ? (
                 <div className="relative">
                 <Input
                   id="matricula"
                   type="text"
                   placeholder="SUA MATRÍCULA"
                   value={matricula}
                   onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                   className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase"
                   disabled={loadingMatriculas && !useManualInput}
                 />
                 </div>
              ) : (
                <Select value={matricula} onValueChange={setMatricula}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue placeholder="SELECIONE SUA MATRÍCULA" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMatriculas.map((mat) => (
                      <SelectItem key={mat} value={mat}>
                        {mat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
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
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </Button>
            <div className="text-center">
              <Link to="/register" className="text-sm text-primary hover:underline">
                NÃO TEM CONTA? CADASTRE-SE
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  const [loja, setLoja] = useState('');
  const [availableMatriculas, setAvailableMatriculas] = useState<string[]>([]);
  const [availableLojas, setAvailableLojas] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<{matricula: string, loja: string}[]>([]);
  const [loadingMatriculas, setLoadingMatriculas] = useState(true);
  const [useManualInput, setUseManualInput] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  // Inactivity timer
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        navigate('/home');
      }, 60000); // 1 minute
    };

    // Initial start
    resetTimer();

    // Event listeners for user activity
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keypress', resetTimer); // Adding keypress as well for better UX
    window.addEventListener('mousemove', resetTimer); // Adding mousemove as well

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMatriculas(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('matricula, loja')
          .order('matricula');
        
        if (error) {
          console.error('Error fetching profiles:', error);
          setUseManualInput(true);
          return;
        }

        if (data && data.length > 0) {
          const validProfiles = data.filter(p => p.matricula);
          setAllProfiles(validProfiles);
          
          // Extract unique lojas
          const uniqueLojas = Array.from(new Set(validProfiles.map(p => p.loja).filter(Boolean)));
          setAvailableLojas(uniqueLojas.sort());

          // Initial available matriculas (all)
          const uniqueMatriculas = Array.from(new Set(validProfiles.map(p => p.matricula)));
          setAvailableMatriculas(uniqueMatriculas);

          if (uniqueMatriculas.length === 0) {
             setUseManualInput(true);
          }
        } else {
          setUseManualInput(true);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
        setUseManualInput(true);
      } finally {
        setLoadingMatriculas(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loja && loja !== 'ALL') {
      const filtered = allProfiles
        .filter(p => p.loja === loja)
        .map(p => p.matricula);
      setAvailableMatriculas(Array.from(new Set(filtered)));
      setMatricula(''); // Reset matricula when store changes
    } else if (allProfiles.length > 0) {
      // If no store selected or ALL, show all
      const all = allProfiles.map(p => p.matricula);
      setAvailableMatriculas(Array.from(new Set(all)));
    }
  }, [loja, allProfiles]);

  useEffect(() => {
    if (!loadingMatriculas && location.state?.focusMatricula) {
      setTimeout(() => {
        const manualInput = document.getElementById('matricula');
        const selectTrigger = document.getElementById('matricula-trigger');
        
        if (manualInput) {
          manualInput.focus();
        } else if (selectTrigger) {
          selectTrigger.focus();
        }
      }, 100);
    }
  }, [loadingMatriculas, location.state]);

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
            {availableLojas.length > 0 && !useManualInput && (
              <div className="space-y-2">
                <Label htmlFor="loja-filter" className="text-foreground">LOJA</Label>
                <Select value={loja || 'ALL'} onValueChange={setLoja}>
                  <SelectTrigger id="loja-filter" className="bg-input border-border text-foreground">
                    <SelectValue placeholder="SELECIONE SUA LOJA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">TODAS AS LOJAS</SelectItem>
                    {availableLojas.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                  <SelectTrigger id="matricula-trigger" className="bg-input border-border text-foreground">
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

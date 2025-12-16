import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, UserPlus, ArrowLeft, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matricula || !password || !confirmPassword) {
      toast({ title: 'PREENCHA TODOS OS CAMPOS', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'AS SENHAS NÃO COINCIDEM', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'A SENHA DEVE TER NO MÍNIMO 6 CARACTERES', variant: 'destructive' });
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
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({ title: 'MATRÍCULA JÁ CADASTRADA', variant: 'destructive' });
        } else {
          toast({ title: error.message, variant: 'destructive' });
        }
        return;
      }

      if (data.user) {
        // Create profile with matricula
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            matricula: matricula.toUpperCase(),
          });

        if (profileError) {
          console.error('Profile error:', profileError);
        }

        toast({ title: 'CADASTRO REALIZADO COM SUCESSO!' });
        navigate('/login');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast({ title: 'ERRO AO CADASTRAR', variant: 'destructive' });
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

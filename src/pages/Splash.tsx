import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Splash = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const checkSessionAndNavigate = async () => {
      try {
        // Pequeno delay inicial para mostrar o logo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setFadeOut(true);
        
        // Aguarda a animação de fade out
        await new Promise(resolve => setTimeout(resolve, 500));

        // Adiciona timeout para o getSession
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (data?.session) {
          navigate('/dashboard');
        } else {
          navigate('/home');
        }
      } catch (error) {
        console.error('Erro no splash:', error);
        // Fallback seguro
        navigate('/home');
      }
    };

    checkSessionAndNavigate();
  }, [navigate]);

  return (
    <div className={`min-h-screen gradient-dark flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="animate-pulse">
        <div className="w-24 h-24 gradient-primary rounded-3xl flex items-center justify-center mb-6 mx-auto">
          <Car className="w-12 h-12 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground text-center mb-2">
          SISTEMA DE PÁTIO
        </h1>
        <p className="text-muted-foreground text-center">
          CONTROLE DE ENTRADA E SAÍDA
        </p>
      </div>
      <div className="mt-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default Splash;

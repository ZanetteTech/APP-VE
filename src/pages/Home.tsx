import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-dark flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 animate-fade-in">
        <div className="w-32 h-32 gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
          <Car className="w-16 h-16 text-primary-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            SISTEMA DE PÁTIO
          </h1>
          <p className="text-xl text-muted-foreground">
            CONTROLE DE ENTRADA E SAÍDA DE VEÍCULOS
          </p>
        </div>

        <div className="space-y-4 max-w-xs mx-auto">
          <Button 
            onClick={() => navigate('/login')}
            className="w-full h-14 text-lg gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            ACESSAR
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground">
            FAÇA LOGIN PARA CONTINUAR
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

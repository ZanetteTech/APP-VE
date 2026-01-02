import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleEntry } from '@/types/vehicle';
import { useToast } from '@/hooks/use-toast';
import { Car, Check, X } from 'lucide-react';
import { MaskedInput } from '@/components/MaskedInput';
import { UppercaseInput } from '@/components/UppercaseInput';
import { supabase } from '@/integrations/supabase/client';
import CreatableSelect from '@/components/CreatableSelect';
import { useHistoricalData } from '@/hooks/useHistoricalData';

interface ExitModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: VehicleEntry;
  onUpdate: () => void;
}

const ExitModal = ({ open, onClose, vehicle, onUpdate }: ExitModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'confirm' | 'form'>('confirm');
  const { guinchos, destinos } = useHistoricalData();
  const destinoRef = useRef<HTMLButtonElement>(null);
  const solicitanteRef = useRef<HTMLInputElement>(null);
  
  const [exitData, setExitData] = useState({
    destino: '',
    empresa_guincho_saida: '',
    placa_guincho_saida: '',
    motorista_saida: '',
    solicitante: '',
  });

  useEffect(() => {
    if (vehicle.solicitante_nome && open) {
      setExitData(prev => ({
        ...prev,
        solicitante: vehicle.solicitante_nome || '',
        destino: vehicle.solicitacao_destino || '',
      }));
    }
  }, [vehicle, open]);

  useEffect(() => {
    if (step === 'form' && open) {
      setTimeout(() => {
        destinoRef.current?.focus();
      }, 100);
    }
  }, [step, open]);

  const handleConfirm = () => {
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!exitData.destino || !exitData.empresa_guincho_saida || !exitData.motorista_saida || !exitData.solicitante) {
      toast({ title: 'PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let operatorName = user?.user_metadata?.name;
      if (user && !operatorName) {
         const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', user.id).single();
         if (profile) operatorName = profile.name;
      }

      const { error } = await supabase
        .from('vehicles')
        .update({
          ...exitData,
          status: 'saida',
          data_saida: new Date().toISOString(),
          exit_operator_name: operatorName,
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      toast({ title: 'SAÍDA REGISTRADA COM SUCESSO!' });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({ title: 'ERRO AO REGISTRAR SAÍDA', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setExitData({
      destino: '',
      empresa_guincho_saida: '',
      placa_guincho_saida: '',
      motorista_saida: '',
      solicitante: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {step === 'confirm' ? 'CONFIRMAR SAÍDA' : 'DADOS DE SAÍDA'}
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' ? (
          <>
            <Card className="bg-secondary/50 border-border">
              <CardContent className="p-4 space-y-2">
                <p className="text-foreground"><strong>PLACA:</strong> {vehicle.placa}</p>
                <p className="text-foreground"><strong>MODELO:</strong> {vehicle.modelo}</p>
                <p className="text-foreground"><strong>ORIGEM:</strong> {vehicle.origem}</p>
                <p className="text-foreground"><strong>GUINCHO ENTRADA:</strong> {vehicle.guincho}</p>
                {vehicle.placa_guincho && (
                  <p className="text-foreground"><strong>PLACA GUINCHO:</strong> {vehicle.placa_guincho}</p>
                )}
                <p className="text-foreground"><strong>MOTORISTA ENTRADA:</strong> {vehicle.motorista}</p>
                {vehicle.solicitante_nome && (
                  <div className="mt-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="font-bold text-yellow-800 dark:text-yellow-400">⚠️ SOLICITAÇÃO DE SAÍDA</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-500">SOLICITANTE: {vehicle.solicitante_nome}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-500">DESTINO: {vehicle.solicitacao_destino}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-500">DATA PREVISTA: {vehicle.solicitacao_data_retirada ? new Date(vehicle.solicitacao_data_retirada).toLocaleString('pt-BR') : '-'}</p>
                  </div>
                )}
                <p className="text-muted-foreground text-sm mt-2">
                  ENTRADA EM {new Date(vehicle.data_entrada).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
            <p className="text-foreground text-center">DESEJA REGISTRAR A SAÍDA DESTE VEÍCULO?</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} className="border-border text-foreground">
                <X className="w-4 h-4 mr-2" />
                CANCELAR
              </Button>
              <Button onClick={handleConfirm} className="gradient-primary text-primary-foreground">
                <Check className="w-4 h-4 mr-2" />
                SIM, REGISTRAR SAÍDA
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">DESTINO *</Label>
                <CreatableSelect
                  ref={destinoRef}
                  options={destinos.map(d => ({ value: d, label: d }))}
                  value={exitData.destino}
                  onChange={(val) => setExitData(prev => ({ ...prev, destino: val }))}
                  placeholder="SELECIONE OU DIGITE O DESTINO"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">EMPRESA GUINCHO *</Label>
                <CreatableSelect
                  options={guinchos.map(g => ({ value: g.name, label: g.name, data: g }))}
                  value={exitData.empresa_guincho_saida}
                  onChange={(val, data) => {
                    setExitData(prev => ({
                      ...prev,
                      empresa_guincho_saida: val,
                      placa_guincho_saida: data?.placa || prev.placa_guincho_saida,
                      motorista_saida: data?.motorista || prev.motorista_saida
                    }));
                    setTimeout(() => solicitanteRef.current?.focus(), 100);
                  }}
                  placeholder="SELECIONE OU DIGITE O GUINCHO"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">PLACA DO GUINCHO</Label>
                <MaskedInput
                  mask="placa"
                  placeholder="ABC-1234"
                  value={exitData.placa_guincho_saida}
                  onChange={(value) => setExitData(prev => ({ ...prev, placa_guincho_saida: value }))}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">MOTORISTA *</Label>
                <UppercaseInput
                  placeholder="NOME DO MOTORISTA"
                  value={exitData.motorista_saida}
                  onChange={(e) => setExitData(prev => ({ ...prev, motorista_saida: e.target.value }))}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">SOLICITANTE *</Label>
                <UppercaseInput
                  ref={solicitanteRef}
                  placeholder="NOME DO SOLICITANTE"
                  value={exitData.solicitante}
                  onChange={(e) => setExitData(prev => ({ ...prev, solicitante: e.target.value }))}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} className="border-border text-foreground">
                CANCELAR
              </Button>
              <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
                SALVAR SAÍDA
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExitModal;

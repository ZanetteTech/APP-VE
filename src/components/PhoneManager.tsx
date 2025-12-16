import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/MaskedInput';
import { UppercaseInput } from '@/components/UppercaseInput';
import { Phone, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhoneNumber {
  id: string;
  name: string;
  phone: string;
}

interface PhoneManagerProps {
  open: boolean;
  onClose: () => void;
}

const PhoneManager = ({ open, onClose }: PhoneManagerProps) => {
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPhones = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading phones:', error);
      return;
    }

    setPhones(data || []);
  };

  useEffect(() => {
    if (open) {
      loadPhones();
    }
  }, [open]);

  const handleAdd = async () => {
    if (!newName || !newPhone) {
      toast({ title: 'PREENCHA TODOS OS CAMPOS', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('phone_numbers')
        .insert({
          user_id: user.id,
          name: newName,
          phone: newPhone,
        });

      if (error) throw error;

      toast({ title: 'TELEFONE ADICIONADO COM SUCESSO!' });
      setNewName('');
      setNewPhone('');
      loadPhones();
    } catch (error) {
      console.error('Error adding phone:', error);
      toast({ title: 'ERRO AO ADICIONAR TELEFONE', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('phone_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'TELEFONE REMOVIDO!' });
      loadPhones();
    } catch (error) {
      console.error('Error deleting phone:', error);
      toast({ title: 'ERRO AO REMOVER TELEFONE', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            GERENCIAR TELEFONES
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-secondary/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-foreground">ADICIONAR NOVO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-foreground text-xs">NOME</Label>
                <UppercaseInput
                  placeholder="NOME DO CONTATO"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground text-xs">TELEFONE</Label>
                <MaskedInput
                  mask="phone"
                  placeholder="(##)#####-####"
                  value={newPhone}
                  onChange={setNewPhone}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button 
                onClick={handleAdd} 
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                ADICIONAR
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {phones.map((phone) => (
              <div 
                key={phone.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border"
              >
                <div>
                  <p className="text-foreground font-medium">{phone.name}</p>
                  <p className="text-muted-foreground text-sm">{phone.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(phone.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {phones.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                NENHUM TELEFONE CADASTRADO
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">
            <X className="w-4 h-4 mr-2" />
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneManager;

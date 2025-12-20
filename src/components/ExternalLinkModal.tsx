import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Trash2, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ExternalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'car_diary_external_link';

export default function ExternalLinkModal({ isOpen, onClose }: ExternalLinkModalProps) {
  const [link, setLink] = useState('');
  const [savedLink, setSavedLink] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedLink = localStorage.getItem(STORAGE_KEY);
      if (storedLink) {
        setSavedLink(storedLink);
        setLink(storedLink);
        setIsEditing(false);
      } else {
        setSavedLink('');
        setLink('');
        setIsEditing(true);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!link) {
      toast.error('Por favor, insira um link válido.');
      return;
    }

    // Basic URL validation
    try {
      new URL(link);
    } catch (_) {
      toast.error('Por favor, insira uma URL válida (ex: https://...).');
      return;
    }

    localStorage.setItem(STORAGE_KEY, link);
    setSavedLink(link);
    setIsEditing(false);
    toast.success('Link salvo com sucesso!');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedLink('');
    setLink('');
    setIsEditing(true);
    toast.success('Link removido com sucesso!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border w-[95%] max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              INCLUSÃO DE PLACAS
            </span>
            {savedLink && !isEditing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleEdit} className="text-muted-foreground hover:text-foreground">
                  <Edit className="w-4 h-4 mr-1" />
                  EDITAR
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1" />
                  EXCLUIR
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative bg-background/50">
          {(!savedLink || isEditing) ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-url">Link do Formulário</Label>
                  <Input
                    id="link-url"
                    placeholder="Cole o link aqui (https://...)"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave} className="w-full gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  SALVAR LINK
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={savedLink}
              className="w-full h-full border-none"
              title="External Form"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

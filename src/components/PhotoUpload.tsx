import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CameraModal from './CameraModal';

interface PhotoUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  isCameraMode: boolean;
}

const PhotoUpload = ({ label, value, onChange, isCameraMode }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'SELECIONE UMA IMAGEM VÁLIDA', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast({ title: 'FOTO ENVIADA COM SUCESSO!' });
    } catch (error) {
      console.error('Error uploading:', error);
      toast({ title: 'ERRO AO ENVIAR FOTO', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleClick = () => {
    if (uploading) return;
    
    if (isCameraMode) {
      setShowCamera(true);
    } else {
      inputRef.current?.click();
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-foreground text-sm font-medium">{label}</label>
      </div>

      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={uploadFile}
      />

      {value ? (
        <div className="relative">
          <img 
            src={value} 
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          onClick={handleClick}
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              {isCameraMode ? (
                <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <span className="text-sm text-muted-foreground">
                {isCameraMode ? 'TIRAR FOTO' : 'ESCOLHER DA GALERIA'}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;

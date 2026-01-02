import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraModal = ({ isOpen, onClose, onCapture }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stopCamera();
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'ERRO AO ACESSAR CÂMERA',
        description: 'Verifique as permissões de acesso à câmera.',
        variant: 'destructive'
      });
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-black border-none">
        <div className="relative h-[80vh] w-full flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="flex-1 w-full h-full object-cover"
          />
          
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12 border-white/20 bg-black/30 text-white hover:bg-black/50"
              onClick={toggleCamera}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-white hover:bg-gray-200 border-4 border-gray-300"
              onClick={handleCapture}
            >
              <div className="h-12 w-12 rounded-full border-2 border-black/10" />
            </Button>
            
            <div className="w-12" /> {/* Spacer to balance layout */}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraModal;

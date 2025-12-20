import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Share2, Car, Calendar, MapPin, LogOut, RotateCcw, Edit, MoreVertical, Trash2, Eye, Printer, Mail, Info, Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VehicleEntry } from '@/types/vehicle';
import { generatePDF, getPDFContent } from '@/utils/pdfGenerator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


interface VehicleCardProps {
  vehicle: VehicleEntry;
  onWhatsApp?: (vehicle: VehicleEntry) => void;
  onExit?: (vehicle: VehicleEntry) => void;
  onRevert?: (vehicle: VehicleEntry) => void;
  onEdit?: (vehicle: VehicleEntry) => void;
  onDelete?: (vehicle: VehicleEntry) => void;
}

const getTipoBadgeStyle = (tipo: string) => {
  const normalized = tipo.toUpperCase();
  if (normalized.includes('BATIDO')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  }
  if (normalized.includes('RECUPERADO')) {
    return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
  }
  return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
};

const VehicleCard = ({ vehicle, onWhatsApp, onExit, onRevert, onEdit, onDelete }: VehicleCardProps) => {
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [pdfContent, setPdfContent] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isPhotoCarouselOpen, setIsPhotoCarouselOpen] = useState(false);

  const allPhotos = [
    vehicle.foto_chassi ? { url: vehicle.foto_chassi, label: 'CHASSI' } : null,
    ...vehicle.fotos.filter(f => f).map((f, i) => ({ url: f, label: `FOTO ${i + 1}` }))
  ].filter(Boolean) as { url: string, label: string }[];

  const openCarousel = (photoUrl: string) => {
    const index = allPhotos.findIndex(p => p.url === photoUrl);
    if (index >= 0) {
      setSelectedPhotoIndex(index);
      setIsPhotoCarouselOpen(true);
    }
  };

  const nextPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev! + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) => (prev! - 1 + allPhotos.length) % allPhotos.length);
  };

  const handlePDF = () => {
    setShowPdfOptions(true);
  };

  const handlePrint = () => {
    generatePDF(vehicle);
    setShowPdfOptions(false);
  };

  const handleView = () => {
    const content = getPDFContent(vehicle);
    setPdfContent(content);
    setShowPdfOptions(false);
    setShowPdfPreview(true);
  };

  const handleShareWhatsAppPreview = () => {
    const text = `*RELATÓRIO DO VEÍCULO*\n\n` +
        `*PLACA:* ${vehicle.placa}\n` +
        `*MODELO:* ${vehicle.modelo}\n` +
        `*DATA:* ${new Date(vehicle.data_entrada).toLocaleString('pt-BR')}\n` +
        `*STATUS:* ${vehicle.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA'}\n\n` +
        `_Acesse o sistema para ver o relatório completo._`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareEmailPreview = () => {
    const subject = `RELATÓRIO - ${vehicle.placa}`;
    const body = `RELATÓRIO DO VEÍCULO\n\n` +
        `PLACA: ${vehicle.placa}\n` +
        `MODELO: ${vehicle.modelo}\n` +
        `DATA: ${new Date(vehicle.data_entrada).toLocaleString('pt-BR')}\n` +
        `STATUS: ${vehicle.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA'}\n\n` +
        `Acesse o sistema para ver o relatório completo.`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
  };

  const handleWhatsApp = () => {
    if (onWhatsApp) {
      onWhatsApp(vehicle);
    }
  };

  const checklistItems = [];
  if (vehicle.chave_principal) checklistItems.push('Chave Principal');
  if (vehicle.chave_reserva) checklistItems.push('Chave Reserva');
  if (vehicle.step) checklistItems.push('Step');
  if (vehicle.macaco) checklistItems.push('Macaco');
  if (vehicle.triangulo) checklistItems.push('Triângulo');
  if (vehicle.chave_roda) checklistItems.push('Chave de Roda');

  return (
    <>
      <Card className="glass-card hover:border-primary/50 transition-colors animate-fade-in relative">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-lg">{vehicle.placa}</h3>
                  <Badge 
                    variant={vehicle.status === 'entrada' ? 'default' : 'secondary'}
                    className={vehicle.status === 'entrada' 
                      ? 'bg-success/20 text-success border-success/30' 
                      : 'bg-destructive/20 text-destructive border-destructive/30'
                    }
                  >
                    {vehicle.status === 'entrada' ? 'NO PÁTIO' : 'SAÍDA'}
                  </Badge>
                </div>
                <p className="text-foreground">{vehicle.modelo}</p>
                {vehicle.tipo_entrada && (
                  <Badge variant="outline" className={`mt-1 mb-2 text-[10px] font-bold uppercase tracking-wider border ${getTipoBadgeStyle(vehicle.tipo_entrada)}`}>
                    {vehicle.tipo_entrada}
                  </Badge>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {vehicle.origem}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(vehicle.data_entrada).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    VER
                  </DropdownMenuItem>
                  {vehicle.status === 'entrada' && onExit && (
                    <DropdownMenuItem onClick={() => onExit(vehicle)} className="text-destructive focus:text-white focus:bg-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      SAÍDA
                    </DropdownMenuItem>
                  )}
                  {vehicle.status === 'saida' && onRevert && (
                    <DropdownMenuItem onClick={() => onRevert(vehicle)} className="text-orange-500 focus:text-white focus:bg-orange-500">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      REVERTER
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                      <Edit className="w-4 h-4 mr-2" />
                      EDITAR
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handlePDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleWhatsApp}>
                    <Share2 className="w-4 h-4 mr-2" />
                    WHATSAPP
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(vehicle)} className="text-destructive focus:text-white focus:bg-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      EXCLUIR
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>


          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              DETALHES DO VEÍCULO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-xs">DATA ENTRADA</span>
                  <span className="font-medium">{new Date(vehicle.data_entrada).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">ENTRADA POR</span>
                  <span className="font-medium">{vehicle.operator_name || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">ORIGEM</span>
                  <span className="font-medium">{vehicle.origem}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">TIPO DE ENTRADA</span>
                  <span className="font-medium">{vehicle.tipo_entrada || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">MOTORISTA</span>
                  <span className="font-medium">{vehicle.motorista}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">GUINCHO</span>
                  <span className="font-medium">{vehicle.guincho}</span>
                </div>
              </div>

              {vehicle.placa_guincho && (
                <div>
                  <span className="text-muted-foreground block text-xs">PLACA GUINCHO</span>
                  <span className="font-medium">{vehicle.placa_guincho}</span>
                </div>
              )}

              {checklistItems.length > 0 && (
                <div>
                  <span className="text-muted-foreground block text-xs">CHECKLIST</span>
                  <span className="font-medium text-xs leading-relaxed">
                    {checklistItems.join(', ')}
                  </span>
                </div>
              )}

              {vehicle.observacoes && (
                <div className="bg-secondary/50 p-2 rounded-md mt-2">
                  <span className="text-muted-foreground block text-xs mb-1">OBSERVAÇÕES</span>
                  <p className="text-xs italic">{vehicle.observacoes}</p>
                </div>
              )}

              {vehicle.status === 'saida' && (
                <div className="pt-2 border-t border-border mt-2 space-y-2">
                  <span className="font-semibold text-xs text-destructive flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> DADOS DE SAÍDA
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-xs">DATA SAÍDA</span>
                      <span className="font-medium">
                        {vehicle.data_saida ? new Date(vehicle.data_saida).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">SAÍDA POR</span>
                      <span className="font-medium">{vehicle.exit_operator_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">DESTINO</span>
                      <span className="font-medium">{vehicle.destino || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {(vehicle.fotos.some(f => f) || vehicle.foto_chassi) && (
                <div className="pt-2 border-t border-border mt-2 space-y-2">
                  <span className="font-semibold text-xs flex items-center gap-1">
                    <Camera className="w-3 h-3" /> FOTOS
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                     {vehicle.foto_chassi && (
                         <div className="relative aspect-square rounded-md overflow-hidden bg-muted group cursor-pointer" onClick={() => openCarousel(vehicle.foto_chassi)}>
                             <img src={vehicle.foto_chassi} alt="Chassi" className="object-cover w-full h-full transition-transform group-hover:scale-110" />
                             <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center">CHASSI</span>
                         </div>
                     )}
                     {vehicle.fotos.filter(f => f).map((foto, index) => (
                         <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted group cursor-pointer" onClick={() => openCarousel(foto)}>
                             <img src={foto} alt={`Foto ${index + 1}`} className="object-cover w-full h-full transition-transform group-hover:scale-110" />
                             <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center">FOTO {index + 1}</span>
                         </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfOptions} onOpenChange={setShowPdfOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">O QUE DESEJA FAZER?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button onClick={handleView} className="w-full gradient-primary text-primary-foreground h-12 text-lg">
              <Eye className="w-5 h-5 mr-2" />
              VISUALIZAR
            </Button>
            <Button onClick={handlePrint} variant="outline" className="w-full h-12 text-lg">
              <Printer className="w-5 h-5 mr-2" />
              IMPRIMIR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <div className="p-4 border-b flex items-center justify-between bg-[#1a472a]">
            <DialogTitle className="text-white">VISUALIZAÇÃO DO RELATÓRIO</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleShareWhatsAppPreview} className="bg-green-600 hover:bg-green-700 text-white border-green-700 hover:border-green-800 transition-all duration-200">
                <Share2 className="w-4 h-4 mr-2" />
                WHATSAPP
              </Button>
              <Button size="sm" onClick={handleShareEmailPreview} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700 hover:border-blue-800 transition-all duration-200">
                <Mail className="w-4 h-4 mr-2" />
                EMAIL
              </Button>
              <Button size="sm" onClick={() => { generatePDF(vehicle); }} className="bg-orange-600 hover:bg-orange-700 text-white border-orange-700 hover:border-orange-800 transition-all duration-200">
                <Printer className="w-4 h-4 mr-2" />
                IMPRIMIR
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div 
              className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-8 origin-top transform scale-100 md:scale-100"
              dangerouslySetInnerHTML={{ __html: pdfContent }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoCarouselOpen} onOpenChange={setIsPhotoCarouselOpen}>
        <DialogContent className="max-w-full h-full md:h-[90vh] md:max-w-4xl bg-black/95 border-none p-0 flex flex-col items-center justify-center">
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" onClick={() => setIsPhotoCarouselOpen(false)}>
              <X className="w-8 h-8" />
            </Button>
          </div>
          
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {allPhotos.length > 1 && (
                <Button 
                    variant="ghost" 
                    className="absolute left-2 md:left-4 text-white hover:bg-white/20 rounded-full p-2 h-auto z-50"
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                >
                    <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
                </Button>
            )}

            {selectedPhotoIndex !== null && allPhotos[selectedPhotoIndex] && (
                <div className="flex flex-col items-center justify-center max-h-full w-full">
                    <img 
                        src={allPhotos[selectedPhotoIndex].url} 
                        alt={allPhotos[selectedPhotoIndex].label} 
                        className="max-h-[80vh] max-w-full object-contain"
                    />
                    <p className="text-white mt-4 text-lg font-medium">
                        {allPhotos[selectedPhotoIndex].label} ({selectedPhotoIndex + 1}/{allPhotos.length})
                    </p>
                </div>
            )}

            {allPhotos.length > 1 && (
                <Button 
                    variant="ghost" 
                    className="absolute right-2 md:right-4 text-white hover:bg-white/20 rounded-full p-2 h-auto z-50"
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                >
                    <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
                </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VehicleCard;

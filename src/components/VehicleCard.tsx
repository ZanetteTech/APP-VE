import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Share2, Car, Calendar, MapPin, LogOut, RotateCcw, Edit, MoreVertical, Trash2, Eye, Printer, Mail } from 'lucide-react';
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

const VehicleCard = ({ vehicle, onWhatsApp, onExit, onRevert, onEdit, onDelete }: VehicleCardProps) => {
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfContent, setPdfContent] = useState('');

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

            {/* Mobile Menu */}
            <div className="absolute top-4 right-4 sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {vehicle.status === 'entrada' && onExit && (
                    <DropdownMenuItem onClick={() => onExit(vehicle)} className="text-destructive focus:text-white focus:bg-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      SAÍDA
                    </DropdownMenuItem>
                  )}
                  {vehicle.status === 'saida' && onRevert && (
                    <DropdownMenuItem onClick={() => onRevert(vehicle)} className="text-orange-500 focus:text-orange-500">
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

            {/* Desktop Buttons */}
            <div className="hidden sm:flex sm:flex-col gap-2">
              {vehicle.status === 'entrada' && onExit && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onExit(vehicle)}
                  className="hover:bg-destructive/90"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  SAÍDA
                </Button>
              )}
              {vehicle.status === 'saida' && onRevert && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onRevert(vehicle)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  REVERTER
                </Button>
              )}
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEdit(vehicle)}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  EDITAR
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePDF}
                className="border-border text-foreground hover:bg-secondary"
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleWhatsApp}
                className="border-border text-foreground hover:bg-secondary"
              >
                <Share2 className="w-4 h-4 mr-1" />
                WHATSAPP
              </Button>
              {onDelete && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(vehicle)}
                  className="hover:bg-destructive/90"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  EXCLUIR
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="p-4 border-b flex items-center justify-between bg-card">
            <DialogTitle>VISUALIZAÇÃO DO RELATÓRIO</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleShareWhatsAppPreview} className="bg-green-600 hover:bg-green-700 text-white">
                <Share2 className="w-4 h-4 mr-2" />
                WHATSAPP
              </Button>
              <Button size="sm" onClick={handleShareEmailPreview} variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                EMAIL
              </Button>
              <Button size="sm" onClick={() => { generatePDF(vehicle); }} variant="secondary">
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
    </>
  );
};

export default VehicleCard;

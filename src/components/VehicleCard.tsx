import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Share2, Car, Calendar, MapPin, LogOut, RotateCcw, Edit } from 'lucide-react';
import { VehicleEntry } from '@/types/vehicle';
import { generatePDF } from '@/utils/pdfGenerator';

interface VehicleCardProps {
  vehicle: VehicleEntry;
  onWhatsApp?: (vehicle: VehicleEntry) => void;
  onExit?: (vehicle: VehicleEntry) => void;
  onRevert?: (vehicle: VehicleEntry) => void;
  onEdit?: (vehicle: VehicleEntry) => void;
}

const VehicleCard = ({ vehicle, onWhatsApp, onExit, onRevert, onEdit }: VehicleCardProps) => {
  const handlePDF = () => {
    generatePDF(vehicle);
  };

  const handleWhatsApp = () => {
    if (onWhatsApp) {
      onWhatsApp(vehicle);
    }
  };

  return (
    <Card className="glass-card hover:border-primary/50 transition-colors animate-fade-in">
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
          <div className="flex gap-2 sm:flex-col">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleCard;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GuinchoData {
  name: string;
  placa: string;
  motorista: string;
}

export const useHistoricalData = () => {
  const [guinchos, setGuinchos] = useState<GuinchoData[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('guincho, placa_guincho, motorista, destino, empresa_guincho_saida, placa_guincho_saida, motorista_saida');

        if (error) throw error;

        if (data) {
          // Process Guinchos (from both Entry and Exit fields)
          const guinchoMap = new Map<string, GuinchoData>();

          data.forEach(item => {
            // Entry Guincho
            if (item.guincho) {
              const name = item.guincho.toUpperCase();
              // Update if not exists or update to most recent (assuming data is somewhat ordered or we just take one)
              // Actually, we want the most recent "placa" and "motorista" for this guincho.
              // Since we don't have dates in this simple query, we'll just overwrite or keep.
              // A better way would be to order by created_at in the query, but let's keep it simple.
              guinchoMap.set(name, {
                name,
                placa: item.placa_guincho || '',
                motorista: item.motorista || ''
              });
            }

            // Exit Guincho
            if (item.empresa_guincho_saida) {
              const name = item.empresa_guincho_saida.toUpperCase();
              guinchoMap.set(name, {
                name,
                placa: item.placa_guincho_saida || '',
                motorista: item.motorista_saida || ''
              });
            }
          });

          // Process Destinos
          const destinoSet = new Set<string>();
          data.forEach(item => {
            if (item.destino) {
              destinoSet.add(item.destino.toUpperCase());
            }
          });

          setGuinchos(Array.from(guinchoMap.values()));
          setDestinos(Array.from(destinoSet).sort());
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { guinchos, destinos, loading };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemFeature {
  id: string;
  feature_key: string;
  label: string;
  description: string;
  is_active: boolean;
}

export const useSystemFeatures = () => {
  const [features, setFeatures] = useState<SystemFeature[]>([]);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [globalFeatures, userFeatures] = await Promise.all([
        supabase.from('system_features').select('*').order('label'),
        user ? supabase.from('user_feature_states').select('*').eq('user_id', user.id) : Promise.resolve({ data: [] })
      ]);

      if (globalFeatures.error) throw globalFeatures.error;
      
      const overrides: Record<string, boolean> = {};
      if (userFeatures.data) {
        userFeatures.data.forEach((f: any) => {
          overrides[f.feature_key] = f.is_active;
        });
      }

      setFeatures(globalFeatures.data || []);
      setUserOverrides(overrides);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('Erro ao carregar configurações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (id: string, currentState: boolean) => {
    // This function is now deprecated for global toggles in favor of per-user, 
    // but we keep it for backward compatibility or global admin if needed.
    // However, the UI using this might need to be updated.
    // For now, let's leave it targeting global system_features for "Global Defaults".
    try {
      const { error } = await supabase
        .from('system_features')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setFeatures(prev =>
        prev.map(f =>
          f.id === id ? { ...f, is_active: !currentState } : f
        )
      );
      toast.success('Configuração global atualizada');
    } catch (error) {
      console.error('Error updating feature:', error);
      toast.error('Erro ao atualizar configuração');
      fetchFeatures();
    }
  };

  const isFeatureEnabled = (key: string) => {
    // 1. Check user override
    if (key in userOverrides) {
      return userOverrides[key];
    }
    
    // 2. Check global default
    if (features.length === 0 && !loading) return true; 
    const feature = features.find(f => f.feature_key === key);
    return feature ? feature.is_active : true; 
  };

  useEffect(() => {
    fetchFeatures();
    
    // Subscribe to both tables
    const globalChannel = supabase
      .channel('public:system_features')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_features' },
        () => fetchFeatures()
      )
      .subscribe();

    const userChannel = supabase
      .channel('public:user_feature_states')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_feature_states' },
        () => fetchFeatures()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(userChannel);
    };
  }, []);

  return {
    features,
    loading,
    toggleFeature,
    isFeatureEnabled
  };
};

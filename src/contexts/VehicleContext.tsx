import React, { createContext, useContext, ReactNode } from 'react';

// This context is kept for backward compatibility but no longer used
// Data is now fetched directly from Supabase in components

interface VehicleContextType {
  // Empty context for compatibility
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  return (
    <VehicleContext.Provider value={{}}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => {
  const context = useContext(VehicleContext);
  if (!context) throw new Error('useVehicles must be used within VehicleProvider');
  return context;
};

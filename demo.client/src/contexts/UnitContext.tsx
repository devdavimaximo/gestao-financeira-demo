import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface UnitContextType {
  selectedUnitId: string | null;
  setSelectedUnitId: (id: string | null) => void;
}

const UnitContext = createContext<UnitContextType | null>(null);

const STORAGE_KEY = 'gestao_financeira_unit';

export function UnitProvider({ children }: { children: ReactNode }) {
  const [selectedUnitId, setSelectedUnitIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setSelectedUnitId = useCallback((id: string | null) => {
    setSelectedUnitIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <UnitContext.Provider value={{ selectedUnitId, setSelectedUnitId }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used inside <UnitProvider>');
  return ctx;
}

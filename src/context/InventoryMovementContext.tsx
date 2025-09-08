
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { InventoryMovement } from '@/lib/types';

interface InventoryMovementContextType {
  inventoryMovements: InventoryMovement[];
  loading: boolean;
  error: Error | null;
}

const InventoryMovementContext = createContext<InventoryMovementContextType | undefined>(undefined);

export function useInventoryMovements() {
  const context = useContext(InventoryMovementContext);
  if (!context) {
    throw new Error('useInventoryMovements must be used within a InventoryMovementProvider');
  }
  return context;
}

export function InventoryMovementProvider({ children }: { children: ReactNode }) {
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const movementsRef = ref(db, 'inventoryMovements');
    const unsubscribe = onValue(
      movementsRef,
      (snapshot) => {
        const data = snapshot.val();
        const movementsArray: InventoryMovement[] = data
          ? Object.entries(data).map(([id, value]) => ({ id, ...(value as object) as Omit<InventoryMovement, 'id'> }))
          : [];
        setInventoryMovements(movementsArray);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase inventoryMovements error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <InventoryMovementContext.Provider value={{ inventoryMovements, loading, error }}>
      {children}
    </InventoryMovementContext.Provider>
  );
}

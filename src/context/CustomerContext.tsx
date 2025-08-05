
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Customer } from '@/lib/types';

interface CustomerContextType {
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  loading: boolean;
  error: Error | null;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const customersRef = ref(db, 'customers');
    const unsubscribe = onValue(
      customersRef,
      (snapshot) => {
        const data = snapshot.val();
        const customersArray: Customer[] = data
          ? Object.entries(data).map(([id, value]) => ({ id, ...(value as object) as Omit<Customer, 'id'> }))
          : [];
        setCustomers(customersArray);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase customers error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <CustomerContext.Provider value={{ customers, setCustomers, loading, error }}>
      {children}
    </CustomerContext.Provider>
  );
}

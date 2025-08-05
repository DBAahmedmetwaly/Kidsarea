
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
import type { Game, Employee, Branch, Safe, Policies, OpenShift, SafeTransaction } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface FirebaseContextType {
  games: Game[];
  employees: Employee[];
  branches: Branch[];
  safes: Safe[];
  policies: Policies | null;
  openShifts: OpenShift[];
  transactions: SafeTransaction[];
  loading: boolean;
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const dataRefs = [
      { key: 'games', setter: setGames, isArray: true },
      { key: 'employees', setter: setEmployees, isArray: true },
      { key: 'branches', setter: setBranches, isArray: true },
      { key: 'safes', setter: setSafes, isArray: true },
      { key: 'policies', setter: setPolicies, isArray: false },
      { key: 'openShifts', setter: setOpenShifts, isArray: true },
      { key: 'safeTransactions', setter: setTransactions, isArray: true },
    ];

    let isMounted = true;
    let loadedCount = 0;
    const totalListeners = dataRefs.length;

    const handleLoad = () => {
      loadedCount++;
      if (loadedCount >= totalListeners && isMounted) {
        setLoading(false);
      }
    };

    const createUnsubscribe = (dbRefKey: string, setter: Dispatch<SetStateAction<any>>, isArray: boolean) => {
      const dbRef = ref(db, dbRefKey);
      return onValue(
        dbRef,
        (snapshot) => {
          const data = snapshot.val();
          let processedData = isArray ? [] : null;
          if (data) {
            processedData = isArray
              ? Object.entries(data).map(([id, value]) => ({ id, ...(value as object) }))
              : data;
          }
          if (isMounted) setter(processedData);
          handleLoad();
        },
        (err) => {
          console.error(`Firebase ${dbRefKey} error:`, err);
          if (isMounted) setError(err as Error);
          handleLoad();
        }
      );
    };

    const unsubscribes = dataRefs.map(({ key, setter, isArray }) =>
      createUnsubscribe(key, setter, isArray)
    );

    return () => {
      isMounted = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);


  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ games, employees, branches, safes, policies, openShifts, transactions, loading, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

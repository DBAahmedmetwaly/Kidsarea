
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
import type { Game, Employee, Branch, Safe } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface FirebaseContextType {
  games: Game[];
  employees: Employee[];
  branches: Branch[];
  safes: Safe[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const gamesRef = ref(db, 'games');
    const employeesRef = ref(db, 'employees');
    const branchesRef = ref(db, 'branches');
    const safesRef = ref(db, 'safes');

    let isMounted = true;
    let loadedCount = 0;
    const totalListeners = 4;

    const handleLoad = () => {
        loadedCount++;
        if(loadedCount === totalListeners && isMounted){
            setLoading(false);
        }
    }

    const createUnsubscribe = (dbRef: any, setter: Dispatch<SetStateAction<any[]>>, type: new () => any[]) => {
        return onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            const arr = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as object) })) : [];
            if(isMounted) setter(arr as any[]);
            handleLoad();
        }, (err) => {
            console.error(`Firebase ${dbRef} error:`, err);
            if(isMounted) setError(err as Error);
            handleLoad();
        });
    }

    const unsubscribes = [
      createUnsubscribe(gamesRef, setGames, Array as new () => Game[]),
      createUnsubscribe(employeesRef, setEmployees, Array as new () => Employee[]),
      createUnsubscribe(branchesRef, setBranches, Array as new () => Branch[]),
      createUnsubscribe(safesRef, setSafes, Array as new () => Safe[]),
    ];
    
    return () => {
        isMounted = false;
        unsubscribes.forEach(unsub => unsub());
    }
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ games, employees, branches, safes, loading, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

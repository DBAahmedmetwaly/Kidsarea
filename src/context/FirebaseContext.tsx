
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

    const unsubscribes = [
      onValue(gamesRef, (snapshot) => {
        const data = snapshot.val();
        const gamesArray: Game[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<Game, 'id'>) })) : [];
        setGames(gamesArray);
      }, (err) => {
        console.error("Firebase games error:", err);
        setError(err as Error);
      }),
      onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        const employeesArray: Employee[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<Employee, 'id'>) })) : [];
        setEmployees(employeesArray);
      }, (err) => {
        console.error("Firebase employees error:", err);
        setError(err as Error);
      }),
      onValue(branchesRef, (snapshot) => {
        const data = snapshot.val();
        const branchesArray: Branch[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<Branch, 'id'>) })) : [];
        setBranches(branchesArray);
      }, (err) => {
        console.error("Firebase branches error:", err);
        setError(err as Error);
      }),
       onValue(safesRef, (snapshot) => {
        const data = snapshot.val();
        const safesArray: Safe[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<Safe, 'id'>) })) : [];
        setSafes(safesArray);
      }, (err) => {
        console.error("Firebase safes error:", err);
        setError(err as Error);
      })
    ];
    
    setLoading(false);

    return () => unsubscribes.forEach(unsub => unsub());
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

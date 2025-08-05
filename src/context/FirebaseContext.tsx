
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
import type { Game, Employee, Branch, Safe, Policies, OpenShift, SafeTransaction, Subscription, SubscriptionPlan } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface FirebaseContextType {
  games: Game[];
  employees: Employee[];
  branches: Branch[];
  safes: Safe[];
  policies: Policies | null;
  openShifts: OpenShift[];
  transactions: SafeTransaction[];
  subscriptions: Subscription[];
  subscriptionPlans: SubscriptionPlan[];
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dataRefs = [
      { key: 'games', setter: setGames, isArray: true },
      { key: 'employees', setter: setEmployees, isArray: true },
      { key: 'branches', setter: setBranches, isArray: true },
      { key: 'safes', setter: setSafes, isArray: true },
      { key: 'policies', setter: setPolicies, isArray: false },
      { key: 'openShifts', setter: setOpenShifts, isArray: true },
      { key: 'safeTransactions', setter: setTransactions, isArray: true },
      { key: 'subscriptions', setter: setSubscriptions, isArray: true },
      { key: 'subscriptionPlans', setter: setSubscriptionPlans, isArray: true },
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


  // Do not show a full-screen loader on the login page itself, just let the button be disabled.
  if (loading && pathname !== '/login') {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ games, employees, branches, safes, policies, openShifts, transactions, subscriptions, subscriptionPlans, loading, error }}>
      {children}
    </FirebaseContext.Provider>
  );
}

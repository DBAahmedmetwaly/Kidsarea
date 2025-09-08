
'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useEffect,
} from 'react';
import type { Child, CompletedSession } from '@/lib/types';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

interface SessionContextType {
  activeChildren: Child[];
  setActiveChildren: Dispatch<SetStateAction<Child[]>>;
  completedSessions: CompletedSession[];
  setCompletedSessions: Dispatch<SetStateAction<CompletedSession[]>>;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeChildren, setActiveChildren] = useState<Child[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth(); // Use auth status to delay fetch

  useEffect(() => {
      // Only subscribe if the user is authenticated
      if (!isAuthenticated) {
          setLoading(false);
          return;
      }
      
      let activeUnsubscribe: () => void;
      let completedUnsubscribe: () => void;
      
      try {
        const activeRef = ref(db, 'sessions/active');
        const completedRef = ref(db, 'sessions/completed');
        
        let loadedCount = 0;
        const handleLoad = () => {
            loadedCount++;
            if (loadedCount >= 2) {
                setLoading(false);
            }
        };
        
        activeUnsubscribe = onValue(activeRef, (snapshot) => {
            const data = snapshot.val();
            setActiveChildren(data ? Object.values(data) : []);
            handleLoad();
        });

        completedUnsubscribe = onValue(completedRef, (snapshot) => {
            const data = snapshot.val();
            const sessionsArray: CompletedSession[] = data 
                ? Object.values(data)
                : [];
            
            // Sort the array every time new data is received to ensure order is always correct
            sessionsArray.sort((a: any, b: any) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime());
            
            setCompletedSessions(sessionsArray);
            handleLoad();
        });

      } catch(e) {
        console.error("Error subscribing to session data:", e);
        setLoading(false);
      }

      return () => {
          activeUnsubscribe?.();
          completedUnsubscribe?.();
      }
  }, [isAuthenticated]); // Rerun when authentication status changes

  return (
    <SessionContext.Provider
      value={{
        activeChildren,
        setActiveChildren,
        completedSessions,
        setCompletedSessions,
        loading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

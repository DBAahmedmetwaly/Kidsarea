
'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Child, CompletedSession } from '@/lib/types';

interface SessionContextType {
  activeChildren: Child[];
  setActiveChildren: Dispatch<SetStateAction<Child[]>>;
  completedSessions: CompletedSession[];
  setCompletedSessions: Dispatch<SetStateAction<CompletedSession[]>>;
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

  return (
    <SessionContext.Provider
      value={{
        activeChildren,
        setActiveChildren,
        completedSessions,
        setCompletedSessions,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

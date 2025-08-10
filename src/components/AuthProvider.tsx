
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { FirebaseProvider } from '@/context/FirebaseContext';
import SplashScreen from './layout/SplashScreen';


interface AuthContextType {
  isAuthenticated: boolean;
  user: Employee | { username: 'admin' } | null;
  login: (user: Employee | { username: 'admin' }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // We start with loading=true to prevent flicker
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
       if (!isAuthenticated && pathname !== '/login') {
            router.push('/login');
        } else if (isAuthenticated && pathname === '/login') {
             router.push('/');
        }
    }
  }, [isAuthenticated, pathname, router, loading, user]);

  const login = (userData: AuthContextType['user']) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background w-full">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
    );
  }
  
  // Render children (or login page)
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

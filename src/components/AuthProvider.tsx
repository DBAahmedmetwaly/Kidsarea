
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
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('funtrack_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Failed to parse user from sessionStorage", error);
      sessionStorage.removeItem('funtrack_user');
    } finally {
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    if (!loading) {
       if (!isAuthenticated && pathname !== '/login') {
            router.push('/login');
        } else if (isAuthenticated && pathname === '/login') {
             router.push('/');
        }
    }
  }, [isAuthenticated, pathname, router, loading]);

  const login = (userData: AuthContextType['user']) => {
    sessionStorage.setItem('funtrack_user', JSON.stringify(userData));
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    sessionStorage.removeItem('funtrack_user');
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
  
  if (!isAuthenticated && pathname !== '/login') {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background w-full">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

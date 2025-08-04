
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect should run only on the client
    if (typeof window !== 'undefined') {
        const checkAuth = () => {
            try {
                const authStatus = localStorage.getItem('isAuthenticated') === 'true';
                const userData = localStorage.getItem('user');
                const parsedUser = userData ? JSON.parse(userData) : null;

                setIsAuthenticated(authStatus);
                setUser(parsedUser);
                setLoading(false);

                if (!authStatus && pathname !== '/login') {
                    router.push('/login');
                } else if (authStatus && pathname === '/login') {
                    router.push('/');
                }
            } catch (error) {
                console.error("Failed to parse user data from localStorage", error);
                // Clear corrupted data
                logout();
                setLoading(false);
            }
        };
        checkAuth();
    }
  }, [pathname, router]);

  const login = (userData: AuthContextType['user']) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAuthenticated && pathname !== '/login') {
    // While loading, or if not authenticated on a protected route, show a loader or nothing.
    // This prevents flashing the page content before redirecting.
    return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  // Render children only if authenticated or on the login page.
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

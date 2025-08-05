
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

function AuthContent({ children }: { children: ReactNode }) {
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
            } catch (error) {
                console.error("Failed to parse user data from localStorage", error);
                // Clear corrupted data
                logout();
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on initial mount

  useEffect(() => {
    if (!loading) {
       if (!isAuthenticated && pathname !== '/login') {
            router.push('/login');
        } else if (isAuthenticated && pathname === '/login') {
            router.push('/tracking'); 
        }
    }
  }, [isAuthenticated, pathname, router, loading]);

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
  
  // Render children (or login page)
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// The main AuthProvider now wraps content with FirebaseProvider
// This makes Firebase data available on the login page as well
export default function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <FirebaseProvider>
            <AuthContent>{children}</AuthContent>
        </FirebaseProvider>
    )
}

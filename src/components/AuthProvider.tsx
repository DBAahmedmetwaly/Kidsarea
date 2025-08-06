
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
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                // Add a small delay to let the splash screen be visible
                setTimeout(() => setLoading(false), 2500);
            }
        };
        checkAuth();
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
  }, [isAuthenticated, pathname, router, loading, user]);

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

  if (loading && pathname !== '/') {
    // The FirebaseProvider is needed for the SplashScreen to get the app name
    return (
        <FirebaseProvider>
            <SplashScreen />
        </FirebaseProvider>
    );
  }
  
  // Render children (or login page)
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

    
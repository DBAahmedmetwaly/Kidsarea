
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { allMenuItems } from '@/components/layout/AppSidebar';

type Permissions = Record<string, boolean>;
type Role = 'مشرف' | 'كاشير' | 'مدير فرع';
type RolePermissions = Record<Role, Permissions>;

interface PermissionsContextType {
  permissions: Permissions | null;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

const decodeKey = (key: string) => key.replace(/__slash__/g, '/');

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    if (user.username === 'admin') {
      const adminPermissions: Permissions = {};
      allMenuItems.forEach(item => {
        adminPermissions[item.href] = true;
      });
      // Admin also gets special permissions
      adminPermissions['/permissions/apply-discount'] = true;
      setPermissions(adminPermissions);
      setLoading(false);
      return;
    }
    
    const userRole = (user as Employee).role;
    if (!userRole) {
        setPermissions({}); // No permissions if no role
        setLoading(false);
        return;
    }

    const roleRef = ref(db, `roles/${userRole}`);
    const unsubscribe = onValue(roleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const decodedPermissions: Permissions = {};
        for (const encodedKey in data) {
            if (Object.prototype.hasOwnProperty.call(data, encodedKey)) {
                decodedPermissions[decodeKey(encodedKey)] = data[encodedKey];
            }
        }
        setPermissions(decodedPermissions);
      } else {
        // If no permissions are set for the role, deny all by default
        setPermissions({});
      }
      setLoading(false);
    }, (error) => {
        console.error("Firebase permissions error:", error);
        setPermissions(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

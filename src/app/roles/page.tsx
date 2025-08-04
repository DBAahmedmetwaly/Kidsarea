
'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ALL_SCREENS = [
  { href: '/', label: 'لوحة التحكم' },
  { href: '/tracking', label: 'تتبع الوقت' },
  { href: '/shift-closing', label: 'إدارة الورديات' },
  { href: '/reports', label: 'التقارير' },
  { href: '/branches', label: 'الفروع' },
  { href: '/employees', label: 'الموظفين' },
  { href: '/games', label: 'الألعاب' },
  { href: '/safes', label: 'الخزائن' },
  { href: '/discrepancy-check', label: 'فحص التباين' },
  { href: '/roles', label: 'الصلاحيات' },
];

type Role = 'مشرف' | 'كاشير' | 'مدير فرع';
const ROLES: Role[] = ['مدير فرع', 'كاشير', 'مشرف'];

type Permissions = Record<string, boolean>;
type RolePermissions = Record<Role, Permissions>;

// Firebase keys cannot contain '.', '#', '$', '/', '[', or ']'
const encodeKey = (key: string) => key.replace(/\//g, '__slash__');
const decodeKey = (key: string) => key.replace(/__slash__/g, '/');

function RolesContent() {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('مدير فرع');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const rolesRef = ref(db, 'roles');
    const unsubscribe = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Decode keys from Firebase
        const decodedPermissions: RolePermissions = { 'مدير فرع': {}, 'كاشير': {}, 'مشرف': {} };
        for (const role in data) {
            if (Object.prototype.hasOwnProperty.call(data, role)) {
                const rolePermissions = data[role as Role];
                const decodedRolePermissions: Permissions = {};
                for (const encodedKey in rolePermissions) {
                    if (Object.prototype.hasOwnProperty.call(rolePermissions, encodedKey)) {
                       decodedRolePermissions[decodeKey(encodedKey)] = rolePermissions[encodedKey];
                    }
                }
                decodedPermissions[role as Role] = decodedRolePermissions;
            }
        }
        setPermissions(decodedPermissions);
      } else {
        // Initialize with default permissions if none exist
        const defaultPermissions: RolePermissions = {
          'مدير فرع': ALL_SCREENS.reduce((acc, screen) => ({ ...acc, [screen.href]: true }), {}),
          'كاشير': { '/tracking': true, '/shift-closing': true },
          'مشرف': { '/tracking': true },
        };
        setPermissions(defaultPermissions);
      }
      setLoading(false);
    }, (error) => {
        console.error(error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePermissionChange = (screenHref: string, checked: boolean) => {
    setPermissions(prev => {
        if (!prev) return null;
        const newPermissions = { ...prev };
        newPermissions[selectedRole][screenHref] = checked;
        return newPermissions;
    });
  };

  const handleSaveChanges = async () => {
    if (!permissions) return;
    try {
      const rolesRef = ref(db, 'roles');
      // Encode keys for Firebase
      const encodedPermissions: RolePermissions = { 'مدير فرع': {}, 'كاشير': {}, 'مشرف': {} };
        for (const role in permissions) {
            if (Object.prototype.hasOwnProperty.call(permissions, role)) {
                const rolePermissions = permissions[role as Role];
                const encodedRolePermissions: Permissions = {};
                for (const key in rolePermissions) {
                    if (Object.prototype.hasOwnProperty.call(rolePermissions, key)) {
                       encodedRolePermissions[encodeKey(key)] = rolePermissions[key];
                    }
                }
                encodedPermissions[role as Role] = encodedRolePermissions;
            }
        }
      
      await update(rolesRef, encodedPermissions);
      toast({
        title: 'تم الحفظ بنجاح',
        description: `تم تحديث صلاحيات دور "${selectedRole}".`,
      });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ الصلاحيات. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الصلاحيات</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>تخصيص صلاحيات الأدوار</CardTitle>
          <CardDescription>
            اختر دورًا وقم بتحديد الشاشات التي يمكن للموظفين أصحاب هذا الدور الوصول إليها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Roles Sidebar */}
            <div className="w-full md:w-1/4 border-b md:border-b-0 md:border-e pb-4 md:pb-0 md:pe-4">
              <h3 className="text-lg font-semibold mb-4">الأدوار الوظيفية</h3>
              <div className="flex flex-col gap-2">
                {ROLES.map(role => (
                  <Button
                    key={role}
                    variant={selectedRole === role ? 'secondary' : 'ghost'}
                    onClick={() => setSelectedRole(role)}
                    className="justify-start"
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>

            {/* Permissions Panel */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">
                صلاحيات الوصول لدور: <span className="text-primary">{selectedRole}</span>
              </h3>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-1/2" />)}
                </div>
              ) : (
                <div className="space-y-4">
                    {ALL_SCREENS.map(screen => (
                        <div key={screen.href} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${selectedRole}-${screen.href}`}
                                checked={permissions?.[selectedRole]?.[screen.href] || false}
                                onCheckedChange={(checked) => handlePermissionChange(screen.href, !!checked)}
                            />
                            <Label htmlFor={`${selectedRole}-${screen.href}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {screen.label}
                            </Label>
                        </div>
                    ))}
                </div>
              )}
               <Button onClick={handleSaveChanges} className="mt-6" disabled={loading}>
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RolesPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <RolesContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

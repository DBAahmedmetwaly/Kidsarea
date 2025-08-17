

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
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
import PasswordDialog from '../branches/_components/PasswordDialog';
import { useFirebase } from '@/context/FirebaseContext';

const STATIC_SCREENS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/dashboard', label: 'لوحة التحكم' },
  { href: '/pos', label: 'يلا نلعب' },
  { href: '/sessions', label: 'سجل الجلسات' },
  { href: '/shift-closing', label: 'إدارة الورديات' },
  { href: '/expenses', label: 'المصروفات والصيانة'},
  { href: '/reports', label: 'التقارير' },
  { href: '/product-sales', label: 'تقرير مبيعات المنتجات' },
  { href: '/employees', label: 'الموظفين' },
  { href: '/games', label: 'الألعاب' },
  { href: '/game-categories', label: 'تصنيفات الألعاب' },
  { href: '/products', label: 'كتالوج المنتجات' },
  { href: '/inventory', label: 'المخزون' },
  { href: '/safes', label: 'الخزائن' },
  { href: '/policies', label: 'السياسات' },
  { href: '/receipt-designer', label: 'تصميم الإيصال' },
  { href: '/transactions', label: 'سجل الحركات'},
  { href: '/payroll', label: 'الرواتب'},
  { href: '/customers', label: 'العملاء' },
  { href: '/birthdays', label: 'أعياد الميلاد' },
  { href: '/subscriptions', label: 'الاشتراكات' },
  { href: '/subscription-plans', label: 'باقات الاشتراكات' },
  { href: '/data-management', label: 'إدارة البيانات' },
  { href: '/branches', label: 'الفروع' },
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
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [permissionChange, setPermissionChange] = useState<{ screenHref: string, checked: boolean } | null>(null);
  const { policies: allPolicies } = useFirebase();

  const allScreens = useMemo(() => {
    const defaultPolicies = allPolicies?.find(p => p.id === 'default');
    const posScreenTitle = defaultPolicies?.posLabels?.screenTitle;

    if (posScreenTitle) {
        return STATIC_SCREENS.map(screen => 
            screen.href === '/pos' ? { ...screen, label: posScreenTitle } : screen
        );
    }
    return STATIC_SCREENS;
  }, [allPolicies]);

  useEffect(() => {
    const rolesRef = ref(db, 'roles');
    const unsubscribe = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Decode keys from Firebase
        const decodedPermissions: RolePermissions = { 'مدير فرع': {}, 'كاشير': {}, 'مشرف': {} };
        for (const role of ROLES) {
            const rolePermissions = data[role];
            if (rolePermissions) {
                const decodedRolePermissions: Permissions = {};
                for (const encodedKey in rolePermissions) {
                    if (Object.prototype.hasOwnProperty.call(rolePermissions, encodedKey)) {
                       decodedRolePermissions[decodeKey(encodedKey)] = rolePermissions[encodedKey];
                    }
                }
                decodedPermissions[role] = decodedRolePermissions;
            }
        }
        setPermissions(decodedPermissions);
      } else {
        // Initialize default permissions if none exist
        const defaultPermissions: any = {};
         ROLES.forEach(role => {
            defaultPermissions[role] = allScreens.reduce((acc, screen) => ({ ...acc, [encodeKey(screen.href)]: true }), {});
        });
        set(rolesRef, defaultPermissions);
        
        const decodedForState: RolePermissions = { 'مدير فرع': {}, 'كاشير': {}, 'مشرف': {} };
         ROLES.forEach(role => {
            decodedForState[role] = allScreens.reduce((acc, screen) => ({ ...acc, [screen.href]: true }), {});
        });
        setPermissions(decodedForState);
      }
      setLoading(false);
    }, (error) => {
        console.error(error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [allScreens]);

  const handlePermissionChangeAttempt = (screenHref: string, checked: boolean) => {
    if (checked) {
        setPermissions(prev => {
            if (!prev) return null;
            const newPermissions = JSON.parse(JSON.stringify(prev));
            if (!newPermissions[selectedRole]) {
                newPermissions[selectedRole] = {};
            }
            newPermissions[selectedRole][screenHref] = checked;
            return newPermissions;
        });
    } else {
        setPermissionChange({ screenHref, checked });
        setPasswordDialogOpen(true);
    }
  };
  
  const handlePasswordConfirm = (password: string) => {
    if (password === 'metoomar') {
        if (permissionChange) {
            setPermissions(prev => {
                if (!prev) return null;
                const newPermissions = JSON.parse(JSON.stringify(prev));
                if (!newPermissions[selectedRole]) {
                    newPermissions[selectedRole] = {};
                }
                newPermissions[selectedRole][permissionChange.screenHref] = permissionChange.checked;
                return newPermissions;
            });
        }
    } else {
        toast({ title: 'كلمة مرور خاطئة', variant: 'destructive' });
    }
    setPermissionChange(null);
  };


  const handleSaveChanges = async () => {
    if (!permissions) return;
    try {
      const rolePermissions = permissions[selectedRole];
      if (!rolePermissions) return;

      const encodedRolePermissions: Permissions = {};
      for (const key in rolePermissions) {
          if (Object.prototype.hasOwnProperty.call(rolePermissions, key)) {
             encodedRolePermissions[encodeKey(key)] = rolePermissions[key];
          }
      }
      
      const roleRef = ref(db, `roles/${selectedRole}`);
      await update(roleRef, encodedRolePermissions);

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
                <div className="grid grid-cols-2 gap-4">
                    {allScreens.map(screen => (
                        <div key={screen.href} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${selectedRole}-${screen.href}`}
                                checked={permissions?.[selectedRole]?.[screen.href] || false}
                                onCheckedChange={(checked) => handlePermissionChangeAttempt(screen.href, !!checked)}
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
       <PasswordDialog 
        open={isPasswordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
        onConfirm={handlePasswordConfirm} 
       />
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


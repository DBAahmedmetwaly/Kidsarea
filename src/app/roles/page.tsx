

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
import { Shield, Settings, VenetianMask, PanelTopOpen, Landmark, Contact, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebase } from '@/context/FirebaseContext';
import { Separator } from '@/components/ui/separator';

const mainItems = [
  { href: '/dashboard', label: 'لوحة التحكم' },
  { href: '/pos', label: 'يلا نلعب' },
  { href: '/sessions', label: 'سجل الجلسات' },
];

const managementItems = [
  { href: '/branches', label: 'الفروع' },
  { href: '/employees', label: 'الموظفين' },
  { href: '/games', label: 'الألعاب' },
  { href: '/game-categories', label: 'تصنيفات الألعاب' },
  { href: '/products', label: 'كتالوج المنتجات' },
  { href: '/product-categories', label: 'فئات المنتجات' },
  { href: '/inventory', label: 'المخزون' },
  { href: '/safes', label: 'الخزائن' },
  { href: '/subscriptions', label: 'الاشتراكات طويلة الأمد' },
  { href: '/subscription-plans', label: 'باقات اللعب' },
];

const financialItems = [
  { href: '/shift-closing', label: 'إدارة الورديات' },
  { href: '/expenses', label: 'المصروفات والصيانة'},
  { href: '/transactions', label: 'سجل الحركات المالية'},
  { href: '/payroll', label: 'الرواتب'},
  { href: '/reports', label: 'التقارير' },
  { href: '/product-sales', label: 'تقرير مبيعات المنتجات' },
  { href: '/reports/inventory-log', label: 'تقرير حركة الأصناف' },
];

const customerItems = [
    { href: '/customers', label: 'العملاء' },
    { href: '/birthdays', label: 'أعياد الميلاد' },
]

const settingsMenuItems = [
    { href: '/roles', label: 'الصلاحيات' },
    { href: '/policies', label: 'السياسات' },
    { href: '/receipt-designer', label: 'تصميم الإيصال' },
    { href: '/data-management', label: 'إدارة البيانات' },
];

const STATIC_SCREENS = {
    "الرئيسية": [{ href: '/', label: 'الرئيسية' }, ...mainItems],
    "الإدارة": managementItems,
    "المالية": financialItems,
    "العملاء": customerItems,
    "الإعدادات": settingsMenuItems
};


const SPECIAL_PERMISSIONS: { href: string; label: string }[] = [
    // This is now managed per-employee
    // { href: '/permissions/apply-discount', label: 'إمكانية عمل خصم' }
];

type Role = 'مشرف' | 'كاشير' | 'مدير عام الفرع';
const ROLES: Role[] = ['مدير عام الفرع', 'كاشير', 'مشرف'];

type Permissions = Record<string, boolean>;
type RolePermissions = Record<Role, Permissions>;

// Firebase keys cannot contain '.', '#', '$', '/', '[', or ']'
const encodeKey = (key: string) => key.replace(/\//g, '__slash__');
const decodeKey = (key: string) => key.replace(/__slash__/g, '/');

function RolesContent() {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('مدير عام الفرع');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { policies: allPolicies } = useFirebase();

  const allScreens = useMemo(() => {
    const defaultPolicies = allPolicies?.find(p => p.id === 'default');
    const posScreenTitle = defaultPolicies?.posLabels?.screenTitle;

    const updatedStaticScreens = JSON.parse(JSON.stringify(STATIC_SCREENS));
    if (posScreenTitle) {
       const mainGroup = updatedStaticScreens['الرئيسية'];
       const posItem = mainGroup.find((item: any) => item.href === '/pos');
       if (posItem) {
           posItem.label = posScreenTitle;
       }
    }
    return updatedStaticScreens;
  }, [allPolicies]);

  useEffect(() => {
    const rolesRef = ref(db, 'roles');
    const unsubscribe = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Decode keys from Firebase
        const decodedPermissions: RolePermissions = { 'مدير عام الفرع': {}, 'كاشير': {}, 'مشرف': {} };
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
            const screens = Object.values(allScreens).flat();
            defaultPermissions[role] = screens.reduce((acc, screen) => ({ ...acc, [encodeKey(screen.href)]: true }), {});
        });
        set(rolesRef, defaultPermissions);
        
        const decodedForState: RolePermissions = { 'مدير عام الفرع': {}, 'كاشير': {}, 'مشرف': {} };
         ROLES.forEach(role => {
             const screens = Object.values(allScreens).flat();
            decodedForState[role] = screens.reduce((acc, screen) => ({ ...acc, [screen.href]: true }), {});
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

  const handlePermissionChange = (screenHref: string, checked: boolean) => {
    setPermissions(prev => {
        if (!prev) return null;
        const newPermissions = JSON.parse(JSON.stringify(prev));
        if (!newPermissions[selectedRole]) {
            newPermissions[selectedRole] = {};
        }
        newPermissions[selectedRole][screenHref] = checked;
        return newPermissions;
    });
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
                <>
                    {SPECIAL_PERMISSIONS.length > 0 && (
                        <>
                            <h4 className="font-semibold text-muted-foreground flex items-center gap-2 mb-2"><VenetianMask className="h-4 w-4"/> صلاحيات خاصة</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-md mb-6">
                                {SPECIAL_PERMISSIONS.map(screen => (
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
                            <Separator />
                        </>
                    )}

                    <div className="space-y-6">
                        {Object.entries(allScreens).map(([groupName, screens]) => (
                            <div key={groupName}>
                                <h4 className="font-semibold text-muted-foreground mb-3">{groupName}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(screens as {href: string, label: string}[]).map(screen => (
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
                            </div>
                        ))}
                    </div>
                </>
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

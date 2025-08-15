

'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserCog, Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ALL_SCREENS = [
  { href: '/dashboard', label: 'لوحة التحكم' },
  { href: '/pos', label: 'يلا نلعب' },
  { href: '/sessions', label: 'سجل الجلسات' },
  { href: '/shift-closing', label: 'إدارة الورديات' },
  { href: '/expenses', label: 'المصروفات والصيانة'},
  { href: '/reports', label: 'التقارير' },
  { href: '/employees', label: 'الموظفين' },
  { href: '/games', label: 'الألعاب' },
  { href: '/game-categories', label: 'تصنيفات الألعاب' },
  { href: '/products', label: 'المنتجات' },
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
        setLoading(false);
      } else {
        // Initialize and SAVE default permissions if none exist
        const defaultPermissions: RolePermissions = {
          'مدير فرع': ALL_SCREENS.reduce((acc, screen) => ({ ...acc, [encodeKey(screen.href)]: true }), {}),
          'كاشير': {
             [encodeKey('/pos')]: true,
             [encodeKey('/sessions')]: true,
             [encodeKey('/shift-closing')]: true,
             [encodeKey('/customers')]: true,
             [encodeKey('/subscriptions')]: true,
             [encodeKey('/subscription-plans')]: true,
          },
          'مشرف': { 
            [encodeKey('/sessions')]: true,
           },
        };
        set(rolesRef, defaultPermissions).then(() => {
            // After setting, we need to decode for the current session's state
            const decodedForState: RolePermissions = {
                 'مدير فرع': ALL_SCREENS.reduce((acc, screen) => ({ ...acc, [screen.href]: true }), {}),
                 'كاشير': {
                    '/pos': true,
                    '/sessions': true,
                    '/shift-closing': true,
                    '/customers': true,
                    '/subscriptions': true,
                    '/subscription-plans': true,
                },
                'مشرف': { '/sessions': true },
            }
            setPermissions(decodedForState);
            setLoading(false);
        });
      }
    }, (error) => {
        console.error(error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePermissionChange = (screenHref: string, checked: boolean) => {
    setPermissions(prev => {
        if (!prev) return null;
        const newPermissions = JSON.parse(JSON.stringify(prev)); // Deep copy
        
        if (!newPermissions[selectedRole]) {
            newPermissions[selectedRole] = {};
        }

        newPermissions[selectedRole][screenHref] = checked;

        // Auto-enable dependent screens
        if (checked) {
            if(screenHref.startsWith('/subscriptions/')) {
                 newPermissions[selectedRole]['/subscriptions'] = true;
            }
             if(screenHref.startsWith('/customers/')) {
                 newPermissions[selectedRole]['/customers'] = true;
            }
        }


        return newPermissions;
    });
  };

  const handleSaveChanges = async () => {
    if (!permissions) return;
    try {
      // We only need to update the permissions for the selected role
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
  
  const allScreensWithDetails = ALL_SCREENS.map(screen => ({
      ...screen,
      isDetail: screen.href.includes('[')
  }))

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
                    {allScreensWithDetails.filter(s => !s.isDetail).map(screen => (
                        <div key={screen.href} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${selectedRole}-${screen.href}`}
                                checked={permissions?.[selectedRole]?.[screen.href] || false}
                                onCheckedChange={(checked) => handlePermissionChange(screen.href, !!checked)}
                                disabled={
                                    (screen.href === '/subscriptions' && permissions?.[selectedRole]?.['/subscriptions/[subscriptionId]']) ||
                                    (screen.href === '/customers' && permissions?.[selectedRole]?.['/customers/[customerId]'])
                                }
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

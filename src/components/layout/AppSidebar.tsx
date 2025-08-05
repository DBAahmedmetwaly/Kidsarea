
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Building2,
  Clock,
  Gamepad2,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Briefcase,
  Landmark,
  Shield,
  FileCog,
  Database,
  List,
  History,
  Contact,
  Menu,
  Star,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Employee, Policies } from '@/lib/types';
import { Sheet, SheetContent, SheetTitle, SheetTrigger as SheetTriggerComponent } from '@/components/ui/sheet';
import { Button } from '../ui/button';

const allMenuItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/tracking', label: 'تتبع الوقت', icon: Clock },
  { href: '/sessions', label: 'سجل الجلسات', icon: History },
  { href: '/shift-closing', label: 'إدارة الورديات', icon: Briefcase },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/games', label: 'الألعاب', icon: Gamepad2 },
  { href: '/safes', label: 'الخزائن', icon: Landmark },
  { href: '/transactions', label: 'سجل الحركات', icon: List },
  { href: '/customers', label: 'العملاء', icon: Contact },
  { href: '/subscriptions', label: 'الاشتراكات', icon: Star },
];

const settingsMenuItems = [
    { href: '/roles', label: 'الصلاحيات', icon: Shield },
    { href: '/policies', label: 'السياسات', icon: FileCog },
    { href: '/subscription-plans', label: 'باقات الاشتراكات', icon: Package },
    { href: '/data-management', label: 'إدارة البيانات', icon: Database },
]


type Permissions = Record<string, boolean>;
type RolePermissions = Record<Employee['role'], Permissions>;

// Firebase keys cannot contain '.', '#', '$', '/', '[', or ']'
const encodeKey = (key: string) => key.replace(/\//g, '__slash__');
const decodeKey = (key: string) => key.replace(/__slash__/g, '/');


function SidebarItems() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [appName, setAppName] = useState('FunTrack');
  const { setOpenMobile } = useSidebar();


  useEffect(() => {
    const policiesRef = ref(db, 'policies');
    const unsubPolicies = onValue(policiesRef, (snapshot) => {
        const data = snapshot.val() as Policies;
        if (data && data.appName) {
            setAppName(data.appName);
            document.title = data.appName + ' Manager';
        }
    });

    if (!user || user.username === 'admin') {
      const allPermissions: Permissions = [...allMenuItems, ...settingsMenuItems].reduce((acc, item) => {
        acc[item.href] = true;
        return acc;
      }, {} as Permissions);
      const fullPermissions: RolePermissions = {
        'مدير فرع': allPermissions,
        'كاشير': allPermissions,
        'مشرف': allPermissions,
      };
      setPermissions(fullPermissions);
      return () => unsubPolicies();
    }

    const rolesRef = ref(db, 'roles');
    const unsubRoles = onValue(rolesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const decodedPermissions: Partial<RolePermissions> = {};
            for (const role in data) {
                if (Object.prototype.hasOwnProperty.call(data, role)) {
                    const rolePermissions = data[role as Employee['role']];
                    const decodedRolePermissions: Permissions = {};
                    for (const encodedKey in rolePermissions) {
                        if (Object.prototype.hasOwnProperty.call(rolePermissions, encodedKey)) {
                           decodedRolePermissions[decodeKey(encodedKey)] = rolePermissions[encodedKey];
                        }
                    }
                    decodedPermissions[role as Employee['role']] = decodedRolePermissions;
                }
            }
            setPermissions(decodedPermissions as RolePermissions);
        }
    });

    return () => {
        unsubPolicies();
        unsubRoles();
    };
  }, [user]);

  const getVisibleMenuItems = () => {
    if (!user) return [];
    if (user.username === 'admin') return [...allMenuItems, ...settingsMenuItems];
    
    const employee = user as Employee;
    if (!permissions || !employee.role || !permissions[employee.role]) return [];

    const userPermissions = permissions[employee.role];
    
    // Add /sessions to permissions if they can see /tracking
    if (userPermissions['/tracking'] && !userPermissions['/sessions']) {
        userPermissions['/sessions'] = true;
    }

    return [...allMenuItems, ...settingsMenuItems].filter(item => userPermissions[item.href]);
  };

  const menuItems = getVisibleMenuItems();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  }

  const getHomeLink = () => {
    if (user && 'role' in user && user.role === 'كاشير') {
      return '/tracking';
    }
    return '/';
  }

  return (
    <>
      <SidebarHeader className="justify-between">
         <Link href={getHomeLink()} className="flex items-center gap-2 font-bold text-lg text-primary px-2">
            <Gamepad2 className="h-6 w-6 text-accent" />
            <span className={cn(
                "duration-200 text-sidebar-foreground",
                "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8"
            )}>
              {appName}
            </span>
        </Link>
         <div className="flex items-center">
            <div className="hidden md:block">
                <SidebarTrigger />
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.filter(item => !settingsMenuItems.some(s => s.href === item.href)).map((item) => (
            <SidebarMenuItem key={item.href} onClick={handleLinkClick}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label, side: 'left' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
          <SidebarMenu>
             {menuItems.filter(item => settingsMenuItems.some(s => s.href === item.href)).length > 0 && (
                 <>
                    {menuItems.filter(item => settingsMenuItems.some(s => s.href === item.href)).map((item) => (
                        <SidebarMenuItem key={item.href} onClick={handleLinkClick}>
                            <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={{children: item.label, side: 'left'}}>
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                 </>
             )}
               <SidebarMenuItem>
                  <SidebarMenuButton onClick={logout} tooltip={{children: 'تسجيل الخروج', side: 'left'}}>
                        <LogOut />
                        <span>تسجيل الخروج</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </>
  );
}


export default function AppSidebar() {
    const { isMobile, openMobile, setOpenMobile } = useSidebar();
    
    if (!isMobile) {
        return (
             <Sidebar side="right" collapsible="icon">
                <SidebarItems />
            </Sidebar>
        )
    }

    return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            {/* The trigger is now part of the page content */}
            <SheetContent side="right" className="p-0 w-[250px] bg-sidebar text-sidebar-foreground border-none">
                 <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
                 <SidebarItems />
            </SheetContent>
        </Sheet>
  );
}


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
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const allMenuItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/tracking', label: 'تتبع الوقت', icon: Clock },
  { href: '/shift-closing', label: 'إدارة الورديات', icon: Briefcase },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/games', label: 'الألعاب', icon: Gamepad2 },
  { href: '/safes', label: 'الخزائن', icon: Landmark },
  { href: '/roles', label: 'الصلاحيات', icon: Shield },
];

type Permissions = Record<string, boolean>;
type RolePermissions = Record<Employee['role'], Permissions>;

// Firebase keys cannot contain '.', '#', '$', '/', '[', or ']'
const encodeKey = (key: string) => key.replace(/\//g, '__slash__');
const decodeKey = (key: string) => key.replace(/__slash__/g, '/');


export default function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);

  useEffect(() => {
    const rolesRef = ref(db, 'roles');
    const unsubscribe = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      // No need to decode here as we will check against encoded keys
      setPermissions(data);
    });
    return () => unsubscribe();
  }, []);

  const getVisibleMenuItems = () => {
    if (!user) return [];
    if (user.username === 'admin') return allMenuItems;
    if (!permissions || !(user as Employee).role) return [];

    const userRole = (user as Employee).role;
    const userPermissions = permissions[userRole];

    if (!userPermissions) return [];
    
    return allMenuItems.filter(item => userPermissions[encodeKey(item.href)]);
  };

  const menuItems = getVisibleMenuItems();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const SidebarItems = () => (
    <>
      <SidebarHeader className="justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary px-2">
            <Gamepad2 className="h-6 w-6 text-accent" />
            <span className={cn(
                "duration-200 text-sidebar-foreground",
                "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8"
            )}>
              FunTrack
            </span>
        </Link>
         <div className="md:hidden">
            <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
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
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={{children: 'الإعدادات', side: 'left'}}>
                      <Link href="/roles">
                        <Settings />
                        <span>الإعدادات</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
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

  return (
    <Sidebar side="right" collapsible="icon">
        <SidebarItems />
    </Sidebar>
  );
}

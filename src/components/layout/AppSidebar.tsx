
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
  LifeBuoy,
  BarChart3,
  LogOut,
  Briefcase,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

const menuItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/tracking', label: 'تتبع الوقت', icon: Clock },
  { href: '/shift-closing', label: 'إدارة الورديات', icon: Briefcase },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/games', label: 'الألعاب', icon: Gamepad2 },
  { href: '/safes', label: 'الخزائن', icon: Landmark },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" side="right" className="border-l">
      <SidebarHeader className="justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary px-2">
            <Gamepad2 className="h-6 w-6 text-accent" />
            <span className={cn(
                "duration-200",
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
                tooltip={{ children: item.label }}
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
                  <SidebarMenuButton asChild tooltip={{children: 'الدعم'}}>
                      <Link href="#">
                        <LifeBuoy />
                        <span>الدعم</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={{children: 'الإعدادات'}}>
                      <Link href="#">
                        <Settings />
                        <span>الإعدادات</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <SidebarMenuButton onClick={logout} tooltip={{children: 'تسجيل الخروج'}}>
                        <LogOut />
                        <span>تسجيل الخروج</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

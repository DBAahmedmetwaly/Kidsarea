

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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Building2,
  ChevronDown,
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
  Layers,
  ShoppingBag,
  FileText,
  PanelTopOpen,
  Home,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Employee, Policies } from '@/lib/types';
import { Sheet, SheetContent, SheetTitle, SheetTrigger as SheetTriggerComponent } from '@/components/ui/sheet';
import { Button } from '../ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


const mainItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/pos', label: 'يلا نلعب', icon: ShoppingBag },
  { href: '/sessions', label: 'سجل الجلسات', icon: History },
];

const managementItems = [
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/games', label: 'الألعاب', icon: Gamepad2 },
  { href: '/game-categories', label: 'تصنيفات الألعاب', icon: Layers },
  { href: '/safes', label: 'الخزائن', icon: Landmark },
  { href: '/subscriptions', label: 'الاشتراكات', icon: Star },
  { href: '/subscription-plans', label: 'باقات الاشتراكات', icon: Package },
];

const financialItems = [
  { href: '/shift-closing', label: 'إدارة الورديات', icon: Briefcase },
  { href: '/transactions', label: 'سجل الحركات المالية', icon: List },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
];

const customerItems = [
    { href: '/customers', label: 'العملاء', icon: Contact },
]

const settingsMenuItems = [
    { href: '/roles', label: 'الصلاحيات', icon: Shield },
    { href: '/policies', label: 'السياسات', icon: FileCog },
    { href: '/receipt-designer', label: 'تصميم الإيصال', icon: FileText },
    { href: '/data-management', label: 'إدارة البيانات', icon: Database },
]

const allMenuItems = [...mainItems, ...managementItems, ...financialItems, ...customerItems, ...settingsMenuItems];

type Permissions = Record<string, boolean>;
type Role = 'مشرف' | 'كاشير' | 'مدير فرع';
type RolePermissions = Record<Role, Permissions>;

// Firebase keys cannot contain '.', '#', '$', '/', '[', or ']'
const encodeKey = (key: string) => key.replace(/\//g, '__slash__');
const decodeKey = (key: string) => key.replace(/__slash__/g, '/');


function CollapsibleMenuGroup({
    title,
    icon: TitleIcon,
    items,
    renderMenuItems
}: {
    title: string;
    icon: LucideIcon;
    items: typeof allMenuItems;
    renderMenuItems: (items: typeof allMenuItems) => React.ReactNode;
}) {
    const renderedItems = renderMenuItems(items);

    if (!Array.isArray(renderedItems) || renderedItems.length === 0) {
        return null;
    }

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 text-sm font-medium text-sidebar-foreground/70 rounded-md hover:bg-sidebar-accent">
                   <div className='flex items-center gap-2'>
                     <TitleIcon className="h-4 w-4" />
                     <span className={cn(
                        "duration-200",
                        "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8"
                     )}>{title}</span>
                   </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180 group-data-[collapsible=icon]:hidden" />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                 <SidebarMenu className="ms-4 mt-2 border-s border-sidebar-border">
                    <div className='ps-4 space-y-1'>
                        {renderedItems}
                    </div>
                 </SidebarMenu>
            </CollapsibleContent>
             <SidebarSeparator />
        </Collapsible>
    )
}

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

    if (!user) {
      setPermissions(null); // Clear permissions on logout
      return () => unsubPolicies();
    }
    
    // Handle admin user
    if (user.username === 'admin') {
      const allPermissions: Permissions = [...allMenuItems, { href: '/', label: 'الرئيسية', icon: Home }].reduce((acc, item) => {
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

    if ('role' in user && user.role) {
      const rolesRef = ref(db, 'roles');
      const unsubRoles = onValue(rolesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
              const decodedPermissions: Partial<RolePermissions> = {};
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
              setPermissions(decodedPermissions as RolePermissions);
          }
      }, (error) => {
          console.error("Firebase roles error:", error);
          setPermissions(null);
      });
      return () => {
        unsubPolicies();
        unsubRoles();
      };
    } else {
        setPermissions(null);
    }
    

    return () => {
        unsubPolicies();
    };
  }, [user]);

  const hasPermission = (href: string) => {
    if (!user || !permissions) return false;

    let userRole: Role | 'admin';
    if (user.username === 'admin') {
        userRole = 'admin';
    } else if ('role' in user) {
        userRole = (user as Employee).role;
    } else {
        return false;
    }

    const userPermissions = userRole === 'admin' ? permissions['مدير فرع'] : permissions[userRole];
    if (!userPermissions) return false;

     // Allow access to details pages if the main page is accessible
    const detailPaths = [
        {detail: '/subscriptions/[subscriptionId]', main: '/subscriptions'},
        {detail: '/customers/[customerId]', main: '/customers'},
        {detail: '/games/[gameName]', main: '/games'},
        {detail: '/safes/[safeId]', main: '/safes'},
    ];
    
    for (const path of detailPaths) {
        if (href.startsWith(path.main) && userPermissions[path.main]) {
            return true;
        }
    }
    
    return userPermissions[href];
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    // For detail pages, also match the parent path
    if (pathname.startsWith(path + '/')) return true;
    return pathname.startsWith(path) && (pathname.length === path.length || pathname[path.length] === '/');
  };
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  }

  const getHomeLink = () => {
    return '/';
  }

  const renderMenuItems = (items: typeof allMenuItems) => {
    return items.filter(item => hasPermission(item.href)).map(item => (
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
    ))
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
            <SidebarMenuItem onClick={handleLinkClick}>
                <SidebarMenuButton asChild isActive={isActive('/')} tooltip={{children: 'الرئيسية', side: 'left'}}>
                    <Link href={'/'}><Home/><span>الرئيسية</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            {renderMenuItems(mainItems)}
            <SidebarSeparator />
            <CollapsibleMenuGroup title="الإدارة" icon={PanelTopOpen} items={managementItems} renderMenuItems={renderMenuItems} />
            <CollapsibleMenuGroup title="المالية" icon={Landmark} items={financialItems} renderMenuItems={renderMenuItems} />
            <CollapsibleMenuGroup title="العملاء" icon={Contact} items={customerItems} renderMenuItems={renderMenuItems} />
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
          <SidebarMenu>
             <CollapsibleMenuGroup title="الإعدادات" icon={Settings} items={settingsMenuItems} renderMenuItems={renderMenuItems} />
             <SidebarSeparator />
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

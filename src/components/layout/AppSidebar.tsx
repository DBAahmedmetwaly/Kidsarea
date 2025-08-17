
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
  SidebarMenuSkeleton,
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
  Cake,
  Wrench,
  UserCog,
  ShoppingCart,
  type LucideIcon,
  Archive,
  Receipt,
  Phone,
  UserCircle2,
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
import { useFirebase } from '@/context/FirebaseContext';


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
  { href: '/products', label: 'كتالوج المنتجات', icon: ShoppingCart },
  { href: '/inventory', label: 'المخزون', icon: Archive },
  { href: '/safes', label: 'الخزائن', icon: Landmark },
  { href: '/subscriptions', label: 'الاشتراكات طويلة الأمد', icon: Star },
  { href: '/subscription-plans', label: 'باقات اللعب', icon: Package },
];

const financialItems = [
  { href: '/shift-closing', label: 'إدارة الورديات', icon: Briefcase },
  { href: '/expenses', label: 'المصروفات والصيانة', icon: Wrench },
  { href: '/transactions', label: 'سجل الحركات المالية', icon: List },
  { href: '/payroll', label: 'الرواتب', icon: UserCog },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/product-sales', label: 'تقرير مبيعات المنتجات', icon: Receipt },
];

const customerItems = [
    { href: '/customers', label: 'العملاء', icon: Contact },
    { href: '/birthdays', label: 'أعياد الميلاد', icon: Cake },
]

const settingsMenuItems = [
    { href: '/roles', label: 'الصلاحيات', icon: Shield },
    { href: '/policies', label: 'السياسات', icon: FileCog },
    { href: '/receipt-designer', label: 'تصميم الإيصال', icon: FileText },
    { href: '/data-management', label: 'إدارة البيانات', icon: Database },
];


const allMenuItems = [
    { href: '/', label: 'الرئيسية', icon: Home },
    ...mainItems, 
    ...managementItems, 
    ...financialItems, 
    ...customerItems, 
    ...settingsMenuItems,
];

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
    renderMenuItems,
    loading
}: {
    title: string;
    icon: LucideIcon;
    items: typeof allMenuItems;
    renderMenuItems: (items: typeof allMenuItems) => React.ReactNode;
    loading: boolean;
}) {
    // This component will now rely on the parent's `isReady` state
    if (loading) {
        return (
             <Collapsible defaultOpen>
                 <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full p-2 text-sm font-medium text-sidebar-foreground/70 rounded-md hover:bg-sidebar-accent">
                        <div className='flex items-center gap-2'>
                            <TitleIcon className="h-4 w-4" />
                            <span className="duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8">{title}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180 group-data-[collapsible=icon]:hidden" />
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className='ps-8 space-y-2 py-2'>
                        {[...Array(2)].map((_, i) => <SidebarMenuSkeleton key={i} />)}
                    </div>
                </CollapsibleContent>
             </Collapsible>
        )
    }

    const renderedItems = renderMenuItems(items);

    if (!Array.isArray(renderedItems) || renderedItems.filter(Boolean).length === 0) {
        return null;
    }

    return (
        <Collapsible defaultOpen>
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
  const { policies: allPolicies } = useFirebase();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isReady, setIsReady] = useState(false); // New state to control rendering
  const [appName, setAppName] = useState('FunTrack');
  const { setOpenMobile } = useSidebar();


  useEffect(() => {
    const defaultPolicies = allPolicies?.find(p => p.id === 'default');
    if (defaultPolicies?.appName) {
        setAppName(defaultPolicies.appName);
        document.title = defaultPolicies.appName + ' Manager';
    }

    // If there is no user, we are ready to show a limited sidebar (or nothing)
    if (!user) {
      setIsReady(true);
      return;
    }
    
    // If the user is admin, we can set permissions immediately and be ready.
    if (user.username === 'admin') {
      const adminPermissions: Permissions = {};
      allMenuItems.forEach(item => {
        adminPermissions[item.href] = true;
      });
      setPermissions({ 'مشرف': adminPermissions, 'كاشير': adminPermissions, 'مدير فرع': adminPermissions });
      setIsReady(true);
      return;
    }
    
    // For other users, fetch permissions from Firebase.
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
        setIsReady(true); // Set ready state only after permissions are fetched
    }, (error) => {
        console.error("Firebase roles error:", error);
        setPermissions(null);
        setIsReady(true); // Also set ready on error to prevent infinite loading
    });

    return () => {
      unsubRoles();
    };

  }, [user, allPolicies]);

  const hasPermission = (href: string) => {
    if (!user) return false;
    if (user.username === 'admin') return true;
    if (!permissions) return false; 

    const userRole = (user as Employee).role;
    if (!userRole) return false;
    
    const userPermissions = permissions[userRole];
    
    if (!userPermissions) return false;

    // Allow access to details pages if the main page is accessible
    const detailPaths = [
        {detail: '/subscriptions/[subscriptionId]', main: '/subscriptions'},
        {detail: '/customers/[customerId]', main: '/customers'},
        {detail: '/games/[gameName]', main: '/games'},
        {detail: '/safes/[safeId]', main: '/safes'},
    ];
    
    for (const path of detailPaths) {
        if (pathname.startsWith(path.main) && userPermissions[path.main]) {
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

  const renderMenuItems = (items: typeof allMenuItems) => {
    return items.map(item => 
        hasPermission(item.href) ? (
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
        ) : null
    )
  }
  
  const currentUserName = user ? ('name' in user ? user.name : 'Admin') : 'Guest';

  return (
    <>
      <SidebarHeader className="justify-between">
         <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary px-2">
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
      
      <div className="p-2">
        <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent">
          <UserCircle2 className="h-8 w-8 text-sidebar-accent-foreground" />
          <div className={cn(
                "duration-200 text-sidebar-accent-foreground group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8"
            )}>
            <p className="font-semibold text-sm">{currentUserName}</p>
            {user && 'role' in user && <p className="text-xs text-sidebar-foreground/70">{(user as Employee).role}</p>}
          </div>
        </div>
      </div>

      <SidebarContent className="p-2">
        <SidebarMenu>
            {!isReady ? (
                <>
                    <SidebarMenuSkeleton />
                    <SidebarMenuSkeleton />
                    <SidebarMenuSkeleton />
                </>
             ) : (
                <>
                    {renderMenuItems([{ href: '/', label: 'الرئيسية', icon: Home }])}
                    {renderMenuItems(mainItems)}
                    <SidebarSeparator />
                    <CollapsibleMenuGroup title="الإدارة" icon={PanelTopOpen} items={managementItems} renderMenuItems={renderMenuItems} loading={!isReady} />
                    <CollapsibleMenuGroup title="المالية" icon={Landmark} items={financialItems} renderMenuItems={renderMenuItems} loading={!isReady} />
                    <CollapsibleMenuGroup title="العملاء" icon={Contact} items={customerItems} renderMenuItems={renderMenuItems} loading={!isReady} />
                    <CollapsibleMenuGroup title="الإعدادات" icon={Settings} items={settingsMenuItems} renderMenuItems={renderMenuItems} loading={!isReady} />
                </>
             )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
          <SidebarMenu>
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

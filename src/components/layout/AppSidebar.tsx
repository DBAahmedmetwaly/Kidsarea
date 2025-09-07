
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
  KeyRound,
  PackageSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/context/FirebaseContext';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Employee } from '@/lib/types';
import { usePermissions } from '@/context/PermissionsContext';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { BossBabyLogo } from './BossBabyLogo';


const mainItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/pos', label: 'يلا نلعب', icon: ShoppingBag },
  { href: '/sessions', label: 'سجل الجلسات', icon: History },
];

const managementItems = [
  { href: '/branches', label: 'الفروع', icon: Building2 },
  { href: '/employees', label: 'الموظفين', icon: Users },
  { href: '/games', label: 'الألعاب', icon: Layers },
  { href: '/game-categories', label: 'تصنيفات الألعاب', icon: Layers },
  { href: '/products', label: 'كتالوج المنتجات', icon: ShoppingCart },
  { href: '/product-categories', label: 'فئات المنتجات', icon: ShoppingBag },
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
  { href: '/reports/inventory-log', label: 'تقرير حركة الأصناف', icon: PackageSearch },
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


export const allMenuItems = [
    { href: '/', label: 'الرئيسية', icon: Home },
    ...mainItems, 
    ...managementItems, 
    ...financialItems, 
    ...customerItems, 
    ...settingsMenuItems,
];


const ChangePasswordDialog = dynamic(() => import('./ChangePasswordDialog'), {
    loading: () => <Skeleton className="w-full h-80" />,
});


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
  const { permissions, loading } = usePermissions();
  const { setOpenMobile } = useSidebar();
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);


  const defaultPolicies = allPolicies?.find(p => p.id === 'default');
  const appName = defaultPolicies?.appName || 'FunTrack';
  const posScreenTitle = defaultPolicies?.posLabels?.screenTitle || 'يلا نلعب';

  useEffect(() => {
    if (appName) {
        document.title = appName + ' Manager';
    }
  }, [appName]);

  const hasPermission = (href: string) => {
    if (loading || !permissions) return false;

    // Allow access to details pages if the main page is accessible
    const detailPaths = [
        {detail: '/subscriptions/[subscriptionId]', main: '/subscriptions'},
        {detail: '/customers/[customerId]', main: '/customers'},
        {detail: '/games/[gameName]', main: '/games'},
        {detail: '/safes/[safeId]', main: '/safes'},
    ];
    
    for (const path of detailPaths) {
        if (pathname.startsWith(path.main) && permissions[path.main]) {
            return true;
        }
    }
    
    return !!permissions[href];
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
                    <span>{item.href === '/pos' ? posScreenTitle : item.label}</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        ) : null
    )
  }
  
  const currentUserName = user ? ('name' in user ? user.name : 'Admin') : 'Guest';

  if (loading) {
      return (
        <div className="flex flex-col h-full overflow-y-auto">
          <SidebarHeader className="justify-between">
              <Skeleton className="h-8 w-32" />
          </SidebarHeader>
          <div className="p-2"><Skeleton className="h-12 w-full" /></div>
          <SidebarContent className="p-2">
            {[...Array(3)].map((_, i) => (
                 <div key={i} className='mb-4'>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <div className="space-y-2">
                        <SidebarMenuSkeleton />
                        <SidebarMenuSkeleton />
                    </div>
                </div>
            ))}
          </SidebarContent>
        </div>
      )
  }

  return (
    <>
    <div className="flex flex-col h-full overflow-y-auto">
      <SidebarHeader className="justify-between">
         <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary px-2">
            <BossBabyLogo className="h-8 w-8" />
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
                "duration-200 text-sidebar-accent-foreground group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-8 flex-grow"
            )}>
            <p className="font-semibold text-sm">{currentUserName}</p>
            {user && 'role' in user && <p className="text-xs text-sidebar-foreground/70">{(user as Employee).role}</p>}
          </div>
            {user && 'role' in user && (
                 <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:hidden" onClick={() => setPasswordDialogOpen(true)}>
                    <KeyRound className="h-4 w-4" />
                </Button>
            )}
        </div>
      </div>

      <SidebarContent className="p-2">
        <SidebarMenu>
            {renderMenuItems([{ href: '/', label: 'الرئيسية', icon: Home }])}
            {renderMenuItems(mainItems)}
            <SidebarSeparator />
            <CollapsibleMenuGroup title="الإدارة" icon={PanelTopOpen} items={managementItems} renderMenuItems={renderMenuItems} loading={loading} />
            <CollapsibleMenuGroup title="المالية" icon={Landmark} items={financialItems} renderMenuItems={renderMenuItems} loading={loading} />
            <CollapsibleMenuGroup title="العملاء" icon={Contact} items={customerItems} renderMenuItems={renderMenuItems} loading={loading} />
            <CollapsibleMenuGroup title="الإعدادات" icon={Settings} items={settingsMenuItems} renderMenuItems={renderMenuItems} loading={loading} />
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto">
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
    </div>
    {isPasswordDialogOpen && (
        <ChangePasswordDialog 
            open={isPasswordDialogOpen}
            onOpenChange={setPasswordDialogOpen}
        />
    )}
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

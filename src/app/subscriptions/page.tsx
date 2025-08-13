
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { add, differenceInDays } from 'date-fns';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useCustomers } from '@/context/CustomerContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Subscription, SubscriptionPlan } from '@/lib/types';
import { Star, PlusCircle, Trash, RotateCw, MoreHorizontal, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePosPrint } from '@/hooks/use-pos-print';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@/components/ui/table';
import dynamic from 'next/dynamic';

const SubscriptionFormDialog = dynamic(() => import('./_components/SubscriptionFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

const subscriptionSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  childNames: z.array(z.string()).min(1, 'يجب اختيار طفل واحد على الأقل'),
  planId: z.string().min(1, 'يجب اختيار باقة الاشتراك'),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

function SubscriptionsContent() {
  const { subscriptions: firebaseSubscriptions, policies: allPolicies } = useFirebase();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<Omit<SubscriptionFormValues, 'childNames'> & { childName: string }> | undefined>();
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'EndingSoon' | 'Expired'>('all');
  const { toast } = useToast();
  const { printReceipt } = usePosPrint();
  const defaultPolicies = allPolicies.find(p => p.id === 'default');

  useEffect(() => {
    // Sync and update subscription statuses
    const subscriptionsRef = ref(db, 'subscriptions');
    const unsubscribe = onValue(subscriptionsRef, (snapshot) => {
        const data = snapshot.val();
        const subsArray: Subscription[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as any) })) : [];
        
        const today = new Date();
        let needsUpdate = false;
        const updatedSubs = subsArray.map(sub => {
            if (sub.status === 'Active' && today > new Date(sub.endDate)) {
                needsUpdate = true;
                const subRef = ref(db, `subscriptions/${sub.id}`);
                update(subRef, { status: 'Expired' });
                return { ...sub, status: 'Expired' };
            }
            return sub;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setSubscriptions(updatedSubs);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteSubscription = async (id: string) => {
    try {
        await remove(ref(db, `subscriptions/${id}`));
        toast({ title: "تم حذف الاشتراك بنجاح" });
    } catch(e) {
        toast({ title: "خطأ", description: "فشل حذف الاشتراك", variant: 'destructive'});
    }
  };

  const handleRenew = (sub: Subscription) => {
    setFormInitialData({
        customerId: sub.customerId,
        childName: sub.childName,
        planId: sub.planId,
    });
    setFormOpen(true);
  };
  
  const handlePrintCard = (sub: Subscription) => {
      const cardDetails = {
        appName: defaultPolicies?.appName || 'FunTrack',
        customerName: sub.customerName,
        childName: sub.childName,
        planName: sub.planName,
        endDate: new Date(sub.endDate),
      };
      printReceipt(<SubscriptionCard {...cardDetails} />);
  }

  const filteredSubscriptions = useMemo(() => {
    const today = new Date();
    return subscriptions.filter(s => {
        const customerMatch = s.customerName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                             s.childName.toLowerCase().includes(searchFilter.toLowerCase());

        let statusMatch = true;
        if (statusFilter !== 'all') {
            const isEndingSoon = s.status === 'Active' && differenceInDays(new Date(s.endDate), today) <= 7;
            if (statusFilter === 'Active') {
                statusMatch = s.status === 'Active' && !isEndingSoon;
            } else if (statusFilter === 'EndingSoon') {
                statusMatch = isEndingSoon;
            } else if (statusFilter === 'Expired') {
                statusMatch = s.status === 'Expired';
            }
        }
        
        return customerMatch && statusMatch;
    });
  }, [subscriptions, searchFilter, statusFilter]);
  
  const getStatusBadge = (sub: Subscription) => {
    const today = new Date();
    if (sub.status === 'Expired') {
      return <Badge variant="destructive">منتهي</Badge>;
    }
    if (sub.status === 'Active') {
      const daysLeft = differenceInDays(new Date(sub.endDate), today);
      if (daysLeft <= 7) {
        return <Badge className="bg-orange-500 text-white">ينتهي قريباً</Badge>;
      }
      return <Badge className="bg-green-500 text-white">فعال</Badge>;
    }
    return <Badge variant="secondary">{sub.status}</Badge>
  }

  const renderContent = () => {
    if (loading) {
        return <TableBody>{[...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)}</TableBody>
    }
    return (
        <TableBody>
          {filteredSubscriptions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="text-right">
                 <Link href={`/subscriptions/${sub.id}`} className="hover:underline text-primary">
                    <div>{sub.customerName}</div>
                    <div className='text-xs text-muted-foreground'>{sub.childName}</div>
                 </Link>
              </TableCell>
              <TableCell className="text-right">
                 <div>{sub.planName}</div>
                 <div className='text-xs text-muted-foreground truncate max-w-xs'>{sub.planDescription}</div>
              </TableCell>
              <TableCell className="text-center">
                 {getStatusBadge(sub)}
              </TableCell>
              <TableCell className="text-center">{new Date(sub.startDate).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell className="text-center">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell className="text-center font-medium">{`ج.م ${sub.price.toFixed(2)}`}</TableCell>
              <TableCell className="text-center">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handlePrintCard(sub)}>
                           <Printer className="me-2 h-4 w-4"/>
                           طباعة الكارت
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRenew(sub)}>
                           <RotateCw className="me-2 h-4 w-4"/>
                           تجديد الاشتراك
                        </DropdownMenuItem>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                    <Trash className="me-2 h-4 w-4"/>
                                    حذف
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>سيؤدي هذا إلى حذف سجل الاشتراك بشكل دائم. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubscription(sub.id)}>متابعة الحذف</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <div className="md:hidden"><SidebarTrigger /></div>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الاشتراكات</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => { setFormInitialData(undefined); setFormOpen(true);}}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة اشتراك</span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>فلترة سجل الاشتراكات</CardTitle>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
               <Input 
                placeholder="ابحث باسم العميل أو الطفل..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full"
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger>
                        <SelectValue placeholder="فلترة حسب الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="Active">نشط</SelectItem>
                        <SelectItem value="EndingSoon">ينتهي قريباً</SelectItem>
                        <SelectItem value="Expired">منتهي</SelectItem>
                    </SelectContent>
                </Select>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العميل والطفل</TableHead>
                <TableHead className="text-right">الباقة</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">تاريخ البدء</TableHead>
                <TableHead className="text-center">تاريخ الانتهاء</TableHead>
                <TableHead className="text-center">السعر</TableHead>
                <TableHead className="text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </CardContent>
      </Card>
      {isFormOpen && <SubscriptionFormDialog open={isFormOpen} onOpenChange={setFormOpen} initialData={formInitialData} />}
    </div>
  );
}


export default function SubscriptionsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <SubscriptionsContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

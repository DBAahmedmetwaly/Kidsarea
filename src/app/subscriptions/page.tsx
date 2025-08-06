
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Subscription, Customer, SubscriptionPlan } from '@/lib/types';
import { Star, PlusCircle, Trash, ChevronsUpDown, Check, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { usePosPrint } from '@/hooks/use-pos-print';
import { SubscriptionReceipt } from '@/components/SubscriptionReceipt';

const subscriptionSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  childName: z.string().min(1, 'يجب اختيار الطفل'),
  planId: z.string().min(1, 'يجب اختيار باقة الاشتراك'),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

function SubscriptionFormDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { customers } = useCustomers();
  const { subscriptionPlans, employees, policies } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);

  const receiptComponent = useMemo(() => {
    if (!receiptDetails) return null;
    return <SubscriptionReceipt {...receiptDetails} />;
  }, [receiptDetails]);

  const { print } = usePosPrint(receiptComponent as React.ReactElement);

   useEffect(() => {
      if (receiptDetails) {
          print();
      }
  }, [receiptDetails, print]);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
        customerId: '',
        childName: '',
        planId: '',
    },
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.id);
    form.setValue('childName', ''); // Reset child selection
    setOpenCombobox(false);
  }

  async function onSubmit(values: SubscriptionFormValues) {
    if (!user || !user.username) {
        toast({ title: "خطأ", description: "لم يتم تحديد المستخدم الحالي."});
        return;
    }
    const customer = customers.find(c => c.id === values.customerId);
    const plan = subscriptionPlans.find(p => p.id === values.planId);
    if (!customer || !plan) {
        toast({ title: "خطأ", description: "بيانات العميل أو الباقة غير صحيحة."});
        return;
    };

    const startDate = new Date();
    const endDate = add(startDate, { days: plan.duration });

    const newSubscription: Omit<Subscription, 'id'> = {
      customerId: customer.id,
      customerName: customer.parentName,
      childName: values.childName,
      planId: plan.id,
      planName: plan.name,
      planDescription: plan.description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      price: plan.price,
      status: 'Active',
      createdAt: new Date().toISOString(),
      cashierUsername: user.username,
    };
    
    try {
        const subscriptionsRef = ref(db, 'subscriptions');
        const newSubRef = push(subscriptionsRef);
        await set(newSubRef, newSubscription);
        
        const cashier = employees.find(e => e.username === user.username);
        const cashierName = user?.username === 'admin' 
            ? 'Admin' 
            : cashier?.name || user?.username || 'N/A';

        // Prepare and trigger receipt printing
        setReceiptDetails({
            appName: policies?.appName || 'FunTrack',
            customerName: customer.parentName,
            childName: values.childName,
            planName: plan.name,
            startDate: startDate,
            endDate: endDate,
            price: plan.price,
            cashierName: cashierName,
        });

        toast({ title: "تم إنشاء الاشتراك بنجاح!"});
        onOpenChange(false);
        form.reset();
        setSelectedCustomer(null);
    } catch(e) {
        console.error(e);
        toast({ title: "خطأ", description: "فشل إنشاء الاشتراك", variant: 'destructive'})
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if(!isOpen) { form.reset(); setSelectedCustomer(null); }}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إنشاء اشتراك جديد</DialogTitle>
          <DialogDescription>اختر العميل والطفل وباقة الاشتراك.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>اختر العميل</FormLabel>
                   <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                            {selectedCustomer
                                ? `${selectedCustomer.parentName} (${selectedCustomer.phoneNumber})`
                                : "ابحث عن عميل..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="ابحث بالاسم أو الرقم..." />
                                <CommandList>
                                    <CommandEmpty>لم يتم العثور على عميل.</CommandEmpty>
                                    <CommandGroup>
                                        {customers.map((customer) => (
                                        <CommandItem
                                            key={customer.id}
                                            value={`${customer.parentName} ${customer.phoneNumber}`}
                                            onSelect={() => handleCustomerSelect(customer)}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                                            {customer.parentName}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedCustomer && (
              <FormField
                control={form.control}
                name="childName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اختر الطفل</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر من أطفال العميل..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedCustomer.children.map((child, index) => (
                          <SelectItem key={index} value={child.name}>{child.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اختر باقة الاشتراك</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر باقة..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>{plan.name} ({plan.price} ج.م / {plan.duration} يوم)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
                <Button type="submit">إنشاء الاشتراك</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'EndingSoon' | 'Expired'>('all');
  const { toast } = useToast();

  useEffect(() => {
    // Sync and update subscription statuses
    const subscriptionsRef = ref(db, 'subscriptions');
    const unsubscribe = onValue(subscriptionsRef, (snapshot) => {
        const data = snapshot.val();
        const subsArray: Subscription[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as any) })) : [];
        
        const today = new Date();
        const updatedSubs = subsArray.map(sub => {
            if (sub.status === 'Active' && today > new Date(sub.endDate)) {
                // Expire subscription in Firebase
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
              <TableCell>
                <div>{sub.customerName}</div>
                <div className='text-xs text-muted-foreground'>{sub.childName}</div>
              </TableCell>
              <TableCell>
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-red-500"><Trash className="h-4 w-4" /></Button>
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
          <Button size="sm" className="h-8 gap-1" onClick={() => setFormOpen(true)}>
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
                <TableHead>العميل والطفل</TableHead>
                <TableHead>الباقة</TableHead>
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
      <SubscriptionFormDialog open={isFormOpen} onOpenChange={setFormOpen} />
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

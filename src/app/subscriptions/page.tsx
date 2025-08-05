
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { add } from 'date-fns';
import { ref, onValue, set, push, remove } from 'firebase/database';
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
import type { Subscription, Customer } from '@/lib/types';
import { Star, PlusCircle, Trash, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const subscriptionSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  childName: z.string().min(1, 'يجب اختيار الطفل'),
  price: z.coerce.number().min(1, 'السعر يجب أن يكون أكبر من صفر'),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

function SubscriptionFormDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { customers } = useCustomers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
        customerId: '',
        childName: '',
        price: '' as unknown as number,
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
    if (!customer) return;

    const startDate = new Date();
    const endDate = add(startDate, { days: 30 });

    const newSubscription: Omit<Subscription, 'id'> = {
      customerId: customer.id,
      customerName: customer.parentName,
      childName: values.childName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      price: values.price,
      status: 'Active',
      createdAt: new Date().toISOString(),
      cashierUsername: user.username,
    };
    
    try {
        const subscriptionsRef = ref(db, 'subscriptions');
        const newSubRef = push(subscriptionsRef);
        await set(newSubRef, newSubscription);
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
          <DialogTitle>إنشاء اشتراك شهري جديد</DialogTitle>
          <DialogDescription>اختر العميل والطفل وأدخل سعر الاشتراك.</DialogDescription>
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر الاشتراك (ج.م)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="300" {...field} />
                  </FormControl>
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
  const [filter, setFilter] = useState('');
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
                // Expire subscription
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
    if (!filter) return subscriptions;
    return subscriptions.filter(s => 
        s.customerName.toLowerCase().includes(filter.toLowerCase()) || 
        s.childName.toLowerCase().includes(filter.toLowerCase())
    );
  }, [subscriptions, filter]);

  const renderContent = () => {
    if (loading) {
        return <TableBody>{[...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)}</TableBody>
    }
    return (
        <TableBody>
          {filteredSubscriptions.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell>{sub.customerName}</TableCell>
              <TableCell>{sub.childName}</TableCell>
              <TableCell className="text-center">
                 <Badge variant={sub.status === 'Active' ? 'default' : 'secondary'} className={sub.status === 'Active' ? 'bg-green-500 text-white' : ''}>
                  {sub.status === 'Active' ? 'فعال' : 'منتهي'}
                </Badge>
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
          <Input 
            placeholder="ابحث بالاسم..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button size="sm" className="h-8 gap-1" onClick={() => setFormOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة اشتراك</span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>سجل الاشتراكات</CardTitle>
          <CardDescription>عرض وإدارة جميع الاشتراكات الشهرية للعملاء.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم ولي الأمر</TableHead>
                <TableHead>اسم الطفل</TableHead>
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


'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { add, differenceInDays } from 'date-fns';
import { ref, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useCustomers } from '@/context/CustomerContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosPrint } from '@/hooks/use-pos-print';
import { SubscriptionReceipt } from '@/components/SubscriptionReceipt';
import { Checkbox } from '@/components/ui/checkbox';


const subscriptionSchema = z.object({
  customerId: z.string().min(1, 'يجب اختيار العميل'),
  childNames: z.array(z.string()).min(1, 'يجب اختيار طفل واحد على الأقل'),
  planId: z.string().min(1, 'يجب اختيار باقة الاشتراك'),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export default function SubscriptionFormDialog({ 
    open, 
    onOpenChange,
    initialData
}: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    initialData?: Partial<Omit<SubscriptionFormValues, 'childNames'> & { childName: string }>
}) {
  const { customers } = useCustomers();
  const { subscriptionPlans, subscriptions, employees, policies: allPolicies } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const { printReceipt } = usePosPrint();
  const defaultPolicies = allPolicies.find(p => p.id === 'default');


  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
        customerId: '',
        childNames: [],
        planId: '',
    },
  });

   useEffect(() => {
    if (open && initialData) {
        form.reset({
            customerId: initialData.customerId || '',
            childNames: initialData.childName ? [initialData.childName] : [],
            planId: initialData.planId || '',
        });
        if (initialData.customerId) {
            const customer = customers.find(c => c.id === initialData.customerId);
            setSelectedCustomer(customer || null);
        }
    } else if (!open) {
        form.reset({ customerId: '', childNames: [], planId: '' });
        setSelectedCustomer(null);
    }
  }, [open, initialData, form, customers]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customerId', customer.id);
    form.setValue('childNames', []); // Reset child selection
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
    
    let subscriptionsCreatedCount = 0;

    for (const childName of values.childNames) {
        // Prevent duplicate active subscriptions, allow renewal within 5 days.
        const activeSubscription = subscriptions.find(sub => 
            sub.customerId === values.customerId &&
            sub.childName === childName &&
            sub.status === 'Active'
        );

        if (activeSubscription) {
            const daysLeft = differenceInDays(new Date(activeSubscription.endDate), new Date());
            if (daysLeft > 5) {
                toast({
                    title: "اشتراك مكرر",
                    description: `الطفل "${childName}" لديه اشتراك فعال بالفعل. يمكن تجديده قبل 5 أيام من تاريخ الانتهاء.`,
                    variant: 'destructive'
                });
                continue; // Skip this child and move to the next
            }
        }


        const startDate = new Date();
        const endDate = add(startDate, { days: plan.duration });

        const newSubscription = {
        customerId: customer.id,
        customerName: customer.parentName,
        childName: childName,
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
            
            subscriptionsCreatedCount++;
            
            const cashier = employees.find(e => e.username === user.username);
            const cashierName = user?.username === 'admin' 
                ? 'Admin' 
                : cashier?.name || user?.username || 'N/A';
            
            const receiptDetails = {
                appName: defaultPolicies?.appName || 'FunTrack',
                customerName: customer.parentName,
                childName: childName,
                planName: plan.name,
                startDate: startDate,
                endDate: endDate,
                price: plan.price,
                cashierName: cashierName,
            };

            printReceipt(<SubscriptionReceipt {...receiptDetails} />);

        } catch(e) {
            console.error(e);
            toast({ title: "خطأ", description: `فشل إنشاء الاشتراك للطفل ${childName}`, variant: 'destructive'})
        }
    }

    if (subscriptionsCreatedCount > 0) {
        toast({ title: `تم إنشاء ${subscriptionsCreatedCount} اشتراك بنجاح!`});
        onOpenChange(false);
        form.reset();
        setSelectedCustomer(null);
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
                                ? `${selectedCustomer.parentName} (${(selectedCustomer.phoneNumbers || []).join(', ')})`
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
                                            value={`${customer.parentName} ${(customer.phoneNumbers || []).join(' ')}`}
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
                    name="childNames"
                    render={() => (
                        <FormItem>
                            <FormLabel>اختر الأطفال</FormLabel>
                             <div className="space-y-2 rounded-md border p-2 max-h-40 overflow-y-auto">
                                {(selectedCustomer.children || []).map((child) => (
                                    <FormField
                                    key={child.name}
                                    control={form.control}
                                    name="childNames"
                                    render={({ field }) => {
                                        return (
                                        <FormItem
                                            key={child.name}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(child.name)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), child.name])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== child.name
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                {child.name}
                                            </FormLabel>
                                        </FormItem>
                                        )
                                    }}
                                    />
                                ))}
                            </div>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

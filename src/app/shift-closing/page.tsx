

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, push, set, onValue, remove, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, CheckCircle2, PlayCircle, LogOut, Briefcase, Banknote, ChevronsRight, ChevronsUpDown, Check, FilterX, Calendar as CalendarIcon, Wallet } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirebase } from '@/context/FirebaseContext';
import { useSession } from '@/context/SessionContext';
import type { ShiftRecord, OpenShift, Safe, SafeTransaction, CompletedSession, Subscription, ProductSale, Branch } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';


const closeShiftSchema = z.object({
  cashierUsername: z.string().min(1, 'يجب اختيار الموظف'),
  branchName: z.string().min(1, 'اسم الفرع مطلوب'),
  actualRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  notes: z.string().optional(),
});

type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;

const openShiftSchema = z.object({
    cashierUsername: z.string().min(1, 'يجب اختيار الموظف'),
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;


function ShiftClosingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { employees, openShifts, subscriptions, productSales } = useFirebase();
  const { completedSessions } = useSession();
  const { user } = useAuth();
  
  const currentUser = employees.find(e => e.username === user?.username);

  const employeesWithShifts = employees.filter(e => e.role === 'كاشير' || e.role === 'مشرف' || e.role === 'مدير فرع');
  const [openCombobox, setOpenCombobox] = useState(false);

  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      cashierUsername: '',
      branchName: '',
      actualRevenue: 0,
      notes: '',
    },
  });

  const selectedCashierUsername = form.watch('cashierUsername');
  
  const {sessionsRevenue, subscriptionsRevenue, productRevenue, expectedRevenue, totalDiscounts} = useMemo(() => {
    if (!selectedCashierUsername) return { sessionsRevenue: 0, subscriptionsRevenue: 0, productRevenue: 0, expectedRevenue: 0, totalDiscounts: 0 };
    
    const openShift = openShifts.find(c => c.cashierUsername === selectedCashierUsername);
    if (!openShift) return { sessionsRevenue: 0, subscriptionsRevenue: 0, productRevenue: 0, expectedRevenue: 0, totalDiscounts: 0 };
    
    const shiftStartTime = new Date(openShift.startTime).getTime();
    
    const shiftSessions = completedSessions
      .filter(session => session.cashierUsername === selectedCashierUsername && new Date(session.checkOutTime).getTime() >= shiftStartTime)

    const sessionsRevenue = shiftSessions.reduce((total, session) => total + session.cost, 0);
    const totalDiscounts = shiftSessions.reduce((total, session) => total + (session.discount || 0), 0);

    const subscriptionsRevenue = subscriptions
      .filter(sub => sub.cashierUsername === selectedCashierUsername && new Date(sub.createdAt).getTime() >= shiftStartTime)
      .reduce((total, sub) => total + sub.price, 0);

    const productRevenue = productSales
      .filter(sale => sale.cashierUsername === selectedCashierUsername && new Date(sale.createdAt).getTime() >= shiftStartTime)
      .reduce((total, sale) => total + sale.totalAmount, 0);

    const expectedRevenue = sessionsRevenue + subscriptionsRevenue + productRevenue;

    return { sessionsRevenue, subscriptionsRevenue, productRevenue, expectedRevenue, totalDiscounts };
  }, [selectedCashierUsername, openShifts, completedSessions, subscriptions, productSales]);

  useEffect(() => {
    const openShift = openShifts.find(c => c.cashierUsername === selectedCashierUsername);
    if (openShift) {
        form.setValue('branchName', openShift.branchName, { shouldValidate: true });
    } else {
        form.setValue('branchName', '');
    }
  }, [selectedCashierUsername, openShifts, form]);
  
 const availableShiftsToClose = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.username === 'admin' || currentUser.branch === 'كل الفروع') {
        return openShifts;
    }
    
    return openShifts.filter(shift => shift.branchName === currentUser.branch);

  }, [openShifts, currentUser]);


  async function onSubmit(values: CloseShiftFormValues) {
    setLoading(true);
    setError(null);
    
    const employee = employeesWithShifts.find(e => e.username === values.cashierUsername);
    if (!employee) {
        setError('لم يتم العثور على الموظف.');
        setLoading(false);
        return;
    }

    const recordsRef = ref(db, 'shiftRecords');
    const newRecordRef = push(recordsRef);

    const newRecord: Omit<ShiftRecord, 'id'> = {
        ...values,
        cashierName: employee.name,
        expectedRevenue: expectedRevenue,
        sessionsRevenue: sessionsRevenue,
        subscriptionsRevenue: subscriptionsRevenue,
        productRevenue: productRevenue,
        date: new Date().toISOString(),
        difference: values.actualRevenue - expectedRevenue,
        safeId: '',
        status: 'Closed',
    };
    
    try {
        await set(newRecordRef, newRecord);

        const openShiftToDelete = openShifts.find(s => s.cashierUsername === values.cashierUsername);
        if (openShiftToDelete) {
          await remove(ref(db, `openShifts/${openShiftToDelete.id}`));
        }

        toast({
            title: 'تم استلام النقدية',
            description: 'تم إغلاق الوردية ويمكن الآن ترحيلها في خطوة "إغلاق اليومية".',
        });
        form.reset({cashierUsername: '', branchName: '', actualRevenue: 0, notes: ''});
        
    } catch (dbError) {
         setError('فشل حفظ البيانات الأساسية في قاعدة البيانات.');
         console.error(dbError);
    }
    
    setLoading(false);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>الخطوة 1: استلام النقدية من الموظف</CardTitle>
            <CardDescription>أدخل بيانات الوردية لإتمام عملية الاستلام. الترحيل للخزينة يتم في الخطوة التالية.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="cashierUsername"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>اختر الموظف</FormLabel>
                             <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                    >
                                        {field.value
                                        ? availableShiftsToClose.find((shift) => shift.cashierUsername === field.value)?.cashierName
                                        : "اختر موظف لإغلاق ورديته..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                    <CommandInput placeholder="ابحث عن موظف..." />
                                    <CommandList>
                                        <CommandEmpty>لا يوجد موظفين لديهم ورديات مفتوحة.</CommandEmpty>
                                        <CommandGroup>
                                        {availableShiftsToClose.map((shift) => (
                                            <CommandItem
                                            value={shift.cashierName}
                                            key={shift.id}
                                            onSelect={() => {
                                                form.setValue("cashierUsername", shift.cashierUsername);
                                                setOpenCombobox(false);
                                            }}
                                            >
                                            <Check className={cn("mr-2 h-4 w-4", shift.cashierUsername === field.value ? "opacity-100" : "opacity-0")}/>
                                            {shift.cashierName}
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
                    <FormField
                        control={form.control}
                        name="branchName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>اسم الفرع</FormLabel>
                            <FormControl>
                                <Input placeholder="سيتم تحديده تلقائياً" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-md font-medium text-center mb-4">ملخص الإيرادات</h3>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">إيرادات الجلسات</span>
                        <span className="font-mono font-semibold">{`ج.م ${sessionsRevenue.toFixed(2)}`}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">إيرادات الاشتراكات</span>
                        <span className="font-mono font-semibold">{`ج.م ${subscriptionsRevenue.toFixed(2)}`}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">إيرادات المنتجات</span>
                        <span className="font-mono font-semibold">{`ج.م ${productRevenue.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-red-500">إجمالي الخصومات (-)</span>
                        <span className="font-mono font-semibold text-red-500">{`ج.م ${totalDiscounts.toFixed(2)}`}</span>
                    </div>
                     <div className="flex justify-between items-center text-md font-bold pt-2 border-t">
                        <span className="text-primary">الإجمالي المتوقع</span>
                        <span className="font-mono text-primary">{`ج.م ${expectedRevenue.toFixed(2)}`}</span>
                    </div>
                </div>

                <FormField
                control={form.control}
                name="actualRevenue"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>النقدية الفعلية بالدرج (ج.م)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="أي ملاحظات حول الوردية (اختياري)"
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" disabled={loading || availableShiftsToClose.length === 0} className="w-full">
                    {loading ? (
                    <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        جاري الإغلاق...
                    </>
                    ) : (
                    <>
                     <LogOut className="me-2 h-4 w-4" />
                    استلام النقدية وإغلاق الوردية
                    </>
                    )}
                </Button>
                </form>
            </Form>

            {error && (
                <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>خطأ في الإغلاق</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </CardContent>
    </Card>
  );
}

function OpenShiftForm() {
    const { toast } = useToast();
    const { employees, openShifts } = useFirebase();
    const { user } = useAuth();
    const [openCombobox, setOpenCombobox] = useState(false);
    
    const currentUser = employees.find(e => e.username === user?.username);
    const employeesWithShifts = employees.filter(e => e.role === 'كاشير' || e.role === 'مشرف' || e.role === 'مدير فرع');

    const form = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            cashierUsername: '',
        },
    });

    const availableEmployees = useMemo(() => {
        const onShiftUsernames = openShifts.map(s => s.cashierUsername);
        const employeesNotOnShift = employeesWithShifts.filter(e => e.username && !onShiftUsernames.includes(e.username));

        if (!currentUser || user?.username === 'admin' || currentUser.branch === 'كل الفروع') {
            return employeesNotOnShift;
        }
        
        return employeesNotOnShift.filter(
            (e) => e.branch === currentUser.branch
        );

    }, [employeesWithShifts, openShifts, currentUser, user]);


    async function onSubmit(values: OpenShiftFormValues) {
        const employee = employeesWithShifts.find(c => c.username === values.cashierUsername);
        if (!employee || !employee.username) return;

        const newShift: Omit<OpenShift, 'id'> = {
            cashierUsername: employee.username,
            cashierName: employee.name,
            branchName: employee.branch,
            startTime: new Date().toISOString(),
        };

        try {
            const openShiftsRef = ref(db, 'openShifts');
            const newShiftRef = push(openShiftsRef);
            await set(newShiftRef, newShift);
             toast({
                title: 'تم فتح الوردية',
                description: `تم فتح وردية جديدة للموظف ${employee.name}.`,
            });
            form.reset();
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم فتح الوردية",
                variant: 'destructive'
            })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>فتح وردية جديدة</CardTitle>
                <CardDescription>اختر الموظف لبدء وردية جديدة له.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="cashierUsername"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>اختر الموظف</FormLabel>
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value
                                            ? availableEmployees.find(
                                                (employee) => employee.username === field.value
                                            )?.name
                                            : "اختر موظف لبدء ورديته..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="ابحث عن موظف..." />
                                        <CommandList>
                                        <CommandEmpty>لا يوجد موظفين متاحين.</CommandEmpty>
                                        <CommandGroup>
                                            {availableEmployees.map((employee) => (
                                            <CommandItem
                                                value={employee.name}
                                                key={employee.id}
                                                onSelect={() => {
                                                form.setValue("cashierUsername", employee.username!);
                                                setOpenCombobox(false);
                                                }}
                                            >
                                                <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    employee.username === field.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                                />
                                                {employee.name}
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
                        <Button type="submit" className="w-full" disabled={availableEmployees.length === 0}>
                           <PlayCircle className="me-2 h-4 w-4" />
                           بدء الوردية
                        </Button>
                    </form>
                </Form>
                 <ActiveShiftsTable />
            </CardContent>
        </Card>
    );
}

function ActiveShiftsTable() {
    const { openShifts, employees } = useFirebase();
    const { user } = useAuth();
    const currentUser = employees.find(e => e.username === user?.username);
    
    const filteredOpenShifts = useMemo(() => {
        if (!currentUser || currentUser.branch === 'كل الفروع') return openShifts;
        return openShifts.filter(shift => shift.branchName === currentUser.branch);
    }, [openShifts, currentUser]);

    if (filteredOpenShifts.length === 0) {
        return (
            <div className="mt-6 text-center text-muted-foreground">
                لا توجد ورديات مفتوحة حالياً.
            </div>
        );
    }
    return (
        <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">الورديات المفتوحة حالياً</h3>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">الموظف</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-right">وقت البدء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOpenShifts.map((record) => (
                        <TableRow key={record.id}>
                            <TableCell className="text-right">{record.cashierName}</TableCell>
                            <TableCell className="text-right">{record.branchName}</TableCell>
                            <TableCell className="text-right">{new Date(record.startTime).toLocaleString('ar-EG')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function DayEndClosing() {
    const { safes, employees, shiftRecords: allShiftRecords, branches } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    const shiftsToSettle = useMemo(() => {
        return allShiftRecords.filter(s => selectedShiftIds.includes(s.id) && s.status === 'Closed');
    }, [allShiftRecords, selectedShiftIds]);

    const settlementBranch = useMemo(() => {
        if (shiftsToSettle.length === 0) return null;
        const firstBranch = shiftsToSettle[0].branchName;
        const allSameBranch = shiftsToSettle.every(s => s.branchName === firstBranch);
        return allSameBranch ? firstBranch : 'multiple';
    }, [shiftsToSettle]);

    const autoSelectedSafe = useMemo(() => {
        if (!settlementBranch || settlementBranch === 'multiple') return null;
        return safes.find(s => s.branchName === settlementBranch) || null;
    }, [safes, settlementBranch]);

    const closedShifts = useMemo(() => {
        return allShiftRecords.filter(r => r.status === 'Closed');
    }, [allShiftRecords]);


    const totalToSettle = useMemo(() => {
        return shiftsToSettle.reduce((sum, s) => sum + s.actualRevenue, 0);
    }, [shiftsToSettle]);

    const handleSettleShifts = async () => {
        if (shiftsToSettle.length === 0 || !autoSelectedSafe) {
             toast({
                title: "بيانات غير مكتملة",
                description: "يرجى تحديد وردية واحدة على الأقل. يجب أن يكون للفرع خزينة واحدة على الأقل.",
                variant: 'destructive',
            });
            return;
        }
        if (settlementBranch === 'multiple') {
            toast({
                title: "خطأ في التحديد",
                description: "لا يمكن ترحيل ورديات من فروع مختلفة في نفس العملية. يرجى ترحيل كل فرع على حدة.",
                variant: 'destructive',
            });
            return;
        }
        setLoading(true);
        
        const settlementId = `settle-${Date.now()}`;
        const adminUsername = user?.username || 'Admin';

        try {
            // 1. Create one summary transaction
            const transactionRef = ref(db, 'safeTransactions');
            const newTransactionRef = push(transactionRef);
            const newTransaction: Omit<SafeTransaction, 'id'> = {
                safeId: autoSelectedSafe.id,
                settlementId: settlementId,
                amount: totalToSettle,
                type: 'deposit',
                date: new Date().toISOString(),
                cashierName: adminUsername,
                notes: `إيداع إغلاق اليومية لعدد ${shiftsToSettle.length} وردية.`,
                branchName: autoSelectedSafe.branchName,
                safeName: autoSelectedSafe.name,
            };
            await set(newTransactionRef, newTransaction);
            
            // 2. Update safe balance
            const safeRef = ref(db, `safes/${autoSelectedSafe.id}`);
            await update(safeRef, { balance: autoSelectedSafe.balance + totalToSettle });

            // 3. Update status of each settled shift
            const shiftUpdatePromises = shiftsToSettle.map(shift => {
                const shiftRef = ref(db, `shiftRecords/${shift.id}`);
                return update(shiftRef, { status: 'Settled', settlementId: settlementId, safeId: autoSelectedSafe.id });
            });
            await Promise.all(shiftUpdatePromises);

            toast({
                title: "تم إغلاق اليومية بنجاح",
                description: `تم ترحيل مبلغ ${totalToSettle.toFixed(2)} ج.م إلى خزينة ${autoSelectedSafe.name}.`,
            });
            setSelectedShiftIds([]);

        } catch(e) {
            console.error(e);
            toast({ title: "خطأ أثناء ترحيل النقدية", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        // This can be used for any logic that needs to run when the selected shifts change,
        // but the core logic is now in useMemo.
    }, [selectedShiftIds]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>الخطوة 2: إغلاق اليومية وترحيل النقدية</CardTitle>
                <CardDescription>حدد الورديات المغلقة التي تريد ترحيلها. سيتم الإيداع تلقائيًا في خزينة الفرع.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] text-right">
                                         <Checkbox
                                            checked={selectedShiftIds.length > 0 && selectedShiftIds.length === closedShifts.length}
                                            onCheckedChange={(checked) => {
                                                setSelectedShiftIds(checked ? closedShifts.map(s => s.id) : []);
                                            }}
                                            aria-label="تحديد الكل"
                                        />
                                    </TableHead>
                                    <TableHead className="text-right">الموظف</TableHead>
                                    <TableHead className="text-right">الفرع</TableHead>
                                    <TableHead className="text-right">المبلغ المستلم</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closedShifts.length > 0 ? closedShifts.map(shift => (
                                    <TableRow key={shift.id} data-state={selectedShiftIds.includes(shift.id) && "selected"}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedShiftIds.includes(shift.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedShiftIds(prev => checked ? [...prev, shift.id] : prev.filter(id => id !== shift.id))
                                                }}
                                                aria-label={`تحديد وردية ${shift.cashierName}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">{shift.cashierName}</TableCell>
                                        <TableCell className="text-right">{shift.branchName}</TableCell>
                                        <TableCell className="text-right font-medium">{`ج.م ${shift.actualRevenue.toFixed(2)}`}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">لا توجد ورديات مغلقة بانتظار الترحيل.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     {settlementBranch === 'multiple' && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>تحديد فروع متعددة</AlertTitle>
                            <AlertDescription>لا يمكن ترحيل ورديات من فروع مختلفة في نفس العملية. يرجى إلغاء تحديد بعض الورديات لتوحيد الفرع.</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-muted/50">
                        <div className='flex-1 text-center sm:text-left'>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
                                <Wallet className="h-4 w-4" />
                                خزينة الإيداع
                            </p>
                            {autoSelectedSafe ? (
                                <p className="font-semibold text-lg">{autoSelectedSafe.name}</p>
                            ) : shiftsToSettle.length > 0 ? (
                                <p className="text-red-500 font-semibold">لم يتم العثور على خزينة لهذا الفرع</p>
                            ) : (
                                <p className="text-muted-foreground">اختر ورديات لعرض الخزينة</p>
                            )}
                        </div>
                        <ChevronsRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-sm text-muted-foreground">الإجمالي للترحيل</p>
                            <p className="text-2xl font-bold text-green-600">{`ج.م ${totalToSettle.toFixed(2)}`}</p>
                        </div>
                        <Button onClick={handleSettleShifts} disabled={loading || shiftsToSettle.length === 0 || !autoSelectedSafe} className="w-full sm:w-auto">
                           {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Banknote className="me-2 h-4 w-4"/>}
                           ترحيل النقدية
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


function ShiftHistoryTable() {
    const { shiftRecords: allShiftRecords, branches, employees } = useFirebase();
    const { user } = useAuth();
    
    const [branchFilter, setBranchFilter] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();
    
    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);

    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setBranchFilter(currentUser.branch);
        }
    }, [currentUser]);

    const filteredRecords = useMemo(() => {
        let records = allShiftRecords;
        
        // Filter by branch
        if (currentUser?.branch !== 'كل الفروع') {
            records = records.filter(record => record.branchName === currentUser?.branch);
        } else {
            if (branchFilter !== 'all') {
                records = records.filter(record => record.branchName === branchFilter);
            }
        }

        // Filter by date
        const dateFiltered = records.filter(record => {
            const dateMatch = fromDate && toDate 
                ? isWithinInterval(new Date(record.date), { start: startOfDay(fromDate), end: endOfDay(toDate) })
                : true;
            return dateMatch;
        });

        return dateFiltered;
    }, [allShiftRecords, branchFilter, fromDate, toDate, currentUser]);


    const clearFilters = () => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            // Don't clear branch filter
        } else {
            setBranchFilter('all');
        }
        setFromDate(undefined);
        setToDate(undefined);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>سجل حركات استلام النقدية</CardTitle>
                <CardDescription>عرض لجميع ورديات الموظفين التي تم إغلاقها أو ترحيلها.</CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    {currentUser?.branch === 'كل الفروع' && (
                        <div className="w-full sm:w-1/4">
                            <Select value={branchFilter} onValueChange={setBranchFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الفرع" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الفروع</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="w-full sm:w-1/4">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>من تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={fromDate} onSelect={setFromDate} disabled={(date) => toDate ? date > toDate : false} initialFocus locale={ar}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="w-full sm:w-1/4">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP", { locale: ar }) : <span>إلى تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={toDate} onSelect={setToDate} disabled={(date) => fromDate ? date < fromDate : false} initialFocus locale={ar}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button variant="ghost" onClick={clearFilters}>
                        <FilterX className="me-2 h-4 w-4" />
                        مسح الفلاتر
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">التاريخ والوقت</TableHead>
                            <TableHead className="text-right">الموظف</TableHead>
                            <TableHead className="text-right">الفرع</TableHead>
                            <TableHead className="text-right">المبلغ المستلم</TableHead>
                             <TableHead className="text-center">الحالة</TableHead>
                            <TableHead className="text-right">الفرق</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="text-right">{new Date(record.date).toLocaleString('ar-EG')}</TableCell>
                                    <TableCell className="text-right">{record.cashierName}</TableCell>
                                    <TableCell className="text-right">{record.branchName}</TableCell>
                                    <TableCell className="text-right">{`ج.م ${record.actualRevenue.toFixed(2)}`}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            record.status === 'Settled' ? 'bg-green-100 text-green-800' :
                                            record.status === 'Closed' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                           {record.status === 'Settled' ? 'مرحّلة' : record.status === 'Closed' ? 'مغلقة' : 'مفتوحة'}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`text-right ${record.difference < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {`ج.م ${record.difference.toFixed(2)}`}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    لا توجد سجلات لعرضها حسب الفلاتر المحددة.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}


function ShiftManagementContent() {

  return (
    <div className="flex flex-col gap-8">
        <div className='flex items-center gap-4'>
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold md:text-2xl">إدارة الورديات واليومية</h1>
        </div>
        <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage">فتح / إغلاق وردية</TabsTrigger>
                <TabsTrigger value="settle">إغلاق اليومية</TabsTrigger>
            </TabsList>
            <TabsContent value="manage" className='pt-4 grid md:grid-cols-2 gap-8 items-start'>
                <OpenShiftForm />
                <ShiftClosingForm />
            </TabsContent>
            <TabsContent value="settle" className='pt-4'>
                <DayEndClosing />
            </TabsContent>
        </Tabs>
        <ShiftHistoryTable />
    </div>
  );
}


export default function ShiftManagementPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <ShiftManagementContent />
                </main>
            </div>
        </SidebarProvider>
    );
}




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
import { Loader2, AlertTriangle, CheckCircle2, PlayCircle, LogOut, Briefcase, Banknote, ChevronsRight } from 'lucide-react';
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
import type { ShiftRecord, OpenShift, Safe, SafeTransaction, CompletedSession, Subscription } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

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
  const { employees, openShifts, subscriptions } = useFirebase();
  const { completedSessions } = useSession();
  const { user } = useAuth();
  
  const employeesWithShifts = employees.filter(emp => emp.role === 'كاشير' || emp.role === 'مشرف' || emp.role === 'مدير فرع');


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
  
  const {sessionsRevenue, subscriptionsRevenue, expectedRevenue} = useMemo(() => {
    if (!selectedCashierUsername) return { sessionsRevenue: 0, subscriptionsRevenue: 0, expectedRevenue: 0 };
    
    const openShift = openShifts.find(c => c.cashierUsername === selectedCashierUsername);
    if (!openShift) return { sessionsRevenue: 0, subscriptionsRevenue: 0, expectedRevenue: 0 };
    
    const shiftStartTime = new Date(openShift.startTime).getTime();
    
    const sessionsRevenue = completedSessions
      .filter(session => session.cashierUsername === selectedCashierUsername && new Date(session.checkOutTime).getTime() >= shiftStartTime)
      .reduce((total, session) => total + session.cost, 0);

    const subscriptionsRevenue = subscriptions
      .filter(sub => sub.cashierUsername === selectedCashierUsername && new Date(sub.createdAt).getTime() >= shiftStartTime)
      .reduce((total, sub) => total + sub.price, 0);

    return { sessionsRevenue, subscriptionsRevenue, expectedRevenue: sessionsRevenue + subscriptionsRevenue };
  }, [selectedCashierUsername, openShifts, completedSessions, subscriptions]);

  useEffect(() => {
    const openShift = openShifts.find(c => c.cashierUsername === selectedCashierUsername);
    if (openShift) {
        form.setValue('branchName', openShift.branchName, { shouldValidate: true });
    } else {
        form.setValue('branchName', '');
    }
  }, [selectedCashierUsername, openShifts, form]);


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
                            <FormItem>
                            <FormLabel>اختر الموظف</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر من الموظفين المتاحين..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {openShifts.map(shift => (
                                    <SelectItem key={shift.id} value={shift.cashierUsername}>
                                        {shift.cashierName}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
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
                <Button type="submit" disabled={loading || openShifts.length === 0} className="w-full">
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
    const employeesWithShifts = employees.filter(e => e.role === 'كاشير' || e.role === 'مشرف' || e.role === 'مدير فرع');

    const form = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            cashierUsername: '',
        },
    });

    const availableEmployees = employeesWithShifts.filter(c => c.username && !openShifts.some(s => s.cashierUsername === c.username));

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
                                <FormItem>
                                <FormLabel>اختر الموظف</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر موظف لبدء ورديته..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableEmployees.map(employee => (
                                        <SelectItem key={employee.id} value={employee.username!}>
                                            {employee.name} ({employee.role})
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
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
    const { openShifts } = useFirebase();

    if (openShifts.length === 0) {
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
                        <TableHead>الموظف</TableHead>
                        <TableHead>الفرع</TableHead>
                        <TableHead>وقت البدء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {openShifts.map((record) => (
                        <TableRow key={record.id}>
                            <TableCell>{record.cashierName}</TableCell>
                            <TableCell>{record.branchName}</TableCell>
                            <TableCell>{new Date(record.startTime).toLocaleString('ar-EG')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function DayEndClosing({ closedShifts }: { closedShifts: ShiftRecord[] }) {
    const { safes } = useFirebase();
    const { toast } = useToast();
    const { user } = useAuth();
    const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
    const [selectedSafeId, setSelectedSafeId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const shiftsToSettle = useMemo(() => {
        return closedShifts.filter(s => selectedShiftIds.includes(s.id));
    }, [closedShifts, selectedShiftIds]);

    const totalToSettle = useMemo(() => {
        return shiftsToSettle.reduce((sum, s) => sum + s.actualRevenue, 0);
    }, [shiftsToSettle]);

    const handleSettleShifts = async () => {
        if (shiftsToSettle.length === 0 || !selectedSafeId) {
             toast({
                title: "بيانات غير مكتملة",
                description: "يرجى تحديد وردية واحدة على الأقل وخزينة للترحيل.",
                variant: 'destructive',
            });
            return;
        }
        setLoading(true);

        const safe = safes.find(s => s.id === selectedSafeId);
        if (!safe) {
             toast({ title: "الخزينة المحددة غير موجودة", variant: 'destructive'});
             setLoading(false);
             return;
        }

        const settlementId = `settle-${Date.now()}`;
        const adminUsername = user?.username || 'Admin';

        try {
            // 1. Create one summary transaction
            const transactionRef = ref(db, 'safeTransactions');
            const newTransactionRef = push(transactionRef);
            const newTransaction: Omit<SafeTransaction, 'id'> = {
                safeId: selectedSafeId,
                settlementId: settlementId,
                amount: totalToSettle,
                type: 'deposit',
                date: new Date().toISOString(),
                cashierName: adminUsername,
                notes: `إيداع إغلاق اليومية لعدد ${shiftsToSettle.length} وردية.`,
                branchName: safe.branchName,
                safeName: safe.name,
            };
            await set(newTransactionRef, newTransaction);
            
            // 2. Update safe balance
            const safeRef = ref(db, `safes/${selectedSafeId}`);
            await update(safeRef, { balance: safe.balance + totalToSettle });

            // 3. Update status of each settled shift
            const shiftUpdatePromises = shiftsToSettle.map(shift => {
                const shiftRef = ref(db, `shiftRecords/${shift.id}`);
                return update(shiftRef, { status: 'Settled', settlementId: settlementId, safeId: selectedSafeId });
            });
            await Promise.all(shiftUpdatePromises);

            toast({
                title: "تم إغلاق اليومية بنجاح",
                description: `تم ترحيل مبلغ ${totalToSettle.toFixed(2)} ج.م إلى خزينة ${safe.name}.`,
            });
            setSelectedShiftIds([]);
            setSelectedSafeId('');

        } catch(e) {
            console.error(e);
            toast({ title: "خطأ أثناء ترحيل النقدية", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>الخطوة 2: إغلاق اليومية وترحيل النقدية</CardTitle>
                <CardDescription>حدد الورديات المغلقة التي تريد ترحيلها إلى الخزينة.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                         <Checkbox
                                            checked={selectedShiftIds.length > 0 && selectedShiftIds.length === closedShifts.length}
                                            onCheckedChange={(checked) => {
                                                setSelectedShiftIds(checked ? closedShifts.map(s => s.id) : []);
                                            }}
                                            aria-label="تحديد الكل"
                                        />
                                    </TableHead>
                                    <TableHead>الموظف</TableHead>
                                    <TableHead>الفرع</TableHead>
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
                                        <TableCell>{shift.cashierName}</TableCell>
                                        <TableCell>{shift.branchName}</TableCell>
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

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-md bg-muted/50">
                        <div className='flex-1'>
                             <Select value={selectedSafeId} onValueChange={setSelectedSafeId} disabled={shiftsToSettle.length === 0}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر خزينة للإيداع..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {safes.map(safe => (
                                        <SelectItem key={safe.id} value={safe.id}>{safe.name} ({safe.branchName})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ChevronsRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-sm text-muted-foreground">الإجمالي للترحيل</p>
                            <p className="text-2xl font-bold text-green-600">{`ج.م ${totalToSettle.toFixed(2)}`}</p>
                        </div>
                        <Button onClick={handleSettleShifts} disabled={loading || shiftsToSettle.length === 0 || !selectedSafeId} className="w-full sm:w-auto">
                           {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Banknote className="me-2 h-4 w-4"/>}
                           ترحيل النقدية
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


function ShiftHistoryTable({ records }: { records: ShiftRecord[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>سجل حركات استلام النقدية</CardTitle>
                <CardDescription>عرض لجميع ورديات الموظفين التي تم إغلاقها أو ترحيلها.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>التاريخ والوقت</TableHead>
                            <TableHead>الموظف</TableHead>
                            <TableHead>الفرع</TableHead>
                            <TableHead>المبلغ المستلم</TableHead>
                             <TableHead>الحالة</TableHead>
                            <TableHead>الفرق</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length > 0 ? (
                            records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>{new Date(record.date).toLocaleString('ar-EG')}</TableCell>
                                    <TableCell>{record.cashierName}</TableCell>
                                    <TableCell>{record.branchName}</TableCell>
                                    <TableCell>{`ج.م ${record.actualRevenue.toFixed(2)}`}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            record.status === 'Settled' ? 'bg-green-100 text-green-800' :
                                            record.status === 'Closed' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                           {record.status === 'Settled' ? 'مرحّلة' : record.status === 'Closed' ? 'مغلقة' : 'مفتوحة'}
                                        </span>
                                    </TableCell>
                                    <TableCell className={record.difference < 0 ? 'text-red-500' : 'text-green-500'}>
                                        {`ج.م ${record.difference.toFixed(2)}`}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                    لا توجد سجلات لعرضها.
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
    const [shiftRecords, setShiftRecords] = useState<ShiftRecord[]>([]);

    useEffect(() => {
        const recordsRef = ref(db, 'shiftRecords');

        const unsubRecords = onValue(recordsRef, (snapshot) => {
            const data = snapshot.val();
            const recordsArray: ShiftRecord[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as any) })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
            setShiftRecords(recordsArray);
        });

        return () => {
            unsubRecords();
        }
    }, [])

  const closedShifts = useMemo(() => shiftRecords.filter(r => r.status === 'Closed'), [shiftRecords]);


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
                <DayEndClosing closedShifts={closedShifts} />
            </TabsContent>
        </Tabs>
        <ShiftHistoryTable records={shiftRecords} />
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



    

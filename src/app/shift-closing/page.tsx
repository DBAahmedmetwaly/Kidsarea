
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, push, set, onValue, remove, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { Loader2, AlertTriangle, CheckCircle2, PlayCircle, LogOut, Briefcase } from 'lucide-react';
import { detectRevenueDiscrepancy } from '@/ai/flows/revenue-discrepancy-detection';
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
import { useFirebase } from '@/context/FirebaseContext';
import { useSession } from '@/context/SessionContext';
import type { ShiftRecord, OpenShift, Safe, SafeTransaction, CompletedSession } from '@/lib/types';

const closeShiftSchema = z.object({
  cashierUsername: z.string().min(1, 'يجب اختيار الكاشير'),
  branchName: z.string().min(1, 'اسم الفرع مطلوب'),
  safeId: z.string().min(1, 'يجب اختيار الخزينة'),
  actualRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  notes: z.string().optional(),
});

type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;

const openShiftSchema = z.object({
    cashierUsername: z.string().min(1, 'يجب اختيار الكاشير'),
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;

function ShiftClosingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedRevenue, setExpectedRevenue] = useState(0);
  const { toast } = useToast();
  const { employees, safes, openShifts } = useFirebase();
  const { completedSessions } = useSession();
  const cashiers = employees.filter(emp => emp.role === 'كاشير');

  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      cashierUsername: '',
      branchName: '',
      safeId: '',
      actualRevenue: '' as unknown as number,
      notes: '',
    },
  });

  const selectedCashierUsername = form.watch('cashierUsername');
  const selectedBranchName = form.watch('branchName');

  const filteredSafes = safes.filter(s => s.branchName === selectedBranchName);

  useEffect(() => {
    if (selectedCashierUsername) {
      const openShift = openShifts.find(c => c.cashierUsername === selectedCashierUsername);
      if (openShift) {
        form.setValue('branchName', openShift.branchName, { shouldValidate: true });
        form.setValue('safeId', ''); // Reset safe selection when cashier changes
        
        const shiftStartTime = new Date(openShift.startTime).getTime();
        const revenue = completedSessions
          .filter(session => session.cashierUsername === selectedCashierUsername && session.checkOutTime >= shiftStartTime)
          .reduce((total, session) => total + session.cost, 0);
        setExpectedRevenue(revenue);
      }
    } else {
        form.setValue('branchName', '');
        setExpectedRevenue(0);
    }
  }, [selectedCashierUsername, form, openShifts, completedSessions]);


  async function onSubmit(values: CloseShiftFormValues) {
    setLoading(true);
    setError(null);
    
    const cashier = cashiers.find(c => c.username === values.cashierUsername);
    if (!cashier) {
        setError('لم يتم العثور على الكاشير.');
        setLoading(false);
        return;
    }

    const safe = safes.find(s => s.id === values.safeId);
    if (!safe) {
        setError('لم يتم العثور على الخزينة.');
        setLoading(false);
        return;
    }

    const recordsRef = ref(db, 'shiftRecords');
    const newRecordRef = push(recordsRef);
    const newRecordId = newRecordRef.key!;

    const newRecord: Omit<ShiftRecord, 'id'> = {
        ...values,
        cashierName: cashier.name,
        expectedRevenue: expectedRevenue,
        date: new Date().toISOString(),
        difference: values.actualRevenue - expectedRevenue,
        analysis: null, // Initially null
    };
    
    try {
        // 1. Save the basic shift record first
        await set(newRecordRef, newRecord);

        // 2. Update safe balance
        const safeRef = ref(db, `safes/${values.safeId}`);
        const safeSnapshot = await get(safeRef);
        if (safeSnapshot.exists()) {
            const currentBalance = safeSnapshot.val().balance;
            await update(safeRef, { balance: currentBalance + values.actualRevenue });
        }

        // 3. Create a new safe transaction
        const transactionRef = ref(db, 'safeTransactions');
        const newTransactionRef = push(transactionRef);
        const newTransaction: Omit<SafeTransaction, 'id'> = {
            safeId: values.safeId,
            shiftRecordId: newRecordId,
            amount: values.actualRevenue,
            type: 'deposit',
            date: new Date().toISOString(),
            cashierName: cashier.name,
            notes: `إيداع من وردية: ${newRecordId}`,
            branchName: safe.branchName,
            safeName: safe.name,
        };
        await set(newTransactionRef, newTransaction);

        // 4. Remove the open shift
        const openShiftToDelete = openShifts.find(s => s.cashierUsername === values.cashierUsername);
        if (openShiftToDelete) {
          await remove(ref(db, `openShifts/${openShiftToDelete.id}`));
        }

        toast({
            title: 'تم إغلاق الوردية بنجاح',
            description: 'تم تسجيل البيانات. سيتم محاولة تحليل التباين في الخلفية.',
        });
        form.reset();
        setExpectedRevenue(0);
        
        // 5. Try AI analysis in the background (fire and forget)
        const shiftDetails = `الوردية المسائية للكاشير ${cashier.name}. ملاحظات: ${values.notes || 'لا يوجد'}`;
        detectRevenueDiscrepancy({ 
            ...values, 
            expectedRevenue: expectedRevenue, 
            actualRevenue: values.actualRevenue, 
            shiftDetails, 
            branchName: values.branchName 
        }).then(analysisResult => {
            update(newRecordRef, { analysis: analysisResult });
        }).catch(aiError => {
            console.error("AI analysis failed:", aiError);
            // Optional: You could update the record to note that analysis failed.
            update(newRecordRef, { analysis: { hasDiscrepancy: true, discrepancyAnalysis: "فشل تحليل الذكاء الاصطناعي." } });
        });

    } catch (dbError) {
         setError('فشل حفظ البيانات الأساسية في قاعدة البيانات.');
         console.error(dbError);
    }
    
    setLoading(false);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>إغلاق وردية الكاشير</CardTitle>
            <CardDescription>أدخل بيانات الوردية لإتمام عملية الإغلاق وترحيل النقدية إلى الخزينة.</CardDescription>
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
                            <FormLabel>اختر الكاشير</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر من الكاشيرز المتاحين..." />
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
                 <FormField
                    control={form.control}
                    name="safeId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>اختر الخزينة للترحيل</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedBranchName}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={selectedBranchName ? "اختر خزينة..." : "اختر الكاشير أولاً"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredSafes.map(safe => (
                                <SelectItem key={safe.id} value={safe.id}>
                                    {safe.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormItem>
                        <FormLabel>الإيرادات المتوقعة (ج.م)</FormLabel>
                        <FormControl>
                            <Input type="number" value={expectedRevenue.toFixed(2)} readOnly className="font-bold text-green-600" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    <FormField
                    control={form.control}
                    name="actualRevenue"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>النقدية المستلمة (ج.م)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="1450" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
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
                    إغلاق الوردية وترحيل النقدية
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
    const cashiers = employees.filter(e => e.role === 'كاشير');

    const form = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            cashierUsername: '',
        },
    });

    const availableCashiers = cashiers.filter(c => c.username && !openShifts.some(s => s.cashierUsername === c.username));

    async function onSubmit(values: OpenShiftFormValues) {
        const cashier = cashiers.find(c => c.username === values.cashierUsername);
        if (!cashier || !cashier.username) return;

        const newShift: Omit<OpenShift, 'id'> = {
            cashierUsername: cashier.username,
            cashierName: cashier.name,
            branchName: cashier.branch,
            startTime: new Date().toISOString(),
        };

        try {
            const openShiftsRef = ref(db, 'openShifts');
            const newShiftRef = push(openShiftsRef);
            await set(newShiftRef, newShift);
             toast({
                title: 'تم فتح الوردية',
                description: `تم فتح وردية جديدة للكاشير ${cashier.name}.`,
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
                <CardDescription>اختر الكاشير لبدء وردية جديدة له.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="cashierUsername"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>اختر الكاشير</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر كاشير لبدء ورديته..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableCashiers.map(cashier => (
                                        <SelectItem key={cashier.id} value={cashier.username!}>
                                            {cashier.name}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <Button type="submit" className="w-full" disabled={availableCashiers.length === 0}>
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
                        <TableHead>الكاشير</TableHead>
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


function ShiftHistoryTable({ records }: { records: ShiftRecord[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>سجل حركات استلام النقدية</CardTitle>
                <CardDescription>عرض لجميع ورديات الكاشير التي تم إغلاقها.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>التاريخ والوقت</TableHead>
                            <TableHead>الكاشير</TableHead>
                            <TableHead>الفرع</TableHead>
                            <TableHead>المبلغ المستلم</TableHead>
                            <TableHead>الفرق</TableHead>
                            <TableHead>تحليل التباين</TableHead>
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
                                    <TableCell className={record.difference < 0 ? 'text-red-500' : 'text-green-500'}>
                                        {`ج.م ${record.difference.toFixed(2)}`}
                                    </TableCell>
                                    <TableCell>
                                        {record.analysis ? (
                                            <div className="flex items-center gap-2">
                                                {record.analysis.hasDiscrepancy ? (
                                                     <AlertTriangle className="h-5 w-5 text-orange-500" title={record.analysis.discrepancyAnalysis} />
                                                ) : (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" title={record.analysis.discrepancyAnalysis}/>
                                                )}
                                                <span className="text-xs text-muted-foreground">{record.analysis.hasDiscrepancy ? 'يوجد تباين' : 'لا يوجد تباين'}</span>
                                            </div>
                                        ) : 'جاري التحليل...'}
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
    const { setCompletedSessions } = useSession();

    useEffect(() => {
        // Sync completed sessions for revenue calculation
        const completedRef = ref(db, 'sessions/completed');
        const unsubCompleted = onValue(completedRef, (snapshot) => {
            const data = snapshot.val();
            setCompletedSessions(data ? Object.values(data) as CompletedSession[] : []);
        });

        const recordsRef = ref(db, 'shiftRecords');

        const unsubRecords = onValue(recordsRef, (snapshot) => {
            const data = snapshot.val();
            const recordsArray: ShiftRecord[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as any) })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
            setShiftRecords(recordsArray);
        });

        return () => {
            unsubRecords();
            unsubCompleted();
        }
    }, [setCompletedSessions])


  return (
    <div className="flex flex-col gap-8">
        <div className='flex items-center gap-4'>
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold md:text-2xl">إدارة الورديات</h1>
        </div>
        <Tabs defaultValue="open" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">فتح وردية</TabsTrigger>
                <TabsTrigger value="close">إغلاق وردية</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className='pt-4'>
                <OpenShiftForm />
            </TabsContent>
            <TabsContent value="close" className='pt-4'>
                <ShiftClosingForm />
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


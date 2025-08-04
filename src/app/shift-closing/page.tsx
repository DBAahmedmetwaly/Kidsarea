
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { checkDiscrepancy } from '@/app/actions';
import type { RevenueDiscrepancyOutput } from '@/ai/flows/revenue-discrepancy-detection';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { employees } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const closeShiftSchema = z.object({
  cashierUsername: z.string().min(1, 'يجب اختيار الكاشير'),
  branchName: z.string().min(1, 'اسم الفرع مطلوب'),
  expectedRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  actualRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  notes: z.string().optional(),
});

type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;

const openShiftSchema = z.object({
    cashierUsername: z.string().min(1, 'يجب اختيار الكاشير'),
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;


interface ShiftRecord extends Omit<CloseShiftFormValues, 'cashierUsername'> {
  id: number;
  cashierName: string;
  date: string;
  difference: number;
  analysis: RevenueDiscrepancyOutput | null;
}

interface OpenShift {
    cashierUsername: string;
    cashierName: string;
    branchName: string;
    startTime: string;
}

const cashiers = employees.filter(emp => emp.role === 'كاشير');

function ShiftClosingForm({ onShiftClose, openShifts, setOpenShifts }: { onShiftClose: (record: ShiftRecord) => void, openShifts: OpenShift[], setOpenShifts: React.Dispatch<React.SetStateAction<OpenShift[]>> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      cashierUsername: '',
      branchName: '',
      expectedRevenue: undefined,
      actualRevenue: undefined,
      notes: '',
    },
  });

  const selectedCashierUsername = form.watch('cashierUsername');

  useEffect(() => {
    if (selectedCashierUsername) {
      const cashier = cashiers.find(c => c.username === selectedCashierUsername);
      if (cashier) {
        form.setValue('branchName', cashier.branch, { shouldValidate: true });
      }
    } else {
        form.setValue('branchName', '');
    }
  }, [selectedCashierUsername, form]);


  async function onSubmit(values: CloseShiftFormValues) {
    setLoading(true);
    setError(null);
    
    const cashier = cashiers.find(c => c.username === values.cashierUsername);
    if (!cashier) {
        setError('لم يتم العثور على الكاشير.');
        setLoading(false);
        return;
    }

    const shiftDetails = `الوردية المسائية للكاشير ${cashier.name}. ملاحظات: ${values.notes || 'لا يوجد'}`;
    const response = await checkDiscrepancy({ ...values, expectedRevenue: values.expectedRevenue, actualRevenue: values.actualRevenue, shiftDetails, branchName: values.branchName });
    
    if (response.success && response.data) {
        const newRecord: ShiftRecord = {
            branchName: values.branchName,
            expectedRevenue: values.expectedRevenue,
            actualRevenue: values.actualRevenue,
            notes: values.notes,
            id: Date.now(),
            cashierName: cashier.name,
            date: new Date().toLocaleString('ar-EG'),
            difference: values.actualRevenue - values.expectedRevenue,
            analysis: response.data,
        };
        onShiftClose(newRecord);
        setOpenShifts(shifts => shifts.filter(s => s.cashierUsername !== values.cashierUsername));

        toast({
            title: 'تم إغلاق الوردية بنجاح',
            description: 'تم تسجيل بيانات الوردية وإضافتها للسجل.',
        });
        form.reset();
    } else {
      setError(response.error || 'حدث خطأ غير متوقع.');
    }
    
    setLoading(false);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>إغلاق وردية الكاشير</CardTitle>
            <CardDescription>أدخل بيانات الوردية لإتمام عملية الإغلاق واستلام النقدية.</CardDescription>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر من الكاشيرز المتاحين..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {openShifts.map(shift => (
                                    <SelectItem key={shift.cashierUsername} value={shift.cashierUsername}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="expectedRevenue"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الإيرادات المتوقعة (ج.م)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="1500" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
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
                        جاري التحليل والإغلاق...
                    </>
                    ) : (
                    <>
                     <LogOut className="me-2 h-4 w-4" />
                    إغلاق الوردية واستلام النقدية
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

function OpenShiftForm({ onShiftOpen, openShifts }: { onShiftOpen: (shift: OpenShift) => void, openShifts: OpenShift[]}) {
    const { toast } = useToast();
    const form = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            cashierUsername: '',
        },
    });

    const availableCashiers = cashiers.filter(c => !openShifts.some(s => s.cashierUsername === c.username));

    function onSubmit(values: OpenShiftFormValues) {
        const cashier = cashiers.find(c => c.username === values.cashierUsername);
        if (!cashier) return;

        const newShift: OpenShift = {
            cashierUsername: cashier.username!,
            cashierName: cashier.name,
            branchName: cashier.branch,
            startTime: new Date().toLocaleString('ar-EG'),
        };

        onShiftOpen(newShift);
        toast({
            title: 'تم فتح الوردية',
            description: `تم فتح وردية جديدة للكاشير ${cashier.name}.`,
        });
        form.reset();
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر كاشير لبدء ورديته..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableCashiers.map(cashier => (
                                        <SelectItem key={cashier.username} value={cashier.username!}>
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
                 <ActiveShiftsTable records={openShifts} />
            </CardContent>
        </Card>
    )
}

function ActiveShiftsTable({ records }: { records: OpenShift[] }) {
    if (records.length === 0) return null;
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
                    {records.map((record) => (
                        <TableRow key={record.cashierUsername}>
                            <TableCell>{record.cashierName}</TableCell>
                            <TableCell>{record.branchName}</TableCell>
                            <TableCell>{record.startTime}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
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
                                    <TableCell>{record.date}</TableCell>
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
                                        ) : 'N/A'}
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
    const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);


    const handleNewShiftRecord = (record: ShiftRecord) => {
        setShiftRecords([record, ...shiftRecords]);
    }

    const handleNewOpenShift = (shift: OpenShift) => {
        setOpenShifts([shift, ...openShifts]);
    }

  return (
    <div className="flex flex-col gap-8">
        <div className='flex items-center gap-4'>
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold md:text-2xl">إدارة الورديات</h1>
        </div>
        <Tabs defaultValue="open" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">فتح وردية</TabsTrigger>
                <TabsTrigger value="close">إغلاق وردية</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className='pt-4'>
                <OpenShiftForm onShiftOpen={handleNewOpenShift} openShifts={openShifts}/>
            </TabsContent>
            <TabsContent value="close" className='pt-4'>
                <ShiftClosingForm onShiftClose={handleNewShiftRecord} openShifts={openShifts} setOpenShifts={setOpenShifts} />
            </TabsContent>
        </Tabs>
        <ShiftHistoryTable records={shiftRecords} />
    </div>
  );
}


export default function ShiftManagementPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <ShiftManagementContent />
                </main>
            </div>
        </SidebarProvider>
    );
}

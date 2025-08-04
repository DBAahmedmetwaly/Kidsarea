
'use client';

import { useState } from 'react';
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
import { Lightbulb, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { checkDiscrepancy } from '@/app/actions';
import type { RevenueDiscrepancyOutput } from '@/ai/flows/revenue-discrepancy-detection';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';


const formSchema = z.object({
  branchName: z.string().min(1, 'اسم الفرع مطلوب'),
  cashierName: z.string().min(1, 'اسم الكاشير مطلوب'),
  expectedRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  actualRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ShiftRecord extends FormValues {
  id: number;
  date: string;
  difference: number;
  analysis: RevenueDiscrepancyOutput | null;
}

function ShiftClosingForm({ onShiftClose }: { onShiftClose: (record: ShiftRecord) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchName: '',
      cashierName: '',
      expectedRevenue: undefined,
      actualRevenue: undefined,
      notes: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);

    const shiftDetails = `الوردية المسائية للكاشير ${values.cashierName}. ملاحظات: ${values.notes || 'لا يوجد'}`;
    const response = await checkDiscrepancy({ ...values, shiftDetails });
    
    if (response.success && response.data) {
        const newRecord: ShiftRecord = {
            ...values,
            id: Date.now(),
            date: new Date().toLocaleString('ar-EG'),
            difference: values.actualRevenue - values.expectedRevenue,
            analysis: response.data,
        };
        onShiftClose(newRecord);
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
                        name="branchName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>اسم الفرع</FormLabel>
                            <FormControl>
                                <Input placeholder="فرع الرياض بارك" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="cashierName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>اسم الكاشير</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: محمد" {...field} />
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
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                    <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        جاري التحليل والإغلاق...
                    </>
                    ) : (
                    'إغلاق الوردية واستلام النقدية'
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


function ShiftClosingContent() {
    const [shiftRecords, setShiftRecords] = useState<ShiftRecord[]>([]);

    const handleNewShiftRecord = (record: ShiftRecord) => {
        setShiftRecords([record, ...shiftRecords]);
    }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold md:text-2xl">إدارة ورديات الكاشير</h1>
      <ShiftClosingForm onShiftClose={handleNewShiftRecord} />
      <ShiftHistoryTable records={shiftRecords} />
    </div>
  );
}


export default function ShiftClosingPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <ShiftClosingContent />
                </main>
            </div>
        </SidebarProvider>
    );
}

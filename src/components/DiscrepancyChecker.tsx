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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { checkDiscrepancy } from '@/app/actions';
import type { RevenueDiscrepancyOutput } from '@/ai/flows/revenue-discrepancy-detection';

const formSchema = z.object({
  expectedRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  actualRevenue: z.coerce.number().min(0, 'يجب أن يكون مبلغًا موجبًا'),
  branchName: z.string().min(1, 'اسم الفرع مطلوب'),
  shiftDetails: z.string().min(10, 'تفاصيل الوردية مطلوبة'),
});

type FormValues = z.infer<typeof formSchema>;

export function DiscrepancyChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RevenueDiscrepancyOutput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expectedRevenue: undefined,
      actualRevenue: undefined,
      branchName: '',
      shiftDetails: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const response = await checkDiscrepancy(values);
    
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error || 'حدث خطأ غير متوقع.');
    }
    
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>الإيرادات الفعلية (ج.م)</FormLabel>
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
            name="shiftDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تفاصيل الوردية</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="مثال: الوردية الصباحية، ٢٥ مايو، الموظف: أحمد"
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
                جاري التحليل...
              </>
            ) : (
              <>
                <Lightbulb className="me-2 h-4 w-4" />
                تحليل التباين
              </>
            )}
          </Button>
        </form>
      </Form>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ في التحليل</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className={result.hasDiscrepancy ? 'border-orange-500' : 'border-green-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.hasDiscrepancy ? (
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              )}
              نتيجة التحليل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-lg mb-2">
                {result.hasDiscrepancy ? 'تم اكتشاف تباين محتمل!' : 'لا يوجد تباين كبير.'}
            </p>
            <p className="text-muted-foreground">{result.discrepancyAnalysis}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

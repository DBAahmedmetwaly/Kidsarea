
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReceiptSettings } from '@/lib/types';
import { PosReceipt } from '@/components/Receipt';


const receiptSettingsSchema = z.object({
    showLogo: z.boolean(),
    showAppName: z.boolean(),
    showThankYouMessage: z.boolean(),
    thankYouMessage: z.string().optional(),
    showChildName: z.boolean(),
    showParentName: z.boolean(),
    showGameName: z.boolean(),
    showCheckInTime: z.boolean(),
    showCheckOutTime: z.boolean(),
    showDuration: z.boolean(),
    showDurationCost: z.boolean(),
    showEntryFee: z.boolean(),
    showDiscount: z.boolean(),
    showTotalCost: z.boolean(),
    showCashierName: z.boolean(),
    showReceiptId: z.boolean(),
    showTimestamp: z.boolean(),
    customFooter: z.string().optional(),
});

type ReceiptSettingsValues = z.infer<typeof receiptSettingsSchema>;

const labelsMap: { [key in keyof ReceiptSettings]: string } = {
    showLogo: 'إظهار الشعار',
    showAppName: 'إظهار اسم التطبيق',
    showThankYouMessage: 'إظهار رسالة الشكر',
    thankYouMessage: 'رسالة الشكر',
    showChildName: 'إظهار اسم الطفل',
    showParentName: 'إظهار اسم ولي الأمر',
    showGameName: 'إظهار اسم اللعبة',
    showCheckInTime: 'إظهار وقت الدخول',
    showCheckOutTime: 'إظهار وقت الخروج',
    showDuration: 'إظهار المدة',
    showDurationCost: 'إظهار تكلفة اللعب',
    showEntryFee: 'إظهار رسوم الدخول',
    showDiscount: 'إظهار الخصم',
    showTotalCost: 'إظهار التكلفة الإجمالية',
    showCashierName: 'إظهار اسم الكاشير',
    showReceiptId: 'إظهار رقم الإيصال',
    showTimestamp: 'إظهار التاريخ والوقت',
    customFooter: 'تذييل الإيصال',
};


function ReceiptDesignerContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<ReceiptSettingsValues>({
    resolver: zodResolver(receiptSettingsSchema),
    defaultValues: {
        showLogo: true,
        showAppName: true,
        showThankYouMessage: true,
        thankYouMessage: 'شكراً لزيارتكم!',
        showChildName: true,
        showParentName: true,
        showGameName: true,
        showCheckInTime: true,
        showCheckOutTime: true,
        showDuration: true,
        showDurationCost: true,
        showEntryFee: true,
        showDiscount: true,
        showTotalCost: true,
        showCashierName: true,
        showReceiptId: true,
        showTimestamp: true,
        customFooter: 'نتمنى لكم يوماً سعيداً!',
    },
  });

  const watchedSettings = form.watch();

  useEffect(() => {
    const settingsRef = ref(db, 'receiptSettings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        form.reset(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [form]);

  async function onSubmit(values: ReceiptSettingsValues) {
    try {
      const settingsRef = ref(db, 'receiptSettings');
      await update(settingsRef, values);
      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم تحديث إعدادات تصميم الإيصال.',
      });
    } catch (error) {
      console.error('Failed to save receipt settings:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ إعدادات الإيصال.',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const dummyReceiptProps = {
    receiptId: "EX-1234",
    settings: watchedSettings,
    appName: 'FunTrack',
    branchName: "الفرع الرئيسي",
    children: [{id: '1', name: 'اسم الطفل', age: 5}],
    parentName: 'اسم ولي الأمر',
    gameName: 'لعبة افتراضية',
    checkInTime: new Date(Date.now() - 3600 * 1000),
    checkOutTime: new Date(),
    duration: '1 ساعة و 0 دقيقة',
    totalCost: 90,
    durationCost: 100,
    entryFee: 10,
    discount: 20,
    cashierName: 'اسم الكاشير',
    isSubscription: false,
  };


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">تصميم الإيصال</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>محتوى الإيصال</CardTitle>
                <CardDescription>
                  اختر العناصر التي ترغب في إظهارها أو إخفائها في الإيصال.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {Object.keys(form.getValues()).filter(k => typeof form.getValues(k as keyof ReceiptSettingsValues) === 'boolean').map((key) => {
                     const fieldKey = key as keyof ReceiptSettingsValues;
                     return (
                        <FormField
                            key={fieldKey}
                            control={form.control}
                            name={fieldKey}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <FormLabel className="text-sm">
                                    {labelsMap[fieldKey] || fieldKey}
                                    </FormLabel>
                                    <FormControl>
                                    <Switch
                                        checked={field.value as boolean}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                     )
                 })}
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>نصوص مخصصة</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="thankYouMessage"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{labelsMap.thankYouMessage}</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="customFooter"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{labelsMap.customFooter}</FormLabel>
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <Button type="submit" disabled={loading}>
              <Save className="me-2 h-4 w-4" />
              حفظ التغييرات
            </Button>
          </div>
          
          <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>معاينة حية</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-200 p-2 rounded-md">
                        <PosReceipt {...dummyReceiptProps} />
                    </div>
                </CardContent>
             </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}


export default function ReceiptDesignerPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <ReceiptDesignerContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

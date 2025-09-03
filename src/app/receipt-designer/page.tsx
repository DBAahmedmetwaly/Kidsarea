

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const receiptSettingsSchema = z.object({
    // Header
    showLogo: z.boolean(),
    showAppName: z.boolean(),
    showAddress: z.boolean(),
    address: z.string().optional(),
    showPhone: z.boolean(),
    phone: z.string().optional(),
    showCustomTitle: z.boolean(),
    customTitle: z.string().optional(),
    // Invoice Info
    showReceiptId: z.boolean(),
    showCashierName: z.boolean(),
    showCheckInTime: z.boolean(),
    showCheckOutTime: z.boolean(),
    // Customer Info
    showParentName: z.boolean(),
    showChildName: z.boolean(),
    // Details
    showGameName: z.boolean(),
    showDuration: z.boolean(),
    // Totals
    showDurationCost: z.boolean(),
    showEntryFee: z.boolean(),
    showDiscount: z.boolean(),
    showTotalCost: z.boolean(),
    // Footer
    showThankYouMessage: z.boolean(),
    thankYouMessage: z.string().optional(),
    customFooter: z.string().optional(),
    layout: z.enum(['one-column', 'two-columns']).optional(),
    receiptWidth: z.coerce.number().int().min(10).optional(),
    showTimestamp: z.boolean(),
});


type ReceiptSettingsValues = z.infer<typeof receiptSettingsSchema>;

const defaultValues: ReceiptSettingsValues = {
    showLogo: true,
    showAppName: true,
    showAddress: true,
    address: 'العنوان هنا',
    showPhone: true,
    phone: '0123456789',
    showCustomTitle: true,
    customTitle: 'فاتورة جلسة لعب',
    showReceiptId: true,
    showCashierName: true,
    showCheckInTime: true,
    showCheckOutTime: true,
    showParentName: true,
    showChildName: true,
    showGameName: true,
    showDuration: true,
    showDurationCost: true,
    showEntryFee: true,
    showDiscount: true,
    showTotalCost: true,
    showThankYouMessage: true,
    thankYouMessage: 'شكراً لزيارتكم!',
    customFooter: 'نتمنى لكم يوماً سعيداً ونتمنى عودتكم',
    layout: 'two-columns',
    receiptWidth: 72,
    showTimestamp: true,
};


const labelsMap: { [key: string]: string } = {
    showLogo: 'إظهار الشعار',
    showAppName: 'إظهار اسم النشاط',
    showAddress: 'إظهار العنوان',
    address: 'العنوان',
    showPhone: 'إظهار رقم الهاتف',
    phone: 'رقم الهاتف',
    showCustomTitle: 'إظهار عنوان مخصص',
    customTitle: 'العنوان المخصص',
    showReceiptId: 'إظهار رقم الفاتورة',
    showCashierName: 'إظهار اسم الكاشير',
    showCheckInTime: 'إظهار وقت الدخول',
    showCheckOutTime: 'إظهار وقت الخروج',
    showParentName: 'إظهار اسم ولي الأمر',
    showChildName: 'إظهار اسم الطفل',
    showGameName: 'إظهار اسم اللعبة',
    showDuration: 'إظهار مدة اللعب',
    showDurationCost: 'إظهار تكلفة المدة',
    showEntryFee: 'إظهار رسوم الدخول',
    showDiscount: 'إظهار الخصم',
    showTotalCost: 'إظهار الإجمالي',
    showThankYouMessage: 'إظهار رسالة الشكر',
    thankYouMessage: 'نص رسالة الشكر',
    customFooter: 'نص التذييل الإضافي',
    layout: 'تخطيط الإيصال',
    receiptWidth: 'عرض الإيصال (mm)',
    showTimestamp: 'إظهار تاريخ ووقت الطباعة',
};

function ReceiptDesignerContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<ReceiptSettingsValues>({
    resolver: zodResolver(receiptSettingsSchema),
    defaultValues: defaultValues,
  });

  const watchedSettings = form.watch();

  useEffect(() => {
    const settingsRef = ref(db, 'receiptSettings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      const settingsToReset = { ...defaultValues, ...(data || {}) };
      
      // Ensure layout has a default value if it's missing from DB
      if (!settingsToReset.layout) {
          settingsToReset.layout = 'two-columns';
      }
       if (!settingsToReset.receiptWidth) {
          settingsToReset.receiptWidth = 72;
      }

      form.reset(settingsToReset);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [form]);

  async function onSubmit(values: ReceiptSettingsValues) {
    try {
      const settingsRef = ref(db, 'receiptSettings');
      await set(settingsRef, values);
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
    children: [{id: '1', name: 'اسم الطفل', age: 5, birthdate: ''}],
    parentName: 'اسم ولي الأمر',
    phoneNumbers: ['01001234567'],
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
                <CardTitle>البيانات الأساسية</CardTitle>
                <CardDescription>أدخل بيانات نشاطك التجاري التي ستظهر في رأس الإيصال.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{labelsMap.address}</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{labelsMap.phone}</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="customTitle"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{labelsMap.customTitle}</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="receiptWidth"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{labelsMap.receiptWidth}</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || 72} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>محتوى الإيصال</CardTitle>
                <CardDescription>اختر العناصر التي ترغب في إظهارها أو إخفائها.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {Object.keys(defaultValues).filter(k => typeof (defaultValues as any)[k] === 'boolean').map((key) => {
                     const fieldKey = key as keyof ReceiptSettingsValues;
                     if (fieldKey === 'layout') return null; // We handle layout with radio buttons
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
                            <FormControl><Input {...field} value={field.value || ''}/></FormControl>
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
                            <FormControl><Textarea {...field} value={field.value || ''} /></FormControl>
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
                    <div className="bg-white p-1 rounded-md border w-full mx-auto" style={{maxWidth: `${watchedSettings.receiptWidth || 72}mm`}}>
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
          <ReceiptDesignerPageContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

const ReceiptDesignerPageContent = () => {
  return (
    <div className="h-full w-full">
      <ReceiptDesignerContent />
    </div>
  )
}

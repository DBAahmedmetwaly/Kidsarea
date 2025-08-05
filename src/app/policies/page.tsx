
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { ref, update, onValue } from 'firebase/database';
import { useFirebase } from '@/context/FirebaseContext';
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
import { useToast } from '@/hooks/use-toast';
import { Settings, Trash, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import type { DayOfWeek } from '@/lib/types';

const pricingPolicySchema = z.object({
  gameId: z.string().min(1, 'يجب اختيار اللعبة'),
  weekdayRate: z.coerce.number().min(0, 'السعر يجب أن يكون رقمًا موجبًا'),
  weekendRate: z.coerce.number().min(0, 'السعر يجب أن يكون رقمًا موجبًا'),
});

const policiesSchema = z.object({
  appName: z.string().optional(),
  maxCapacity: z.coerce.number().int().min(0, 'السعة يجب أن تكون رقمًا صحيحًا موجبًا'),
  entryFee: z.coerce.number().min(0, 'رسوم الدخول يجب أن تكون رقمًا موجبًا'),
  roundingPolicy: z.enum(['none', 'quarter-hour', 'half-hour', 'hour']),
  enableWeekendPricing: z.boolean(),
  pricingPolicies: z.array(pricingPolicySchema),
  weekendDays: z.object({
    saturday: z.boolean(),
    sunday: z.boolean(),
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
  }),
});

type PoliciesFormValues = z.infer<typeof policiesSchema>;

const daysOfWeek: { id: DayOfWeek, label: string }[] = [
    { id: 'saturday', label: 'السبت' },
    { id: 'sunday', label: 'الأحد' },
    { id: 'monday', label: 'الإثنين' },
    { id: 'tuesday', label: 'الثلاثاء' },
    { id: 'wednesday', label: 'الأربعاء' },
    { id: 'thursday', label: 'الخميس' },
    { id: 'friday', label: 'الجمعة' },
];

function PoliciesContent() {
  const { games } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<PoliciesFormValues>({
    resolver: zodResolver(policiesSchema),
    defaultValues: {
      appName: 'FunTrack',
      maxCapacity: 50,
      entryFee: 0,
      roundingPolicy: 'none',
      enableWeekendPricing: false,
      pricingPolicies: [],
      weekendDays: {
        saturday: true, // Default weekend
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: true, // Default weekend
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricingPolicies',
  });

  useEffect(() => {
    const policiesRef = ref(db, 'policies');
    const unsubscribe = onValue(policiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        form.reset({
            appName: data.appName || 'FunTrack',
            maxCapacity: data.maxCapacity || 50,
            entryFee: data.entryFee || 0,
            roundingPolicy: data.roundingPolicy || 'none',
            enableWeekendPricing: data.enableWeekendPricing || false,
            pricingPolicies: data.pricingPolicies || [],
            weekendDays: data.weekendDays || {
                saturday: true,
                sunday: false,
                monday: false,
                tuesday: false,
                wednesday: false,
                thursday: false,
                friday: true,
            },
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [form]);


  async function onSubmit(values: PoliciesFormValues) {
    try {
      const policiesRef = ref(db, 'policies');
      await update(policiesRef, values);
      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم تحديث سياسات النظام بنجاح.',
      });
    } catch (error) {
      console.error('Failed to save policies:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ السياسات. يرجى المحاولة مرة أخرى.',
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
                  <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
               <Card>
                  <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                  <CardContent><Skeleton className="h-40 w-full" /></CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">إدارة السياسات</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>السياسات العامة</CardTitle>
              <CardDescription>
                حدد السياسات العامة لمنطقة اللعب مثل السعة الاستيعابية ورسوم الدخول.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم التطبيق</FormLabel>
                    <FormControl>
                      <Input placeholder="FunTrack" {...field} />
                    </FormControl>
                     <FormDescription>
                        هذا الاسم سيظهر في الشريط الجانبي والإيصالات.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأقصى للأطفال</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="entryFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رسوم دخول ثابتة (ج.م)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                     <FormDescription>
                        مبلغ يضاف تلقائياً لكل فاتورة. أدخل 0 لإلغائه.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سياسات التسعير</CardTitle>
              <CardDescription>
                قم بتفعيل وتخصيص أسعار مختلفة للألعاب خلال أيام الأسبوع وعطلات نهاية الأسبوع.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="roundingPolicy"
                    render={({ field }) => (
                    <FormItem className="max-w-sm">
                        <FormLabel>سياسة تقريب الوقت</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="اختر سياسة..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">بدون تقريب (حساب دقيق)</SelectItem>
                                <SelectItem value="quarter-hour">تقريب لأقرب ربع ساعة</SelectItem>
                                <SelectItem value="half-hour">تقريب لأقرب نصف ساعة</SelectItem>
                                <SelectItem value="hour">تقريب لأقرب ساعة</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                           كيفية حساب الوقت الإضافي بعد الساعة الأولى.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div className="space-y-4">
                  <h3 className="text-md font-medium">تحديد أيام نهاية الأسبوع</h3>
                  <div className="flex flex-wrap gap-4">
                    {daysOfWeek.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name={`weekendDays.${day.id}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rtl:space-x-reverse">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {day.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                control={form.control}
                name="enableWeekendPricing"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        تفعيل تسعيرة نهاية الأسبوع
                      </FormLabel>
                      <CardDescription>
                        هل تريد تطبيق أسعار مختلفة في الأيام التي حددتها كعطلة نهاية أسبوع؟
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('enableWeekendPricing') && (
                <div className="space-y-4">
                    <h3 className="text-md font-medium">قواعد التسعير المخصصة للألعاب</h3>
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`pricingPolicies.${index}.gameId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>اللعبة</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر لعبة..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {games.map((game) => (
                                  <SelectItem key={game.id} value={game.id}>
                                    {game.name}
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
                        name={`pricingPolicies.${index}.weekdayRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر الساعة (أيام الأسبوع)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pricingPolicies.${index}.weekendRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر الساعة (نهاية الأسبوع)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="120" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                   <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ gameId: '', weekdayRate: 0, weekendRate: 0 })}
                  >
                    <PlusCircle className="me-2 h-4 w-4" />
                    إضافة قاعدة تسعير جديدة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full md:w-auto" disabled={loading}>
            حفظ التغييرات
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <PoliciesContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

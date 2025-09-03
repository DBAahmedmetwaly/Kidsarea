

'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { ref, update, onValue, set, get } from 'firebase/database';
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
import { Settings, Trash, PlusCircle, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import type { DayOfWeek, Policies } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

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
  showPosStats: z.boolean(),
  showCompletedSessions: z.boolean(),
  posLabels: z.object({
      screenTitle: z.string().optional(),
      activeSessionsTitle: z.string().optional(),
      childColumnTitle: z.string().optional(),
      parentColumnTitle: z.string().optional(),
  }).optional(),
  enablePackageOvertime: z.boolean(),
  packageOvertimeRatePerMinute: z.coerce.number().min(0, 'السعر يجب أن يكون رقمًا موجبًا'),
  packageOvertimeRounding: z.enum(['none', 'quarter-hour', 'half-hour', 'hour']),
  packageOvertimeNotificationInterval: z.coerce.number().int().min(1, 'المدة يجب أن تكون ثانية واحدة على الأقل'),
  entryFeeApplication: z.enum(['all', 'hourly', 'package', 'none']),
  packagePricingModel: z.enum(['per_session', 'per_child']),
  toastDuration: z.coerce.number().int().min(1, 'المدة يجب أن تكون ثانية واحدة على الأقل'),
  buyOneHourGetXFreeMinutes: z.coerce.number().optional(),
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

const defaultPolicies: PoliciesFormValues = {
      appName: 'FunTrack',
      maxCapacity: 50,
      entryFee: 0,
      roundingPolicy: 'none',
      enableWeekendPricing: false,
      pricingPolicies: [],
      weekendDays: {
        saturday: true,
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: true,
      },
      showPosStats: true,
      showCompletedSessions: true,
      posLabels: {
          screenTitle: 'يلا نلعب',
          activeSessionsTitle: 'الأطفال النشطون حاليًا',
          childColumnTitle: 'الطفل',
          parentColumnTitle: 'ولي الأمر',
      },
      enablePackageOvertime: false,
      packageOvertimeRatePerMinute: 1,
      packageOvertimeRounding: 'quarter-hour',
      packageOvertimeNotificationInterval: 60,
      entryFeeApplication: 'hourly',
      packagePricingModel: 'per_session',
      toastDuration: 5,
      buyOneHourGetXFreeMinutes: 0,
}

function PoliciesContent() {
  const { games, branches, policies, loading: firebaseLoading } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState('default');
  const [isForceApplyDialogOpen, setForceApplyDialogOpen] = useState(false);
  
  const form = useForm<PoliciesFormValues>({
    resolver: zodResolver(policiesSchema),
    defaultValues: defaultPolicies,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pricingPolicies',
  });

  useEffect(() => {
    setLoading(true);
    if (!firebaseLoading && policies) {
        const branchPolicies = policies.find(p => p.id === selectedBranchId);
        const defaultPoliciesData = policies.find(p => p.id === 'default');
        
        const basePolicies = defaultPoliciesData ? { ...defaultPolicies, ...defaultPoliciesData } : defaultPolicies;

        const currentPolicies = branchPolicies ? { ...basePolicies, ...branchPolicies } : basePolicies;
        form.reset(currentPolicies);
        setLoading(false);
    }
  }, [selectedBranchId, policies, form, firebaseLoading]);


  async function onSubmit(values: PoliciesFormValues) {
    try {
      const policiesRef = ref(db, `policies/${selectedBranchId}`);
      await set(policiesRef, values);
      toast({
        title: 'تم الحفظ بنجاح',
        description: `تم تحديث سياسات ${selectedBranchId === 'default' ? 'الافتراضية' : `فرع ${branches.find(b=>b.id === selectedBranchId)?.name}`}.`,
      });
      // No need to manually reset form, the useEffect will handle it when `policies` from context updates.
    } catch (error) {
      console.error('Failed to save policies:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ السياسات. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  }

  const handleForceApply = async () => {
    setForceApplyDialogOpen(false);
    try {
        const currentPoliciesOnScreen = form.getValues();
        
        const updates: { [key: string]: any } = {};
        branches.forEach(branch => {
            updates[`/policies/${branch.id}`] = currentPoliciesOnScreen;
        });

        await update(ref(db), updates);

        toast({
            title: 'تم التطبيق بنجاح',
            description: 'تم فرض السياسات الحالية على جميع الفروع.',
        });

    } catch (error) {
        toast({ title: 'فشل تطبيق السياسات', variant: 'destructive'});
        console.error(error);
    }
  };

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

      <Card>
          <CardHeader>
            <CardTitle>اختر مجموعة السياسات</CardTitle>
            <CardDescription>يمكنك تحديد سياسات افتراضية للجميع، أو تخصيص سياسات لكل فرع على حدة.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="w-full sm:w-1/3">
                        <SelectValue placeholder="اختر مجموعة سياسات..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">السياسات الافتراضية (للجميع)</SelectItem>
                        {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                                سياسات فرع: {branch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {selectedBranchId === 'default' && (
                    <Button variant="outline" onClick={() => setForceApplyDialogOpen(true)}>
                        <AlertTriangle className="me-2 h-4 w-4 text-orange-500" />
                        فرض على جميع الفروع
                    </Button>
                 )}
            </div>
          </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>السياسات العامة</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم التطبيق</FormLabel>
                    <FormControl>
                      <Input placeholder="FunTrack" {...field} value={field.value || ''} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="entryFeeApplication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تطبيق رسوم الدخول على</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="hourly">الألعاب بالساعة فقط</SelectItem>
                            <SelectItem value="package">ألعاب الباقات فقط</SelectItem>
                            <SelectItem value="all">كل الألعاب</SelectItem>
                            <SelectItem value="none">عدم التطبيق</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="toastDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مدة ظهور الإشعار (بالثواني)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إعدادات عرض شاشة يلا نلعب</CardTitle>
              <CardDescription>
                تحكم في الوحدات التي تظهر في شاشة نقاط البيع والعناوين الخاصة بها.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="showPosStats"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            إظهار بطاقات الإحصائيات
                        </FormLabel>
                        <FormDescription>
                           عرض بطاقات (الأطفال النشطون، زوار اليوم، جلسات اليوم) في أعلى الشاشة.
                        </FormDescription>
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
                 <FormField
                    control={form.control}
                    name="showCompletedSessions"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            إظهار قائمة الجلسات المنتهية
                        </FormLabel>
                        <FormDescription>
                           عرض جدول أحدث الجلسات التي انتهت خلال ورديتك الحالية.
                        </FormDescription>
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
                 <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-md font-medium">تخصيص العناوين</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <FormField
                            control={form.control}
                            name="posLabels.screenTitle"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>عنوان شاشة يلا نلعب (في الشريط الجانبي)</FormLabel>
                                <FormControl><Input placeholder="يلا نلعب" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="posLabels.activeSessionsTitle"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>عنوان قسم النشطون حاليًا</FormLabel>
                                <FormControl><Input placeholder="الأطفال النشطون حاليًا" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="posLabels.childColumnTitle"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>عنوان عمود الطفل</FormLabel>
                                <FormControl><Input placeholder="الطفل" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="posLabels.parentColumnTitle"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>عنوان عمود ولي الأمر</FormLabel>
                                <FormControl><Input placeholder="ولي الأمر" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
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
                        <FormLabel>سياسة تقريب الوقت (للألعاب بالساعة)</FormLabel>
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

                <Separator />
                
                <h3 className="text-lg font-medium">سياسات الباقات</h3>
                <FormField
                    control={form.control}
                    name="packagePricingModel"
                    render={({ field }) => (
                    <FormItem className="max-w-sm">
                        <FormLabel>نموذج تسعير الباقة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="اختر نموذج..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="per_session">سعر الباقة ثابت للجلسة (لكل الأطفال)</SelectItem>
                                <SelectItem value="per_child">سعر الباقة لكل طفل</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            كيفية حساب سعر الباقة عند اختيار أكثر من طفل.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                control={form.control}
                name="enablePackageOvertime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        تفعيل احتساب الوقت الإضافي للباقات
                      </FormLabel>
                      <CardDescription>
                        هل تريد احتساب تكلفة إضافية للوقت الذي يقضيه الطفل بعد انتهاء وقت الباقة؟
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

              {form.watch('enablePackageOvertime') && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4 border-s-2">
                     <FormField
                        control={form.control}
                        name="packageOvertimeRatePerMinute"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>سعر الدقيقة الإضافية (ج.م)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="packageOvertimeRounding"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>تقريب الوقت الإضافي للباقات</FormLabel>
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
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="packageOvertimeNotificationInterval"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>تكرار إشعار انتهاء الوقت (بالثواني)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="60" {...field} />
                            </FormControl>
                            <FormDescription>
                                الفاصل الزمني لتكرار الإشعار.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              )}
                
                <Separator />
                
                <h3 className="text-lg font-medium">سياسات الألعاب بالساعة</h3>
                <FormField
                    control={form.control}
                    name="buyOneHourGetXFreeMinutes"
                    render={({ field }) => (
                        <FormItem className="max-w-sm">
                            <FormLabel>عرض (ساعة + وقت مجاني)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 0)}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر العرض..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="0">بدون عرض</SelectItem>
                                    <SelectItem value="15">ساعة + 15 دقيقة مجانًا</SelectItem>
                                    <SelectItem value="30">ساعة + 30 دقيقة مجانًا</SelectItem>
                                    <SelectItem value="60">ساعة + 60 دقيقة مجانًا</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                سيتم محاسبة الجلسة كساعة واحدة فقط إذا انتهت خلال مدة العرض.
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
                        تفعيل تسعيرة نهاية الأسبوع (للألعاب بالساعة)
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
      <AlertDialog open={isForceApplyDialogOpen} onOpenChange={setForceApplyDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
            <AlertDialogDescription>
                سيؤدي هذا الإجراء إلى استبدال سياسات جميع الفروع بالإعدادات المعروضة حاليًا على الشاشة. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceApply}>
                نعم، قم بالفرض على الجميع
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

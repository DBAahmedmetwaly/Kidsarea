
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

import { MoreHorizontal, PlusCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { SubscriptionPlan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';

const planSchema = z.object({
  name: z.string().min(3, 'اسم الباقة مطلوب'),
  price: z.coerce.number().min(1, 'السعر يجب أن يكون أكبر من صفر'),
  duration: z.coerce.number().int().min(1, 'المدة (بالأيام) مطلوبة'),
});

type PlanFormValues = z.infer<typeof planSchema>;

function PlanFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (plan: PlanFormValues | (PlanFormValues & { id: string })) => void;
  initialData?: SubscriptionPlan | null;
  isEditMode: boolean;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      reset(initialData);
    } else {
      reset({ name: '', price: 0, duration: 30 });
    }
  }, [initialData, isEditMode, open, reset]);

  const handleFormSubmit = (data: PlanFormValues) => {
    onSubmit(isEditMode && initialData ? { ...data, id: initialData.id } : data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل باقة اشتراك' : 'إضافة باقة اشتراك جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">اسم الباقة</Label>
            <Input id="name" {...register('name')} placeholder="مثال: الباقة الذهبية" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="price">السعر (ج.م)</Label>
            <Input id="price" type="number" {...register('price')} placeholder="300" />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <Label htmlFor="duration">المدة (بالأيام)</Label>
            <Input id="duration" type="number" {...register('duration')} placeholder="30" />
            {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">إلغاء</Button>
            </DialogClose>
            <Button type="submit">{isEditMode ? 'حفظ التغييرات' : 'إضافة الباقة'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionPlansContent() {
  const { subscriptionPlans } = useFirebase();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const handleFormSubmit = async (planData: PlanFormValues | (PlanFormValues & { id: string })) => {
    try {
      if ('id' in planData) {
        // Edit mode
        const planRef = ref(db, `subscriptionPlans/${planData.id}`);
        const { id, ...dataToUpdate } = planData;
        await update(planRef, dataToUpdate);
        toast({ title: 'تم التعديل بنجاح', description: `تم تحديث باقة "${planData.name}".` });
      } else {
        // Add mode
        const plansRef = ref(db, 'subscriptionPlans');
        const newPlanRef = push(plansRef);
        await set(newPlanRef, planData);
        toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة باقة "${planData.name}".` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await remove(ref(db, `subscriptionPlans/${planId}`));
      toast({ title: 'تم الحذف بنجاح' });
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشل حذف الباقة.', variant: 'destructive' });
    }
  };

  const openForm = (plan?: SubscriptionPlan) => {
    if (plan) {
      setIsEditMode(true);
      setSelectedPlan(plan);
    } else {
      setIsEditMode(false);
      setSelectedPlan(null);
    }
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <div className="md:hidden"><SidebarTrigger /></div>
         <Package className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">إدارة باقات الاشتراكات</h1>
        <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة باقة</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>باقات الاشتراكات</CardTitle>
          <CardDescription>
            قم بإدارة باقات الاشتراكات المتاحة للعملاء.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الباقة</TableHead>
                <TableHead className="text-center">السعر</TableHead>
                <TableHead className="text-center">المدة (بالأيام)</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptionPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-center">{`ج.م ${plan.price.toFixed(2)}`}</TableCell>
                  <TableCell className="text-center">{plan.duration} يوم</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openForm(plan)}>تعديل</DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                              حذف
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف الباقة بشكل دائم.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>متابعة</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PlanFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedPlan}
      />
    </div>
  );
}

export default function SubscriptionPlansPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <SubscriptionPlansContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

    
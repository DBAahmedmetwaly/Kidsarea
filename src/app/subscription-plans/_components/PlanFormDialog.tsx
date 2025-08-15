
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SubscriptionPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';

const planSchema = z.object({
  name: z.string().min(3, 'اسم الباقة مطلوب'),
  duration: z.coerce.number().int().min(1, 'المدة (بالدقائق) مطلوبة'),
  description: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

export default function PlanFormDialog({
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
      reset({ name: '', duration: 30, description: '' });
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
          <DialogTitle>{isEditMode ? 'تعديل باقة' : 'إضافة باقة جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">اسم الباقة</Label>
            <Input id="name" {...register('name')} placeholder="مثال: باقة نصف ساعة" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="duration">المدة (بالدقائق)</Label>
            <Input id="duration" type="number" {...register('duration')} placeholder="30" />
            {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">وصف الباقة (اختياري)</Label>
            <Textarea id="description" {...register('description')} placeholder="وصف موجز لمميزات الباقة..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
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


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
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { ProductCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';

const categorySchema = z.object({
  name: z.string().min(2, 'اسم الفئة مطلوب'),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CategoryFormValues | (CategoryFormValues & { id: string })) => void;
  initialData?: ProductCategory | null;
  isEditMode: boolean;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    }
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && initialData) {
        form.reset(initialData);
      } else {
        form.reset({ name: '' });
      }
    }
  }, [initialData, isEditMode, open, form]);

  const handleFormSubmit = (data: CategoryFormValues) => {
    onSubmit(isEditMode && initialData ? { ...data, id: initialData.id } : data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
          <DialogDescription>أدخل اسم الفئة.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>اسم الفئة</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: مشروبات" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
                <DialogClose asChild>
                <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
                <Button type="submit">{isEditMode ? 'حفظ التغييرات' : 'إضافة الفئة'}</Button>
            </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

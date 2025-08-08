
'use client';

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
import type { GameCategory } from '@/lib/types';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

const categorySchema = z.object({
  name: z.string().min(2, 'اسم التصنيف مطلوب'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'يجب أن يكون لونًا صالحًا (hex format)'),
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
  initialData?: GameCategory | null;
  isEditMode: boolean;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      color: '#4ab7e2'
    }
  });
  
  const watchedColor = form.watch('color');

  useEffect(() => {
    if (open) {
      if (isEditMode && initialData) {
        form.reset(initialData);
      } else {
        form.reset({ name: '', color: '#4ab7e2' });
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
          <DialogTitle>{isEditMode ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</DialogTitle>
          <DialogDescription>أدخل اسم التصنيف واختر لونًا مميزًا له.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>اسم التصنيف</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: ألعاب حركية" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>لون التصنيف</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input 
                                        type="color" 
                                        className="w-16 h-10 p-1" 
                                        {...field}
                                    />
                                </FormControl>
                                <div className="w-8 h-8 rounded-md border flex-1" style={{ backgroundColor: watchedColor }} />
                            </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
                <DialogClose asChild>
                <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
                <Button type="submit">{isEditMode ? 'حفظ التغييرات' : 'إضافة التصنيف'}</Button>
            </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
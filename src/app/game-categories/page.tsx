
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

import { MoreHorizontal, PlusCircle, Layers } from 'lucide-react';
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
  DialogFooter,
  DialogClose,
  DialogDescription,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { GameCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { useEffect } from 'react';


const categorySchema = z.object({
  name: z.string().min(2, 'اسم التصنيف مطلوب'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'يجب أن يكون لونًا صالحًا (hex format)'),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoryFormDialog({
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
                                <Input 
                                    {...field}
                                    placeholder="#4ab7e2" 
                                    className="flex-1" 
                                />
                                <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: watchedColor }} />
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

function GameCategoriesContent() {
  const { gameCategories } = useFirebase();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(null);

  const handleFormSubmit = async (data: CategoryFormValues | (CategoryFormValues & { id: string })) => {
    try {
      if ('id' in data) {
        // Edit mode
        const categoryRef = ref(db, `gameCategories/${data.id}`);
        const { id, ...dataToUpdate } = data;
        await update(categoryRef, dataToUpdate);
        toast({ title: 'تم التعديل بنجاح', description: `تم تحديث التصنيف "${data.name}".` });
      } else {
        // Add mode
        const categoriesRef = ref(db, 'gameCategories');
        const newCategoryRef = push(categoriesRef);
        await set(newCategoryRef, data);
        toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة التصنيف "${data.name}".` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `gameCategories/${id}`));
      toast({ title: 'تم الحذف بنجاح' });
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشل حذف التصنيف.', variant: 'destructive' });
    }
  };

  const openForm = (category?: GameCategory) => {
    if (category) {
      setIsEditMode(true);
      setSelectedCategory(category);
    } else {
      setIsEditMode(false);
      setSelectedCategory(null);
    }
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <div className="md:hidden"><SidebarTrigger /></div>
         <Layers className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">إدارة تصنيفات الألعاب</h1>
        <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة تصنيف</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>تصنيفات الألعاب</CardTitle>
          <CardDescription>
            قم بإنشاء وتعديل التصنيفات لتنظيم الألعاب في شاشة نقاط البيع.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم التصنيف</TableHead>
                <TableHead className="text-center">اللون</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-right">{category.name}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: category.color }}></div>
                        <span className="font-mono text-xs">{category.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openForm(category)}>تعديل</DropdownMenuItem>
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
                                هذا الإجراء سيؤدي إلى حذف التصنيف بشكل دائم.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(category.id)}>متابعة</AlertDialogAction>
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
      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedCategory}
      />
    </div>
  );
}

export default function GameCategoriesPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <GameCategoriesContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

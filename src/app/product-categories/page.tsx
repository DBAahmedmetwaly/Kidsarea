
'use client';

import { useState } from 'react';
import { ref, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';

import { MoreHorizontal, PlusCircle, ShoppingBag } from 'lucide-react';
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
import type { ProductCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';

const CategoryFormDialog = dynamic(() => import('./_components/CategoryFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

const categoryFormSchema = z.object({
  name: z.string().min(2, 'اسم الفئة مطلوب'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function ProductCategoriesContent() {
  const { productCategories } = useFirebase();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  const handleFormSubmit = async (data: CategoryFormValues | (CategoryFormValues & { id: string })) => {
    try {
      if ('id' in data) {
        // Edit mode
        const categoryRef = ref(db, `productCategories/${data.id}`);
        const { id, ...dataToUpdate } = data;
        await update(categoryRef, dataToUpdate);
        toast({ title: 'تم التعديل بنجاح', description: `تم تحديث الفئة "${data.name}".` });
      } else {
        // Add mode
        const categoriesRef = ref(db, 'productCategories');
        const newCategoryRef = push(categoriesRef);
        await set(newCategoryRef, data);
        toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة الفئة "${data.name}".` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(db, `productCategories/${id}`));
      toast({ title: 'تم الحذف بنجاح' });
    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ', description: 'فشل حذف الفئة.', variant: 'destructive' });
    }
  };

  const openForm = (category?: ProductCategory) => {
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
         <ShoppingBag className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">إدارة فئات المنتجات</h1>
        <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة فئة</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>فئات المنتجات</CardTitle>
          <CardDescription>
            قم بإنشاء وتعديل الفئات لتنظيم المنتجات في الكتالوج والمخزون.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الفئة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-right">{category.name}</TableCell>
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
                                هذا الإجراء سيؤدي إلى حذف الفئة بشكل دائم.
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
      {isFormOpen && <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedCategory}
      />}
    </div>
  );
}

export default function ProductCategoriesPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <ProductCategoriesContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

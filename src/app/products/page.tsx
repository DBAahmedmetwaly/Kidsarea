
'use client';

import { useState } from 'react';
import { MoreHorizontal, PlusCircle, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
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

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
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
import { Skeleton } from '@/components/ui/skeleton';

const ProductFormDialog = dynamic(() => import('./_components/ProductFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

function ProductsContent() {
    const { products, inventory } = useFirebase();
    const { toast } = useToast();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const handleFormSubmit = async (productData: Omit<Product, 'id'> | Product) => {
        try {
            if ('id' in productData) { // Edit mode
                const { id, ...dataToUpdate } = productData;
                
                const updates: { [key: string]: any } = {};

                // 1. Update the main product entry
                updates[`/products/${id}`] = dataToUpdate;

                // 2. Find and update corresponding inventory items
                const inventoryItemsToUpdate = inventory.filter(item => item.productId === id);
                inventoryItemsToUpdate.forEach(item => {
                    updates[`/inventory/${item.id}/productName`] = dataToUpdate.name;
                    updates[`/inventory/${item.id}/categoryId`] = dataToUpdate.categoryId;
                    updates[`/inventory/${item.id}/categoryName`] = dataToUpdate.categoryName;
                });
                
                await update(ref(db), updates);

                toast({ title: 'تم التعديل بنجاح', description: `تم تحديث المنتج "${productData.name}" في الكتالوج والمخزون.` });

            } else { // Add mode
                const productsRef = ref(db, 'products');
                const newProductRef = push(productsRef);
                await set(newProductRef, productData);
                toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة المنتج "${productData.name}".` });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' });
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        try {
            await remove(ref(db, `products/${productId}`));
            toast({ title: 'تم الحذف بنجاح' });
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل حذف المنتج.', variant: 'destructive' });
        }
    };

    const openForm = (product?: Product) => {
        if (product) {
            setIsEditMode(true);
            setSelectedProduct(product);
        } else {
            setIsEditMode(false);
            setSelectedProduct(null);
        }
        setFormOpen(true);
    };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden"><SidebarTrigger /></div>
         <ShoppingCart className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">كتالوج المنتجات العام</h1>
        <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة منتج للكتالوج</span>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة المنتجات العامة</CardTitle>
          <CardDescription>هنا يمكنك تعريف جميع المنتجات التي يمكن بيعها في فروعك. لإدارة المخزون والأسعار، انتقل إلى صفحة المخزون.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم المنتج</TableHead>
                <TableHead className="text-right">الفئة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-right">{product.name}</TableCell>
                  <TableCell className="text-right">{product.categoryName}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openForm(product)}>تعديل</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">حذف</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>هذا الإجراء سيؤدي إلى حذف المنتج بشكل دائم من الكتالوج العام.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>متابعة</AlertDialogAction>
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
      {isFormOpen && <ProductFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedProduct}
      />}
    </div>
  );
}

export default function ProductsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <ProductsContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

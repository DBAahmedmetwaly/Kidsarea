

'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle, Archive } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { InventoryItem, InventoryMovement } from '@/lib/types';
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
import { useAuth } from '@/components/AuthProvider';
import { Input } from '@/components/ui/input';

const InventoryFormDialog = dynamic(() => import('./_components/InventoryFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});


function InventoryContent() {
    const { inventory, branches, employees } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const currentUser = useMemo(() => employees.find(e => e.username === user?.username), [employees, user]);
    
    const [selectedBranch, setSelectedBranch] = useState(
        (currentUser && currentUser.branch !== 'كل الفروع') ? currentUser.branch : (branches.length > 0 ? branches[0].name : '')
    );
     const canChangeBranch = !currentUser || currentUser.branch === 'كل الفروع' || user?.username === 'admin';

     const handleFormSubmit = async (itemData: Omit<InventoryItem, 'id'> | InventoryItem, movement?: Omit<InventoryMovement, 'id'>) => {
        try {
            if ('id' in itemData) { // Edit mode
                const itemRef = ref(db, `inventory/${itemData.id}`);
                const { id, ...dataToUpdate } = itemData;
                await update(itemRef, dataToUpdate);
                toast({ title: 'تم التعديل بنجاح', description: `تم تحديث المنتج "${itemData.productName}".` });
            } else { // Add mode
                const inventoryRef = ref(db, 'inventory');
                const newItemRef = push(inventoryRef);
                await set(newItemRef, itemData);
                toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة المنتج "${itemData.productName}" للمخزون.` });
            }

            if (movement) {
                const movementRef = push(ref(db, 'inventoryMovements'));
                await set(movementRef, movement);
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'خطأ', description: 'فشلت العملية.', variant: 'destructive' });
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await remove(ref(db, `inventory/${itemId}`));
            toast({ title: 'تم الحذف بنجاح' });
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل حذف المنتج من المخزون.', variant: 'destructive' });
        }
    };

    const openForm = (item?: InventoryItem) => {
        if (item) {
            setIsEditMode(true);
            setSelectedItem(item);
        } else {
            setIsEditMode(false);
            setSelectedItem(null);
        }
        setFormOpen(true);
    };
    
    const branchInventory = useMemo(() => {
        const selectedBranchDetails = branches.find(b => b.name === selectedBranch);
        if (!selectedBranchDetails) return [];
        
        let filteredInventory = inventory.filter(item => item.branchId === selectedBranchDetails.id);

        if (searchQuery) {
            filteredInventory = filteredInventory.filter(item => 
                item.productName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return filteredInventory;

    }, [inventory, selectedBranch, branches, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden"><SidebarTrigger /></div>
         <Archive className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl me-auto">إدارة المخزون</h1>
        <div className='flex items-center gap-2'>
            <Select 
                value={selectedBranch} 
                onValueChange={setSelectedBranch} 
                disabled={!canChangeBranch}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر فرع..." />
                </SelectTrigger>
                <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button size="sm" className="h-10 gap-1" onClick={() => openForm()} disabled={!selectedBranch}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span>إضافة للمخزون</span>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>مخزون فرع: {selectedBranch || 'N/A'}</CardTitle>
              <CardDescription>عرض وإدارة المنتجات المتوفرة، أسعارها، وكمياتها في الفرع المحدد.</CardDescription>
            </div>
            <div className="w-1/3">
                <Input 
                    placeholder='ابحث بالاسم...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم المنتج</TableHead>
                <TableHead className="text-right">الفئة</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead className="text-center">السعر</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-right">{item.productName}</TableCell>
                  <TableCell className="text-right">{item.categoryName}</TableCell>
                   <TableCell className="text-center">
                        <Badge variant={item.quantity > 5 ? 'default' : 'destructive'} className={item.quantity > 10 ? 'bg-green-500' : item.quantity > 5 ? 'bg-yellow-500' : ''}>
                          {item.quantity}
                        </Badge>
                   </TableCell>
                  <TableCell className="text-center font-semibold">{`ج.م ${item.price.toFixed(2)}`}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openForm(item)}>تعديل</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">حذف</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>سيؤدي هذا إلى حذف المنتج من مخزون هذا الفرع بشكل دائم.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>متابعة</AlertDialogAction>
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
           {branchInventory.length === 0 && !selectedBranch && (
                <div className="text-center py-10 text-muted-foreground">الرجاء اختيار فرع لعرض مخزونه.</div>
           )}
            {branchInventory.length === 0 && selectedBranch && (
                <div className="text-center py-10 text-muted-foreground">لا توجد منتجات في مخزون هذا الفرع بعد.</div>
           )}
        </CardContent>
      </Card>
      {isFormOpen && <InventoryFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedItem}
        branchName={selectedBranch}
      />}
    </div>
  );
}

export default function InventoryPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <InventoryContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

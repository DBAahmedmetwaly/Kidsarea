
'use client';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ref, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppSidebar from '@/components/layout/AppSidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { useFirebase } from '@/context/FirebaseContext';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Employee } from '@/lib/types';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const BranchFormDialog = dynamic(() => import('./_components/BranchFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

const PasswordDialog = dynamic(() => import('./_components/PasswordDialog'), {
    loading: () => <Skeleton className="w-full h-64" />,
});


function BranchesContent() {
  const { branches, employees } = useFirebase();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showAddButton, setShowAddButton] = useState(false);
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();

  const handleAddBranch = async (newBranchData: Omit<Branch, 'id' | 'employees'>) => {
      try {
          const newBranchId = push(ref(db, 'branches')).key;
          if (!newBranchId) throw new Error("Could not generate a new ID for the branch.");
          
          const newBranch = {
              ...newBranchData,
              employees: 0, // Initial employee count
              nextReceiptNumber: 0, // Initialize receipt counter
          }
          await set(ref(db, `branches/${newBranchId}`), newBranch);
           toast({
              title: "تمت الإضافة بنجاح",
              description: `تمت إضافة فرع "${newBranch.name}" إلى القائمة.`,
          });
      } catch (e) {
          console.error(e);
          toast({
              title: "خطأ",
              description: "لم يتم إضافة الفرع",
              variant: 'destructive'
          })
      }
  };
  
    const handleUpdateBranch = async (branchData: Branch) => {
        try {
            const branchRef = ref(db, `branches/${branchData.id}`);
            const { id, ...dataToUpdate } = branchData;
            await update(branchRef, dataToUpdate);
            toast({ title: 'تم التعديل بنجاح', description: `تم تحديث فرع "${branchData.name}".` });
        } catch(e) {
             console.error(e);
            toast({ title: 'خطأ في التعديل', variant: 'destructive' });
        }
    };

    const handleDeleteBranch = async (branchId: string) => {
        try {
            await remove(ref(db, `branches/${branchId}`));
            toast({ title: 'تم الحذف بنجاح' });
        } catch(e) {
             console.error(e);
            toast({ title: 'خطأ', description: 'لم يتم حذف الفرع.', variant: 'destructive' });
        }
    }

    const handleFormSubmit = (data: Omit<Branch, 'id' | 'employees'> | Branch) => {
        if ('id' in data) {
            handleUpdateBranch(data as Branch);
        } else {
            handleAddBranch(data as Omit<Branch, 'id' | 'employees'>);
        }
    }
  
    const openEditDialog = (branch: Branch) => {
        setSelectedBranch(branch);
        setEditDialogOpen(true);
    }

  const getEmployeeCountForBranch = (branchName: string) => {
    return employees.filter(emp => emp.branch === branchName).length;
  }
  
  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);
    if (newCount >= 5) {
        setPasswordDialogOpen(true);
        setTitleClickCount(0); // Reset after trying
    }
  }

  const handlePasswordConfirm = (password: string) => {
     if (password === 'sansan') {
        setShowAddButton(true);
        toast({
            title: "تمكين الإضافة",
            description: "تم تفعيل زر إضافة فرع جديد.",
        });
    } else {
         toast({
            title: "كلمة مرور خاطئة",
            variant: 'destructive'
        });
    }
  }


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الفروع</h1>
        {showAddButton && (
            <div className="ms-auto">
                <Button 
                    onClick={() => {
                        setSelectedBranch(null);
                        setAddDialogOpen(true);
                    }}
                    size="sm"
                >
                    <PlusCircle className="me-2 h-4 w-4" />
                    إضافة فرع
                </Button>
            </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle onClick={handleTitleClick} className="cursor-pointer">الفروع</CardTitle>
          <CardDescription>
            إدارة فروع منطقة اللعب الخاصة بك وتتبع أدائها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الفرع</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  عدد الموظفين
                </TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  المدير المسؤول
                </TableHead>
                <TableHead className="text-center">
                  <span>الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium text-right">{branch.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={branch.status === 'Active' ? 'default' : 'secondary'} className={branch.status === 'Active' ? 'bg-green-500 text-white' : ''}>
                      {branch.status === 'Active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {getEmployeeCountForBranch(branch.name)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {branch.manager}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">تبديل القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(branch)}>تعديل</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {isAddDialogOpen && <BranchFormDialog 
        open={isAddDialogOpen} 
        onOpenChange={setAddDialogOpen} 
        onSubmit={handleFormSubmit}
        isEditMode={false} 
      />}
       {isEditDialogOpen && <BranchFormDialog 
        open={isEditDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        onSubmit={handleFormSubmit}
        initialData={selectedBranch}
        isEditMode={true}
       />}
       {isPasswordDialogOpen && <PasswordDialog open={isPasswordDialogOpen} onOpenChange={setPasswordDialogOpen} onConfirm={handlePasswordConfirm} />}
    </div>
  );
}

export default function BranchesPage() {
    return (
        <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <BranchesContent />
        </main>
        </div>
    );
}

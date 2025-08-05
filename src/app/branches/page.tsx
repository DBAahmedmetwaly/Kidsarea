
'use client';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppSidebar from '@/components/layout/AppSidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { useFirebase } from '@/context/FirebaseContext';
import { useToast } from '@/hooks/use-toast';
import type { Branch, Employee } from '@/lib/types';


function AddBranchDialog({
    open,
    onOpenChange,
    onAddBranch
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddBranch: (branch: Omit<Branch, 'id' | 'employees'>) => void;
}) {
    const { toast } = useToast();
    const { employees } = useFirebase();
    const [name, setName] = useState('');
    const [manager, setManager] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    
    const branchManagers = employees.filter(emp => emp.role === 'مدير فرع');

    const handleAddClick = () => {
        if (!name || !manager) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول.",
                variant: "destructive",
            });
            return;
        }

        const newBranch: Omit<Branch, 'id' | 'employees'> = {
            name,
            manager,
            status,
        };
        onAddBranch(newBranch);
        
        // Reset fields
        setName('');
        setManager('');
        setStatus('Active');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة فرع جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الفرع الجديد. انقر على "إضافة" عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            اسم الفرع
                        </Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: فرع الرياض" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manager" className="text-right">
                            المدير المسؤول
                        </Label>
                        <Select value={manager} onValueChange={setManager}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر مديرًا" />
                            </SelectTrigger>
                            <SelectContent>
                                {branchManagers.map(m => (
                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            الحالة
                        </Label>
                         <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">نشط</SelectItem>
                                <SelectItem value="Inactive">غير نشط</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            إلغاء
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddClick}>إضافة الفرع</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function BranchesContent() {
  const { branches, employees } = useFirebase();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();


  const handleAddBranch = async (newBranchData: Omit<Branch, 'id' | 'employees'>) => {
      try {
          const branchesRef = ref(db, 'branches');
          const newBranchRef = push(branchesRef);
          const newBranch = {
              ...newBranchData,
              employees: 0 // Initial employee count
          }
          await set(newBranchRef, newBranch);
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

  const getEmployeeCountForBranch = (branchName: string) => {
    return employees.filter(emp => emp.branch === branchName).length;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الفروع</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              إضافة فرع
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الفروع</CardTitle>
          <CardDescription>
            إدارة فروع منطقة اللعب الخاصة بك وتتبع أدائها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الفرع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="hidden md:table-cell">
                  عدد الموظفين
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  المدير المسؤول
                </TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'Active' ? 'default' : 'secondary'} className={branch.status === 'Active' ? 'bg-green-500 text-white' : ''}>
                      {branch.status === 'Active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getEmployeeCountForBranch(branch.name)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {branch.manager}
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddBranchDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddBranch={handleAddBranch} />
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

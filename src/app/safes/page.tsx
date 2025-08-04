
'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, Landmark } from 'lucide-react';
import { ref, push, set, onValue, remove } from 'firebase/database';
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
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { Safe } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';

function AddSafeDialog({ open, onOpenChange, onAddSafe }: { open: boolean; onOpenChange: (open: boolean) => void; onAddSafe: (safe: Omit<Safe, 'id'>) => void; }) {
    const { toast } = useToast();
    const { branches } = useFirebase();
    const [name, setName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [balance, setBalance] = useState('0');
    
    const handleAddSafe = () => {
        if (!name || !branchName) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول الأساسية.",
                variant: "destructive",
            });
            return;
        }

        const newSafe: Omit<Safe, 'id'> = {
            name,
            branchName,
            balance: parseFloat(balance) || 0,
        };
        onAddSafe(newSafe);
        toast({
            title: "تمت الإضافة بنجاح",
            description: `تمت إضافة الخزينة "${name}" إلى القائمة.`,
        });
        // Reset fields
        setName('');
        setBranchName('');
        setBalance('0');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة خزينة جديدة</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الخزينة الجديدة. انقر على "إضافة" عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم الخزينة</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: الخزينة الرئيسية" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branchName" className="text-right">الفرع</Label>
                        <Select value={branchName} onValueChange={setBranchName}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="balance" className="text-right">الرصيد الافتتاحي</Label>
                        <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="col-span-3" placeholder="0" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddSafe}>إضافة خزينة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SafesContent() {
    const { branches } = useFirebase();
    const [safes, setSafes] = useState<Safe[]>([]);
    const { toast } = useToast();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    useEffect(() => {
        const safesRef = ref(db, 'safes');
        const unsubscribe = onValue(safesRef, (snapshot) => {
            const data = snapshot.val();
            const safesArray: Safe[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as Omit<Safe, 'id'>) })) : [];
            setSafes(safesArray);
        });

        return () => unsubscribe();
    }, []);

    const handleAddSafe = async (newSafe: Omit<Safe, 'id'>) => {
        try {
            const safesRef = ref(db, 'safes');
            const newSafeRef = push(safesRef);
            await set(newSafeRef, newSafe);
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم إضافة الخزينة",
                variant: 'destructive'
            })
        }
    };
    
    const handleDeleteSafe = async (safeId: string) => {
        try {
            await remove(ref(db, `safes/${safeId}`));
            toast({
                title: "نجاح",
                description: "تم حذف الخزينة بنجاح",
            })
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم حذف الخزينة",
                variant: 'destructive'
            })
        }
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الخزائن</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              إضافة خزينة
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الخزائن</CardTitle>
          <CardDescription>
            قائمة بجميع الخزائن وأرصدتها في كافة الفروع.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الخزينة</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>الرصيد الحالي</TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safes.map((safe) => (
                <TableRow key={safe.id}>
                  <TableCell className="font-medium">
                    {safe.name}
                  </TableCell>
                   <TableCell>{safe.branchName}</TableCell>
                  <TableCell className="font-bold text-green-600">
                    {`ج.م ${safe.balance.toFixed(2)}`}
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
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteSafe(safe.id)}>
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddSafeDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddSafe={handleAddSafe} />
    </div>
  );
}

export default function SafesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <SafesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}


'use client';

import { useState, useEffect, useMemo } from 'react';
import { MoreHorizontal, PlusCircle, Landmark } from 'lucide-react';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Safe } from '@/lib/types';

import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/AuthProvider';

const AddSafeDialog = dynamic(() => import('./_components/AddSafeDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

function SafesContent() {
    const { safes, employees } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    
    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);

    const filteredSafes = useMemo(() => {
        if (!currentUser || currentUser.branch === 'كل الفروع') {
            return safes;
        }
        return safes.filter(s => s.branchName === currentUser.branch);
    }, [safes, currentUser]);


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
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
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
            قائمة بجميع الخزائن وأرصدتها في كافة الفروع. انقر على اسم الخزينة لعرض سجل حركاتها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم الخزينة</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">الرصيد الحالي</TableHead>
                <TableHead className="text-center">
                  <span>الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSafes.map((safe) => (
                <TableRow key={safe.id}>
                  <TableCell className="font-medium text-right">
                     <Link href={`/safes/${safe.id}`} className="hover:underline text-primary">
                        {safe.name}
                     </Link>
                  </TableCell>
                   <TableCell className="text-right">{safe.branchName}</TableCell>
                  <TableCell className="font-bold text-green-600 text-right">
                    {`ج.م ${safe.balance.toFixed(2)}`}
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
      {isAddDialogOpen && <AddSafeDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddSafe={handleAddSafe} />}
    </div>
  );
}

export default function SafesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <SafesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

    

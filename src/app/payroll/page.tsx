
'use client';

import { useState, useMemo } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, UserCog, MoreHorizontal } from 'lucide-react';
import type { Employee, PayrollTransaction, SafeTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PayrollTransactionDialog = dynamic(() => import('./_components/PayrollTransactionDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

function PayrollContent() {
    const { employees, payrollTransactions, safes, loading } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();

    const [isFormOpen, setFormOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [transactionType, setTransactionType] = useState<'advance' | 'bonus' | 'penalty'>('advance');
    
    const openTransactionDialog = (employee: Employee, type: 'advance' | 'bonus' | 'penalty') => {
        setSelectedEmployee(employee);
        setTransactionType(type);
        setFormOpen(true);
    };
    
    const handleAddTransaction = async (data: Omit<PayrollTransaction, 'id'>, safeId: string) => {
        try {
            // 1. Add payroll transaction
            const newPayrollRef = push(ref(db, 'payrollTransactions'));
            await set(newPayrollRef, data);
            
            // 2. Create safe transaction for withdrawals (advance, bonus)
            if (data.type === 'advance' || data.type === 'bonus') {
                const safe = safes.find(s => s.id === safeId);
                if (!safe) {
                    toast({title: 'خطأ', description: 'لم يتم العثور على الخزينة.', variant: 'destructive'});
                    return;
                }

                const safeTransaction: Omit<SafeTransaction, 'id'> = {
                    safeId: safeId,
                    amount: data.amount,
                    type: 'withdrawal',
                    date: data.date,
                    cashierName: data.recordedBy,
                    branchName: safe.branchName,
                    safeName: safe.name,
                    notes: `(${data.type === 'advance' ? 'سلفة' : 'مكافأة'}) للموظف: ${data.employeeName} - ${data.notes || ''}`,
                };
                const newTransactionRef = push(ref(db, 'safeTransactions'));
                await set(newTransactionRef, safeTransaction);
                
                // 3. Update safe balance
                const safeRef = ref(db, `safes/${safeId}`);
                await update(safeRef, { balance: safe.balance - data.amount });
            }

            toast({ title: 'تم تسجيل الحركة بنجاح' });
        } catch (error) {
            console.error("Transaction submission error:", error);
            toast({ title: 'خطأ', description: 'فشل تسجيل الحركة', variant: 'destructive' });
        }
    };
    
    const employeePayrollData = useMemo(() => {
        if (!payrollTransactions) return [];
        return employees.map(emp => {
            const empTransactions = payrollTransactions.filter(t => t.employeeId === emp.id);
            const totalAdvances = empTransactions.filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0);
            const totalBonuses = empTransactions.filter(t => t.type === 'bonus').reduce((sum, t) => sum + t.amount, 0);
            const totalPenalties = empTransactions.filter(t => t.type === 'penalty').reduce((sum, t) => sum + t.amount, 0);
            const netSalary = (emp.baseSalary || 0) + totalBonuses - totalAdvances - totalPenalties;

            return {
                ...emp,
                totalAdvances,
                totalBonuses,
                totalPenalties,
                netSalary,
            };
        });
    }, [employees, payrollTransactions]);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <div className="md:hidden"><SidebarTrigger /></div>
        <UserCog className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الرواتب</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>كشف رواتب الموظفين</CardTitle>
          <CardDescription>
            عرض رواتب الموظفين الأساسية مع السلف والمكافآت والجزاءات.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-right">الراتب الأساسي</TableHead>
                <TableHead className="text-right">السلف</TableHead>
                <TableHead className="text-right">المكافآت</TableHead>
                <TableHead className="text-right">الجزاءات</TableHead>
                <TableHead className="text-right font-bold">صافي الراتب</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                 {loading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : employeePayrollData.length > 0 ? (
                    employeePayrollData.map((emp) => (
                        <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{`ج.م ${(emp.baseSalary || 0).toFixed(2)}`}</TableCell>
                            <TableCell className="text-orange-600">{`ج.م ${emp.totalAdvances.toFixed(2)}`}</TableCell>
                            <TableCell className="text-green-600">{`ج.م ${emp.totalBonuses.toFixed(2)}`}</TableCell>
                            <TableCell className="text-red-600">{`ج.م ${emp.totalPenalties.toFixed(2)}`}</TableCell>
                            <TableCell className="font-bold">{`ج.م ${emp.netSalary.toFixed(2)}`}</TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openTransactionDialog(emp, 'advance')}>تسجيل سلفة</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openTransactionDialog(emp, 'bonus')}>تسجيل مكافأة</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openTransactionDialog(emp, 'penalty')}>تسجيل جزاء</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">لا يوجد موظفين لعرضهم.</TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        {isFormOpen && selectedEmployee && (
            <PayrollTransactionDialog
                open={isFormOpen}
                onOpenChange={setFormOpen}
                employee={selectedEmployee}
                transactionType={transactionType}
                onSubmit={handleAddTransaction}
            />
        )}
    </div>
  );
}

export default function PayrollPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <PayrollContent />
                </main>
            </div>
        </SidebarProvider>
    );
}

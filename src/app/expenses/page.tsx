
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { PlusCircle, FilePlus, Settings2, FilterX, Calendar as CalendarIcon } from 'lucide-react';
import type { Expense, ExpenseType, SafeTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ExpenseTypeDialog = dynamic(() => import('./_components/ExpenseTypeDialog'), {
    loading: () => <Skeleton className="w-full h-80" />,
});

const ExpenseFormDialog = dynamic(() => import('./_components/ExpenseFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

function ExpensesContent() {
    const { expenses, expenseTypes, employees, safes, branches, loading } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [isTypeDialogOpen, setTypeDialogOpen] = useState(false);
    const [isFormDialogOpen, setFormDialogOpen] = useState(false);

    // Filters
    const [branchFilter, setBranchFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();

    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);

    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setBranchFilter(currentUser.branch);
        }
    }, [currentUser]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const branchMatch = branchFilter === 'all' || exp.branchName === branchFilter;
            const typeMatch = typeFilter === 'all' || exp.typeId === typeFilter;
            const dateMatch = fromDate && toDate 
                ? isWithinInterval(new Date(exp.date), { start: startOfDay(fromDate), end: endOfDay(toDate) })
                : true;
            return branchMatch && typeMatch && dateMatch;
        });
    }, [expenses, branchFilter, typeFilter, fromDate, toDate]);

    const clearFilters = () => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            // don't clear branch
        } else {
            setBranchFilter('all');
        }
        setTypeFilter('all');
        setFromDate(undefined);
        setToDate(undefined);
    };


    const handleAddExpenseType = async (name: string) => {
        try {
            const newTypeRef = push(ref(db, 'expenseTypes'));
            await set(newTypeRef, { name });
            toast({ title: 'تمت إضافة النوع بنجاح' });
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل إضافة نوع المصروف', variant: 'destructive' });
        }
    };

    const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
        try {
            // 1. Add the expense record
            const newExpenseRef = push(ref(db, 'expenses'));
            await set(newExpenseRef, expenseData);

            // 2. Create a safe transaction
            const safe = safes.find(s => s.id === expenseData.safeId);
            const employee = employees.find(e => e.username === user?.username);
            if (!safe || !employee) {
                toast({ title: 'خطأ', description: 'لم يتم العثور على الخزينة أو الموظف.', variant: 'destructive' });
                return;
            }

            const transaction: Omit<SafeTransaction, 'id'> = {
                safeId: expenseData.safeId,
                amount: expenseData.amount,
                type: 'withdrawal',
                date: expenseData.date,
                cashierName: employee.name,
                branchName: expenseData.branchName,
                safeName: safe.name,
                notes: `مصروف: ${expenseData.notes || expenseTypes.find(t=>t.id === expenseData.typeId)?.name}`,
            };
            const newTransactionRef = push(ref(db, 'safeTransactions'));
            await set(newTransactionRef, transaction);

            // 3. Update the safe balance
            const safeRef = ref(db, `safes/${expenseData.safeId}`);
            await update(safeRef, { balance: safe.balance - expenseData.amount });

            toast({ title: 'تم تسجيل المصروف بنجاح' });

        } catch (error) {
             console.error("Expense submission error:", error);
            toast({ title: 'خطأ', description: 'فشل تسجيل المصروف', variant: 'destructive' });
        }
    }


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <div className="md:hidden"><SidebarTrigger /></div>
        <h1 className="text-lg font-semibold md:text-2xl">المصروفات والصيانة</h1>
        <div className="ms-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setTypeDialogOpen(true)}>
                <Settings2 className="h-4 w-4 me-2" />
                أنواع المصروفات
            </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => setFormDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة مصروف</span>
          </Button>
        </div>
      </div>
      
       <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>فلترة المصروفات</CardTitle>
                </div>
                 <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="me-2 h-4 w-4" />
                    مسح الفلاتر
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={branchFilter} onValueChange={setBranchFilter} disabled={currentUser?.branch !== 'كل الفروع'}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الفروع</SelectItem>
                                {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">نوع المصروف</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الأنواع</SelectItem>
                                {expenseTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">من تاريخ</label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                disabled={(date) => toDate ? date > toDate : false}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">إلى تاريخ</label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={setToDate}
                                disabled={(date) => fromDate ? date < fromDate : false}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل المصروفات</CardTitle>
          <CardDescription>
            عرض لجميع المصروفات المسجلة في النظام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">اللعبة</TableHead>
                <TableHead className="text-right">الخزينة</TableHead>
                <TableHead className="text-right">ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
             <TableBody>
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => {
                        const typeName = expenseTypes.find(t => t.id === expense.typeId)?.name;
                        const safeName = safes.find(s => s.id === expense.safeId)?.name;
                        return (
                            <TableRow key={expense.id}>
                                <TableCell>{new Date(expense.date).toLocaleDateString('ar-EG')}</TableCell>
                                <TableCell>{typeName}</TableCell>
                                <TableCell>{expense.branchName}</TableCell>
                                <TableCell className="font-semibold text-red-600">{`ج.م ${expense.amount.toFixed(2)}`}</TableCell>
                                <TableCell>{expense.gameName || '-'}</TableCell>
                                <TableCell>{safeName}</TableCell>
                                <TableCell>{expense.notes}</TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                            لا توجد مصروفات مسجلة تطابق الفلاتر المحددة.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isTypeDialogOpen && (
        <ExpenseTypeDialog 
            open={isTypeDialogOpen}
            onOpenChange={setTypeDialogOpen}
            onAddType={handleAddExpenseType}
            existingTypes={expenseTypes}
        />
      )}
      {isFormDialogOpen && (
          <ExpenseFormDialog 
            open={isFormDialogOpen}
            onOpenChange={setFormDialogOpen}
            onSubmit={handleAddExpense}
          />
      )}
    </div>
  );
}

export default function ExpensesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <ExpensesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

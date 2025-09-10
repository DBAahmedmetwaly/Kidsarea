

'use client';

import { useState, useMemo, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { List, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { useFirebase } from '@/context/FirebaseContext';
import type { SafeTransaction } from '@/lib/types';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/AuthProvider';

function TransactionsContent() {
  const { branches, safes, employees, transactions: allTransactions, loading } = useFirebase();
  const { user } = useAuth();
  
  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);


  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedSafe, setSelectedSafe] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const canChangeBranch = !currentUser || currentUser.branch === 'كل الفروع' || user?.username === 'admin';

  useEffect(() => {
    if (currentUser && !canChangeBranch) {
        setSelectedBranch(currentUser.branch);
    }
  }, [currentUser, canChangeBranch]);
  

  const filteredSafes = useMemo(() => {
    if (selectedBranch === 'all') return safes;
    return safes.filter(s => s.branchName === selectedBranch);
  }, [safes, selectedBranch]);
  
  useEffect(() => {
    setSelectedSafe('all');
  }, [selectedBranch]);

  const filteredTransactions = useMemo(() => {
    let transactions = [...allTransactions];
    
    if (selectedBranch !== 'all') {
      transactions = transactions.filter(t => t.branchName === selectedBranch);
    }
    if (selectedSafe !== 'all') {
      transactions = transactions.filter(t => t.safeId === selectedSafe);
    }
    if (selectedType !== 'all') {
      transactions = transactions.filter(t => t.type === selectedType);
    }
    if (fromDate && toDate) {
        const range = { start: startOfDay(fromDate), end: endOfDay(toDate) };
        transactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return isWithinInterval(txDate, range);
        });
    }

    return transactions;
  }, [allTransactions, selectedBranch, selectedSafe, selectedType, fromDate, toDate]);
  
  const clearFilters = () => {
    if (!canChangeBranch) {
        // Don't clear branch if it's locked
    } else {
        setSelectedBranch('all');
    }
    setSelectedSafe('all');
    setSelectedType('all');
    setFromDate(undefined);
    setToDate(undefined);
  }

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (filteredTransactions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              لا توجد حركات مطابقة للبحث.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {filteredTransactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-right">{new Date(tx.date).toLocaleString('ar-EG')}</TableCell>
            <TableCell className="text-right">{tx.branchName}</TableCell>
            <TableCell className="text-right">{tx.safeName}</TableCell>
            <TableCell className="text-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {tx.type === 'deposit' ? 'إيداع' : 'سحب'}
              </span>
            </TableCell>
            <TableCell className="font-medium text-center">{`ج.م ${tx.amount.toFixed(2)}`}</TableCell>
            <TableCell className="text-right">{tx.cashierName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };


  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <List className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold md:text-2xl">سجل الحركات المالية</h1>
        </div>
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>فلترة الحركات</CardTitle>
                  <CardDescription>
                  استخدم الفلاتر أدناه لتحديد الحركات التي ترغب في عرضها.
                  </CardDescription>
                </div>
                 <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="me-2 h-4 w-4" />
                    مسح الفلاتر
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!canChangeBranch}>
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
                        <label className="text-sm font-medium">الخزينة</label>
                         <Select value={selectedSafe} onValueChange={setSelectedSafe}>
                            <SelectTrigger disabled={filteredSafes.length === 0 && selectedBranch === 'all'}>
                                <SelectValue placeholder="اختر الخزينة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الخزائن</SelectItem>
                                {filteredSafes.map(safe => (
                                    <SelectItem key={safe.id} value={safe.id}>{safe.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">نوع الحركة</label>
                         <Select value={selectedType} onValueChange={setSelectedType as any}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الأنواع</SelectItem>
                                <SelectItem value="deposit">إيداع</SelectItem>
                                <SelectItem value="withdrawal">سحب</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                       <div className="space-y-2">
                          <label className="text-sm font-medium">من تاريخ</label>
                          <Popover>
                              <PopoverTrigger asChild>
                              <Button
                                  variant={"outline"}
                                  className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                              >
                                  <CalendarIcon className="me-2 h-4 w-4" />
                                  {fromDate ? format(fromDate, "PP", { locale: ar }) : <span>اختر</span>}
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
                                    {toDate ? format(toDate, "PP", { locale: ar }) : <span>اختر</span>}
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
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>الحركات المسجلة</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">التاريخ والوقت</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-right">الخزينة</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                        <TableHead className="text-center">المبلغ</TableHead>
                        <TableHead className="text-right">الموظف المسؤول</TableHead>
                    </TableRow>
                    </TableHeader>
                    {renderContent()}
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}


export default function TransactionsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <TransactionsContent />
            </main>
            </div>
        </SidebarProvider>
    );
}
      

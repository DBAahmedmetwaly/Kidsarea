
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
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function TransactionsContent() {
  const { branches, safes } = useFirebase();
  const [allTransactions, setAllTransactions] = useState<SafeTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedSafe, setSelectedSafe] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [date, setDate] = useState<DateRange | undefined>();
  
  useEffect(() => {
    const transactionsRef = ref(db, 'safeTransactions');
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        const transactionsArray: SafeTransaction[] = data 
            ? Object.entries(data)
                .map(([id, value]) => ({ id, ...(value as any) }))
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            : [];
        setAllTransactions(transactionsArray);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    if (date?.from && date.to) {
        const range = { start: startOfDay(date.from), end: endOfDay(date.to) };
        transactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return isWithinInterval(txDate, range);
        });
    }

    return transactions;
  }, [allTransactions, selectedBranch, selectedSafe, selectedType, date]);
  
  const clearFilters = () => {
    setSelectedBranch('all');
    setSelectedSafe('all');
    setSelectedType('all');
    setDate(undefined);
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
            <TableCell>{new Date(tx.date).toLocaleString('ar-EG')}</TableCell>
            <TableCell>{tx.branchName}</TableCell>
            <TableCell>{tx.safeName}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {tx.type === 'deposit' ? 'إيداع' : 'سحب'}
              </span>
            </TableCell>
            <TableCell className="font-medium">{`ج.م ${tx.amount.toFixed(2)}`}</TableCell>
            <TableCell>{tx.cashierName}</TableCell>
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
            <CardHeader>
                <CardTitle>فلترة الحركات</CardTitle>
                <CardDescription>
                استخدم الفلاتر أدناه لتحديد الحركات التي ترغب في عرضها.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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
                    <div className="space-y-2 md:col-span-3 lg:col-span-1">
                        <label className="text-sm font-medium">النطاق الزمني</label>
                         <div className="flex items-center gap-2">
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="me-2 h-4 w-4" />
                                    {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "PPP", { locale: ar })} -{" "}
                                        {format(date.to, "PPP", { locale: ar })}
                                        </>
                                    ) : (
                                        format(date.from, "PPP", { locale: ar })
                                    )
                                    ) : (
                                    <span>الفصل على فلترين</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                    locale={ar}
                                />
                                </PopoverContent>
                            </Popover>
                             <Button variant="ghost" onClick={clearFilters} size="icon">
                                <FilterX className="h-4 w-4" />
                                <span className="sr-only">مسح الفلاتر</span>
                            </Button>
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
                        <TableHead>التاريخ والوقت</TableHead>
                        <TableHead>الفرع</TableHead>
                        <TableHead>الخزينة</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الموظف المسؤول</TableHead>
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

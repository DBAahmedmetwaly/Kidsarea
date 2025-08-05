

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
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
import { History, Calendar as CalendarIcon, FilterX, Printer } from 'lucide-react';
import { useFirebase } from '@/context/FirebaseContext';
import type { CompletedSession } from '@/lib/types';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { PosReceipt, type PosReceiptProps } from '@/components/Receipt';
import { usePosPrint } from '@/hooks/use-pos-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';


function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function SessionsContent() {
  const { branches, employees } = useFirebase();
  const { completedSessions, setCompletedSessions } = useSession();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  
  // Receipt State
  const [receiptDetails, setReceiptDetails] = useState<PosReceiptProps | null>(null);
  
  const receiptComponent = useMemo(() => {
    if (!receiptDetails) return null;
    return <PosReceipt {...receiptDetails} />;
  }, [receiptDetails]);

  const { print } = usePosPrint(receiptComponent as React.ReactElement);


  useEffect(() => {
    if (currentUser && currentUser.branch !== 'كل الفروع') {
        setSelectedBranch(currentUser.branch);
    }
  }, [currentUser]);

  useEffect(() => {
    const sessionsRef = ref(db, 'sessions/completed');
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
        const data = snapshot.val();
        const sessionsArray: CompletedSession[] = data 
            ? Object.values(data).sort((a: any,b: any) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime())
            : [];
        setCompletedSessions(sessionsArray);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [setCompletedSessions]);


  const filteredSessions = useMemo(() => {
    let sessions = [...completedSessions];
    
    if (selectedBranch !== 'all') {
      sessions = sessions.filter(s => s.branchName === selectedBranch);
    }
    if (fromDate && toDate) {
        const range = { start: startOfDay(fromDate), end: endOfDay(toDate) };
        sessions = sessions.filter(s => {
            const sessionDate = new Date(s.checkOutTime);
            return isWithinInterval(sessionDate, range);
        });
    }

    return sessions;
  }, [completedSessions, selectedBranch, fromDate, toDate]);
  
  const clearFilters = () => {
    if (currentUser && currentUser.branch !== 'كل الفروع') {
        // Don't clear branch if it's locked
    } else {
        setSelectedBranch('all');
    }
    setFromDate(undefined);
    setToDate(undefined);
  }

  const showReceiptForSession = (session: CompletedSession) => {
    const cashier = employees.find(e => e.username === session.cashierUsername);
    const cashierName = user?.username === 'admin' 
        ? 'Admin' 
        : cashier?.name || session.cashierUsername || 'N/A';

    setReceiptDetails({
        childName: session.name,
        parentName: session.parentName,
        gameName: session.game,
        checkInTime: new Date(session.checkInTime),
        checkOutTime: new Date(session.checkOutTime),
        duration: formatDuration(session.durationMs),
        totalCost: session.cost,
        durationCost: session.durationCost,
        entryFee: session.entryFee,
        cashierName: cashierName,
        isSubscription: !!session.subscriptionId,
    });
  }
  
  useEffect(() => {
      if (receiptDetails) {
          print();
      }
  }, [receiptDetails, print]);


  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(8)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-full" /></TableCell>
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

    if (filteredSessions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              لا توجد جلسات مطابقة للبحث.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {filteredSessions.map((session) => (
            <TableRow key={session.id}>
                <TableCell className="font-medium text-right">
                {session.name}
                </TableCell>
                <TableCell className="text-right">{session.parentName}</TableCell>
                <TableCell className="text-right">{session.branchName}</TableCell>
                <TableCell className="text-right">{session.game}</TableCell>
                <TableCell className="text-center">
                {formatDuration(session.durationMs)}
                </TableCell>
                <TableCell className="font-bold text-center">{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                <TableCell className="text-center">
                {new Date(
                    session.checkOutTime
                ).toLocaleString('ar-EG')}
                </TableCell>
                <TableCell className="text-center">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showReceiptForSession(session)}
                >
                    <Printer className="me-2 h-4 w-4" />
                    طباعة الإيصال
                </Button>
                </TableCell>
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
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold md:text-2xl">سجل الجلسات</h1>
        </div>
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>فلترة الجلسات</CardTitle>
                    <CardDescription>
                    استخدم الفلاتر أدناه لعرض جلسات محددة.
                    </CardDescription>
                </div>
                 <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="me-2 h-4 w-4" />
                    مسح الفلاتر
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={currentUser?.branch !== 'كل الفروع'}>
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
                <CardTitle>جميع الجلسات المنتهية</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">اسم الطفل</TableHead>
                        <TableHead className="text-right">ولي الأمر</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-right">اللعبة</TableHead>
                        <TableHead className="text-center">مدة اللعب</TableHead>
                        <TableHead className="text-center">التكلفة</TableHead>
                        <TableHead className="text-center">وقت الخروج</TableHead>
                        <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                    </TableHeader>
                    {renderContent()}
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}


export default function SessionsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <SessionsContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

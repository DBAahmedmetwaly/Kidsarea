
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
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { Receipt, type ReceiptProps } from '@/components/Receipt';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


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

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>();
  
  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<ReceiptProps | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handlePrint = useReactToPrint({
      content: () => receiptRef.current,
  });

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
    if (date?.from && date.to) {
        const range = { start: startOfDay(date.from), end: endOfDay(date.to) };
        sessions = sessions.filter(s => {
            const sessionDate = new Date(s.checkOutTime);
            return isWithinInterval(sessionDate, range);
        });
    }

    return sessions;
  }, [completedSessions, selectedBranch, date]);
  
  const clearFilters = () => {
    setSelectedBranch('all');
    setDate(undefined);
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
        cashierName: cashierName
    });

    setShowReceipt(true);
  }

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
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (filteredSessions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
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
                <TableCell className="font-medium">
                {session.name}
                </TableCell>
                <TableCell>{session.parentName}</TableCell>
                <TableCell>{session.branchName}</TableCell>
                <TableCell>{session.game}</TableCell>
                <TableCell>
                {formatDuration(session.durationMs)}
                </TableCell>
                <TableCell className="font-bold">{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                <TableCell>
                {new Date(
                    session.checkOutTime
                ).toLocaleString('ar-EG')}
                </TableCell>
                <TableCell>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showReceiptForSession(session)}
                >
                    <Printer className="me-2 h-4 w-4" />
                    إيصال
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
            <CardHeader>
                <CardTitle>فلترة الجلسات</CardTitle>
                <CardDescription>
                استخدم الفلاتر أدناه لعرض جلسات محددة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

                    <div className="space-y-2 lg:col-span-2">
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
                <CardTitle>جميع الجلسات المنتهية</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>اسم الطفل</TableHead>
                        <TableHead>ولي الأمر</TableHead>
                        <TableHead>الفرع</TableHead>
                        <TableHead>اللعبة</TableHead>
                        <TableHead>مدة اللعب</TableHead>
                        <TableHead>التكلفة</TableHead>
                        <TableHead>وقت الخروج</TableHead>
                        <TableHead>إجراء</TableHead>
                    </TableRow>
                    </TableHeader>
                    {renderContent()}
                </Table>
            </CardContent>
        </Card>
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
            <DialogContent className="max-w-sm">
            <DialogHeader>
                <DialogTitle>إيصال الدفع</DialogTitle>
                <DialogDescription>
                تفاصيل جلسة اللعب للطفل {receiptDetails?.childName}.
                </DialogDescription>
            </DialogHeader>
            <div ref={receiptRef}>
                {receiptDetails && <Receipt {...receiptDetails} />}
            </div>
            <DialogFooter className="sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setShowReceipt(false)}>إغلاق</Button>
                <Button type="button" onClick={handlePrint}>
                    <Printer className="me-2 h-4 w-4" />
                    هذا الزر لا يعمل
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
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



'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { History, Calendar as CalendarIcon, FilterX, Printer, Star, Loader2, PackageCheck, Download } from 'lucide-react';
import { useFirebase } from '@/context/FirebaseContext';
import type { CompletedSession, PosReceiptProps } from '@/lib/types';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { PosReceipt } from '@/components/Receipt';
import { usePosPrint } from '@/hooks/use-pos-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';


function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function SessionsContent() {
  const { branches, employees, policies, receiptSettings } = useFirebase();
  const { completedSessions, loading } = useSession();
  const { user } = useAuth();
  const { printReceipt } = usePosPrint();


  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (currentUser && currentUser.branch !== 'كل الفروع') {
        setSelectedBranch(currentUser.branch);
    }
  }, [currentUser]);


  const filteredSessions = useMemo(() => {
    let sessions = [...completedSessions];
    
    if (selectedBranch !== 'all') {
      sessions = sessions.filter(s => s.branchName === selectedBranch);
    }

    if(phoneFilter) {
        sessions = sessions.filter(s => s.phoneNumbers && s.phoneNumbers.some(p => p.includes(phoneFilter)));
    }

    if (fromDate && toDate) {
        const range = { start: startOfDay(fromDate), end: endOfDay(toDate) };
        sessions = sessions.filter(s => {
            const sessionDate = new Date(s.checkOutTime);
            return isWithinInterval(sessionDate, range);
        });
    }

    return sessions;
  }, [completedSessions, selectedBranch, phoneFilter, fromDate, toDate]);
  
  const visibleSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleCount);
  }, [filteredSessions, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  }
  
  const clearFilters = () => {
    if (currentUser && currentUser.branch !== 'كل الفروع') {
        // Don't clear branch if it's locked
    } else {
        setSelectedBranch('all');
    }
    setPhoneFilter('');
    setFromDate(undefined);
    setToDate(undefined);
  }

  const showReceiptForSession = (session: CompletedSession) => {
    const cashier = employees.find(e => e.username === session.cashierUsername);
    const cashierName = user?.username === 'admin' 
        ? 'Admin' 
        : cashier?.name || session.cashierUsername || 'N/A';

    const receiptDetails: PosReceiptProps = {
        receiptId: `${session.branchName.substring(0,3).toUpperCase() || 'DEF'}-${session.receiptNumber}`,
        settings: receiptSettings,
        appName: policies?.find(p => p.id === 'default')?.appName || 'FunTrack',
        children: session.children,
        parentName: session.parentName,
        phoneNumbers: session.phoneNumbers,
        gameName: session.game,
        checkInTime: new Date(session.checkInTime),
        checkOutTime: new Date(session.checkOutTime),
        duration: formatDuration(session.durationMs),
        totalCost: session.cost,
        durationCost: session.durationCost,
        entryFee: session.entryFee,
        discount: session.discount,
        cashierName: cashierName,
        isSubscription: !!session.subscriptionId,
        packagePrice: session.packagePrice,
        packageName: session.packageName,
        packageDuration: session.packageDuration,
        overtimeCost: session.overtimeCost,
        notes: session.notes,
    };
    printReceipt(<PosReceipt {...receiptDetails} />);
  }
  
  const handleExport = () => {
    const dataToExport = filteredSessions.map(session => ({
        'رقم الإيصال': session.receiptNumber ? `${session.branchName.substring(0,3).toUpperCase()}-${session.receiptNumber}` : 'N/A',
        'اسم الطفل': session.children?.map(c => c.name).join(', ') ?? 'N/A',
        'ولي الأمر': session.parentName,
        'رقم الهاتف': (session.phoneNumbers || []).join(', '),
        'الفرع': session.branchName,
        'اللعبة': session.game,
        'الباقة': session.packageName || '-',
        'مدة اللعب': formatDuration(session.durationMs),
        'التكلفة': session.cost,
        'الخصم': session.discount || 0,
        'وقت الخروج': new Date(session.checkOutTime).toLocaleString('ar-EG'),
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الجلسات");
    XLSX.writeFile(workbook, `Sessions_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  }


  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={12}>
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    if (visibleSessions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={12} className="h-24 text-center">
              لا توجد جلسات مطابقة للبحث.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {visibleSessions.map((session) => {
            const costBeforeDiscount = session.costBeforeDiscount > 0
                ? session.costBeforeDiscount
                : session.cost + (session.discount || 0);

            return (
            <TableRow key={session.id || `${session.receiptNumber}-${session.parentName}`}>
                <TableCell className="font-medium text-right whitespace-nowrap">{session.receiptNumber ? `${session.branchName.substring(0,3).toUpperCase()}-${session.receiptNumber}` : 'N/A'}</TableCell>
                <TableCell className="font-medium text-right whitespace-nowrap">
                {session.children?.map(c => c.name).join(', ') ?? 'N/A'}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{session.parentName}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{(session.phoneNumbers || []).join(', ')}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{session.branchName}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{session.game}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{session.packageName || '-'}</TableCell>
                <TableCell className="text-center whitespace-nowrap">
                {formatDuration(session.durationMs)}
                </TableCell>
                 <TableCell className="text-right whitespace-nowrap">{session.notes || '-'}</TableCell>
                <TableCell className="font-bold text-center">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {session.discount ? (
                            <>
                                <span className="line-through text-muted-foreground">{`ج.م ${costBeforeDiscount.toFixed(2)}`}</span>
                                <span className='text-primary'>{`ج.م ${session.cost.toFixed(2)}`}</span>
                            </>
                        ) : (
                            <span>{`ج.م ${session.cost.toFixed(2)}`}</span>
                        )}

                        {session.subscriptionId && <Star className="h-4 w-4 text-yellow-500" />}
                        {(session.packagePrice !== undefined || session.packageName) && <PackageCheck className="h-4 w-4 text-blue-500" />}
                    </div>
                </TableCell>
                <TableCell className="text-center whitespace-nowrap">
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
        )})}
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
            <h1 className="text-lg font-semibold md:text-2xl me-auto">سجل الجلسات</h1>
             <Button onClick={handleExport} size="sm" variant="outline" disabled={filteredSessions.length === 0}>
                <Download className="me-2 h-4 w-4" />
                تصدير إلى Excel
            </Button>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
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
                         <label className="text-sm font-medium">رقم الهاتف</label>
                         <Input 
                            placeholder="ابحث برقم الهاتف..."
                            value={phoneFilter}
                            onChange={(e) => setPhoneFilter(e.target.value)}
                         />
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
                <CardTitle>جميع جلسات المنتهية و الغير منتهية</CardTitle>
                <CardDescription>عرض لجميع جلسات اللعب التي تمت في الفروع.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">رقم الإيصال</TableHead>
                        <TableHead className="text-right">اسم الطفل</TableHead>
                        <TableHead className="text-right">ولي الأمر</TableHead>
                        <TableHead className="text-center">رقم الهاتف</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-right">اللعبة</TableHead>
                        <TableHead className="text-right">الباقة</TableHead>
                        <TableHead className="text-center">مدة اللعب</TableHead>
                        <TableHead className="text-right">الملاحظات</TableHead>
                        <TableHead className="text-center">التكلفة النهائية</TableHead>
                        <TableHead className="text-center">وقت الخروج</TableHead>
                        <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                    </TableHeader>
                    {renderContent()}
                </Table>
                {filteredSessions.length > visibleCount && (
                    <div className="mt-4 text-center">
                        <Button onClick={handleLoadMore}>
                            تحميل المزيد
                        </Button>
                    </div>
                )}
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

    






    





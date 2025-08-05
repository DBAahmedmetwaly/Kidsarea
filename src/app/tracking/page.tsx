
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, Square, Printer, Users, Activity, AlertTriangle } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, CompletedSession, Policies, DayOfWeek } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { StatCard } from '@/components/StatCard';
import { ref, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Receipt, type ReceiptProps } from '@/components/Receipt';
import { useReactToPrint } from 'react-to-print';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const TimeCounter = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const calculateElapsed = () => Date.now() - startTime;
    setElapsed(calculateElapsed());

    const timer = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  if (elapsed === null) {
    return <span>...</span>;
  }

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span>
      {`${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </span>
  );
};

function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function calculateCost(durationMs: number, hourlyRate: number, policies: Policies | null) {
    const durationHours = durationMs / (1000 * 60 * 60);
    let roundedHours = durationHours;

    if (policies?.roundingPolicy && policies.roundingPolicy !== 'none') {
        const minutes = durationHours * 60;
        switch(policies.roundingPolicy) {
            case 'quarter-hour':
                roundedHours = Math.ceil(minutes / 15) * 15 / 60;
                break;
            case 'half-hour':
                roundedHours = Math.ceil(minutes / 30) * 30 / 60;
                break;
            case 'hour':
                roundedHours = Math.ceil(minutes / 60);
                break;
        }
    }
    
    // This is a simplified logic. A more complex one might check if duration is less than 30mins etc.
    // For now we assume fractional_rate is not used with rounding policies.
    const durationCost = roundedHours * hourlyRate;

    const entryFee = policies?.entryFee || 0;
    const totalCost = durationCost + entryFee;

    return { totalCost, durationCost, entryFee };
}

function getDayOfWeek(date: Date): DayOfWeek {
    const dayIndex = date.getDay(); // Sunday = 0, Monday = 1, etc.
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
}


function TrackingContent() {
  const { activeChildren, setActiveChildren, completedSessions, setCompletedSessions } = useSession();
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildParentName, setNewChildParentName] = useState('');
  const [newChildPhoneNumber, setNewChildPhoneNumber] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<ReceiptProps | null>(null);
  const { toast } = useToast();
  const { games, policies, openShifts, employees, branches } = useFirebase();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [selectedBranch, setSelectedBranch] = useState('all');

  const handlePrint = useReactToPrint({
      content: () => receiptRef.current,
  });
  
  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    if (user.username === 'admin') return true;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);

  const filteredActiveChildren = useMemo(() => {
    if (selectedBranch === 'all') return activeChildren;
    return activeChildren.filter(child => child.branchName === selectedBranch);
  }, [activeChildren, selectedBranch]);


  const totalVisitorsToday = useMemo(() => {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const allSessionsToday = [...activeChildren, ...completedSessions].filter(s => {
          const sessionTime = 'checkOutTime' in s ? (s as CompletedSession).checkOutTime : s.checkInTime;
          return sessionTime >= todayStart.getTime();
      });

      const uniqueChildIds = new Set(allSessionsToday.map(s => s.id));
      const filteredByBranch = [...uniqueChildIds]
        .map(id => allSessionsToday.find(s => s.id === id))
        .filter(Boolean)
        .filter(s => selectedBranch === 'all' || s!.branchName === selectedBranch);

      return filteredByBranch.length;

  }, [activeChildren, completedSessions, selectedBranch]);

  // Sync with Firebase
  useEffect(() => {
      const activeRef = ref(db, 'sessions/active');
      const completedRef = ref(db, 'sessions/completed');

      const unsubscribeActive = onValue(activeRef, (snapshot) => {
          const data = snapshot.val();
          setActiveChildren(data ? Object.values(data) : []);
      });

      const unsubscribeCompleted = onValue(completedRef, (snapshot) => {
          const data = snapshot.val();
          const sessionsArray: CompletedSession[] = data 
            ? Object.values(data).sort((a: any,b: any) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime())
            : [];
          setCompletedSessions(sessionsArray);
      });

      return () => {
          unsubscribeActive();
          unsubscribeCompleted();
      }
  }, [setActiveChildren, setCompletedSessions]);


  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName || !newChildAge || !selectedGame || !newChildParentName || !newChildPhoneNumber) {
      toast({
        title: 'خطأ',
        description: 'الرجاء تعبئة جميع الحقول لتسجيل الدخول.',
        variant: 'destructive',
      });
      return;
    }

    const gameDetails = games.find((g) => g.name === selectedGame);
    if (!gameDetails) {
         toast({ title: 'اللعبة المختارة غير موجودة!', variant: 'destructive'});
         return;
    }

    if (policies && policies.maxCapacity && activeChildren.length >= policies.maxCapacity) {
        toast({
            title: 'تم الوصول للحد الأقصى',
            description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${policies.maxCapacity} طفل.`,
            variant: 'destructive',
        });
        return;
    }

    if (!user || !user.username) {
        toast({
            title: 'خطأ',
            description: 'لا يمكن تسجيل الدخول. لم يتم تحديد الكاشير الحالي.',
            variant: 'destructive',
        });
        return;
    }


    const childId = Date.now();
    const newChild: Child = {
      id: childId,
      name: newChildName,
      age: parseInt(newChildAge),
      parentName: newChildParentName,
      phoneNumber: newChildPhoneNumber,
      game: selectedGame,
      branchName: gameDetails.branch,
      checkInTime: Date.now(),
      cashierUsername: user.username,
    };

    try {
        await set(ref(db, `sessions/active/${childId}`), newChild);
        setNewChildName('');
        setNewChildAge('');
        setNewChildParentName('');
        setNewChildPhoneNumber('');
        setSelectedGame('');
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `تم تسجيل دخول الطفل ${newChild.name}.`,
        });
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الدخول', variant: 'destructive'})
    }
  };

  const handleCheckOut = async (child: Child) => {
    const checkOutTime = Date.now();
    const durationMs = checkOutTime - child.checkInTime;

    const gameDetails = games.find((g) => g.name === child.game);
    let hourlyRate = gameDetails?.hourly_rate || 0;

    if (policies?.enableWeekendPricing) {
        const today = getDayOfWeek(new Date(checkOutTime));
        if (policies.weekendDays[today]) {
            const weekendPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
            if(weekendPolicy) {
                hourlyRate = weekendPolicy.weekendRate;
            }
        } else {
             const weekdayPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
             if(weekdayPolicy) {
                hourlyRate = weekdayPolicy.weekdayRate;
             }
        }
    }
    
    const { totalCost, durationCost, entryFee } = calculateCost(durationMs, hourlyRate, policies);

    const completedSession: CompletedSession = {
        ...child,
        checkOutTime,
        durationMs,
        cost: totalCost,
        durationCost: durationCost,
        entryFee: entryFee,
    };
    
    try {
        await set(ref(db, `sessions/completed/${child.id}`), completedSession);
        await set(ref(db, `sessions/active/${child.id}`), null); // Remove from active
        
        showReceiptForSession(completedSession);
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الخروج', variant: 'destructive'})
    }

  };

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
  
  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-2xl font-bold">تتبع الأطفال</h1>
             <div className="ms-auto w-full sm:w-auto">
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="w-full sm:w-[200px]">
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
        </div>
       <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="الأطفال النشطون حاليًا"
          value={filteredActiveChildren.length.toString()}
          icon={Activity}
          description={selectedBranch === 'all' ? `في كل الفروع` : `في ${selectedBranch}`}
        />
        <StatCard
          title="إجمالي زوار اليوم"
          value={totalVisitorsToday.toString()}
          icon={Users}
          description={selectedBranch === 'all' ? `في كل الفروع` : `في ${selectedBranch}`}
        />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            {hasActiveShift ? (
                <Card>
                <CardHeader>
                    <CardTitle>تسجيل دخول طفل جديد</CardTitle>
                    <CardDescription>
                    أدخل تفاصيل الطفل وولي الأمر لبدء جلسة اللعب.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCheckIn} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="child-name">اسم الطفل</Label>
                        <Input
                        id="child-name"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        placeholder="مثال: محمد"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="child-age">عمر الطفل</Label>
                        <Input
                        id="child-age"
                        type="number"
                        value={newChildAge}
                        onChange={(e) => setNewChildAge(e.target.value)}
                        placeholder="مثال: 5"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parent-name">اسم ولي الأمر</Label>
                        <Input
                        id="parent-name"
                        value={newChildParentName}
                        onChange={(e) => setNewChildParentName(e.target.value)}
                        placeholder="مثال: أحمد عبد الله"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone-number">رقم الهاتف</Label>
                        <Input
                        id="phone-number"
                        type="tel"
                        value={newChildPhoneNumber}
                        onChange={(e) => setNewChildPhoneNumber(e.target.value)}
                        placeholder="مثال: 01234567890"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="game-select">اختر اللعبة</Label>
                        <Select value={selectedGame} onValueChange={setSelectedGame}>
                        <SelectTrigger id="game-select">
                            <SelectValue placeholder="اختر لعبة..." />
                        </SelectTrigger>
                        <SelectContent>
                            {games.filter(g => g.status === 'Available').map((game) => (
                            <SelectItem key={game.id} value={game.name}>
                                {game.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full">
                        <PlayCircle className="me-2 h-4 w-4" />
                        بدء اللعب
                    </Button>
                    </form>
                </CardContent>
                </Card>
            ) : (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>لا توجد وردية مفتوحة</AlertTitle>
                    <AlertDescription>
                       لا يمكنك تسجيل دخول الأطفال لأنه لا توجد وردية مفتوحة لحسابك. يرجى الذهاب إلى
                       <Link href="/shift-closing" className="font-bold underline px-1">إدارة الورديات</Link>
                       لبدء وردية جديدة.
                    </AlertDescription>
                </Alert>
            )}
        </div>
        <div className="md:col-span-2">
            <Card>
            <CardHeader>
                <CardTitle>الأطفال النشطون حاليًا</CardTitle>
                <CardDescription>
                قائمة بالأطفال الذين يلعبون حاليًا.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>اسم الطفل</TableHead>
                    <TableHead>اللعبة</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>مدة اللعب</TableHead>
                    <TableHead>إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredActiveChildren.length > 0 ? (
                    filteredActiveChildren.map((child) => (
                        <TableRow key={child.id}>
                        <TableCell className="font-medium">{child.name}</TableCell>
                        <TableCell>{child.game}</TableCell>
                        <TableCell>{child.branchName}</TableCell>
                        <TableCell>
                            <TimeCounter startTime={child.checkInTime} />
                        </TableCell>
                        <TableCell>
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCheckOut(child)}
                            disabled={!hasActiveShift}
                            >
                            <Square className="me-2 h-4 w-4" />
                            خروج
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">
                        لا يوجد أطفال نشطون حاليًا.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
      </div>
       
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
                    طباعة
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}


export default function TrackingPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <TrackingContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

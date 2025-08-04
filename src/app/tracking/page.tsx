
'use client';

import { useState, useEffect } from 'react';
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
import { PlayCircle, Square, Printer, Users, Activity } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, CompletedSession } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { StatCard } from '@/components/StatCard';
import { ref, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

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

function TrackingContent() {
  const { activeChildren, setActiveChildren, completedSessions, setCompletedSessions } = useSession();
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildParentName, setNewChildParentName] = useState('');
  const [newChildPhoneNumber, setNewChildPhoneNumber] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState({
    name: '',
    duration: '',
    cost: '',
  });
  const { toast } = useToast();
  const { games } = useFirebase();

  const totalVisitors = activeChildren.length + completedSessions.length;

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
          setCompletedSessions(data ? Object.values(data) : []);
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

    const childId = Date.now();
    const newChild: Child = {
      id: childId,
      name: newChildName,
      age: parseInt(newChildAge),
      parentName: newChildParentName,
      phoneNumber: newChildPhoneNumber,
      game: selectedGame,
      checkInTime: Date.now(),
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
    const durationHours = durationMs / (1000 * 60 * 60);

    const gameDetails = games.find((g) => g.name === child.game);
    const cost = durationHours * (gameDetails?.hourly_rate || 0);

    const completedSession: CompletedSession = {
        ...child,
        checkOutTime,
        durationMs,
        cost,
    };
    
    try {
        await set(ref(db, `sessions/completed/${child.id}`), completedSession);
        await set(ref(db, `sessions/active/${child.id}`), null); // Remove from active
        
        setReceiptDetails({
            name: child.name,
            duration: formatDuration(durationMs),
            cost: `ج.م ${cost.toFixed(2)}`,
        });

        setShowReceipt(true);
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الخروج', variant: 'destructive'})
    }

  };
  
  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-2xl font-bold">تتبع الأطفال</h1>
        </div>
       <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="الأطفال النشطون حاليًا"
          value={activeChildren.length.toString()}
          icon={Activity}
          description="عدد الأطفال الموجودين في منطقة اللعب الآن."
        />
        <StatCard
          title="إجمالي زوار اليوم"
          value={totalVisitors.toString()}
          icon={Users}
          description="مجموع الأطفال الذين دخلوا اليوم."
        />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
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
                        {games.map((game) => (
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
                    <TableHead>مدة اللعب</TableHead>
                    <TableHead>إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeChildren.length > 0 ? (
                    activeChildren.map((child) => (
                        <TableRow key={child.id}>
                        <TableCell className="font-medium">{child.name}</TableCell>
                        <TableCell>{child.game}</TableCell>
                        <TableCell>
                            <TimeCounter startTime={child.checkInTime} />
                        </TableCell>
                        <TableCell>
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCheckOut(child)}
                            >
                            <Square className="me-2 h-4 w-4" />
                            خروج
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center">
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
      <Card>
          <CardHeader>
            <CardTitle>سجل الجلسات المنتهية</CardTitle>
            <CardDescription>
              عرض تفصيلي لجميع جلسات اللعب التي تم إجراؤها.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الطفل</TableHead>
                  <TableHead>اسم ولي الأمر</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>اللعبة</TableHead>
                  <TableHead>مدة اللعب</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>وقت الخروج</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedSessions.length > 0 ? (
                  completedSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>{session.parentName}</TableCell>
                      <TableCell>{session.phoneNumber}</TableCell>
                      <TableCell>{session.game}</TableCell>
                      <TableCell>{formatDuration(session.durationMs)}</TableCell>
                      <TableCell>{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                      <TableCell>{new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      لا توجد جلسات منتهية حتى الآن.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إيصال الدفع</DialogTitle>
            <DialogDescription>
              تفاصيل جلسة اللعب للطفل {receiptDetails.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">اسم الطفل</span>
              <span className="font-medium">{receiptDetails.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">مدة اللعب</span>
              <span className="font-medium">{receiptDetails.duration}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>المبلغ الإجمالي</span>
              <span>{receiptDetails.cost}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>إغلاق</Button>
            <Button>
              <Printer className="me-2 h-4 w-4" />
              طباعة الإيصال
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

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
import { PlayCircle, Square, Printer } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

interface Child {
  id: number;
  name: string;
  age: number;
  game: string;
  checkInTime: number;
}

const games = [
  { name: 'منطقة الألعاب اللينة', rate: 50 },
  { name: 'حلبة الترامبولين', rate: 75 },
  { name: 'جدار التسلق', rate: 60 },
];

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

function TrackingContent() {
  const [activeChildren, setActiveChildren] = useState<Child[]>([]);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState({
    name: '',
    duration: '',
    cost: '',
  });
  const { toast } = useToast();

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName || !newChildAge || !selectedGame) {
      toast({
        title: 'خطأ',
        description: 'الرجاء تعبئة جميع الحقول لتسجيل الدخول.',
        variant: 'destructive',
      });
      return;
    }

    const newChild: Child = {
      id: Date.now(),
      name: newChildName,
      age: parseInt(newChildAge),
      game: selectedGame,
      checkInTime: Date.now(),
    };

    setActiveChildren([...activeChildren, newChild]);
    setNewChildName('');
    setNewChildAge('');
    setSelectedGame('');
    toast({
      title: 'تم تسجيل الدخول بنجاح',
      description: `تم تسجيل دخول الطفل ${newChild.name}.`,
    });
  };

  const handleCheckOut = (child: Child) => {
    const checkOutTime = Date.now();
    const durationMs = checkOutTime - child.checkInTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    const gameDetails = games.find((g) => g.name === child.game);
    const cost = durationHours * (gameDetails?.rate || 0);

    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    setReceiptDetails({
      name: child.name,
      duration: `${hours} ساعة و ${minutes} دقيقة`,
      cost: `ج.م ${cost.toFixed(2)}`,
    });

    setShowReceipt(true);
    setActiveChildren(activeChildren.filter((c) => c.id !== child.id));
  };
  
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>تسجيل دخول طفل جديد</CardTitle>
            <CardDescription>
              أدخل تفاصيل الطفل لبدء جلسة اللعب.
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
                <Label htmlFor="game-select">اختر اللعبة</Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger id="game-select">
                    <SelectValue placeholder="اختر لعبة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.name} value={game.name}>
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
            <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <TrackingContent />
            </main>
            </div>
        </SidebarProvider>
    );
}
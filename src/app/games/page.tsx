
'use client';

import { useState } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Game } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

function AddGameDialog({ open, onOpenChange, onAddGame }: { open: boolean; onOpenChange: (open: boolean) => void; onAddGame: (game: Omit<Game, 'id'>) => void; }) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [fractionalRate, setFractionalRate] = useState('');
    const [branch, setBranch] = useState('');
    const [status, setStatus] = useState<'Available' | 'Maintenance'>('Available');

    const handleAddGameClick = () => {
        if (!name || !hourlyRate || !fractionalRate || !branch || !status) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول.",
                variant: "destructive",
            });
            return;
        }

        const newGame: Omit<Game, 'id'> = {
            name,
            hourly_rate: parseFloat(hourlyRate),
            fractional_rate: parseFloat(fractionalRate),
            branch,
            status,
            image: 'https://placehold.co/64x64.png',
        };
        onAddGame(newGame);
        toast({
            title: "تمت الإضافة بنجاح",
            description: `تمت إضافة لعبة "${name}" إلى القائمة.`,
        });
        // Reset fields
        setName('');
        setHourlyRate('');
        setFractionalRate('');
        setBranch('');
        setStatus('Available');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة لعبة جديدة</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل اللعبة الجديدة هنا. انقر على "إضافة" عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            الاسم
                        </Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="اسم اللعبة" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hourly_rate" className="text-right">
                            سعر/ساعة
                        </Label>
                        <Input id="hourly_rate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="col-span-3" placeholder="e.g. 100" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fractional_rate" className="text-right">
                            سعر/نصف ساعة
                        </Label>
                        <Input id="fractional_rate" type="number" value={fractionalRate} onChange={(e) => setFractionalRate(e.target.value)} className="col-span-3" placeholder="e.g. 50" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right">
                            الفرع
                        </Label>
                        <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="col-span-3" placeholder="e.g. فرع الرياض" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            الحالة
                        </Label>
                         <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Available">متاح</SelectItem>
                                <SelectItem value="Maintenance">صيانة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            إلغاء
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddGameClick}>إضافة اللعبة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GamesContent() {
    const { games } = useFirebase();
    const { toast } = useToast();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    const handleAddGame = async (newGame: Omit<Game, 'id'>) => {
        try {
            const gamesRef = ref(db, 'games');
            const newGameRef = push(gamesRef);
            await set(newGameRef, newGame);
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم إضافة اللعبة",
                variant: 'destructive'
            })
        }
    };
    
    const handleDeleteGame = async (gameId: string) => {
        try {
            await remove(ref(db, `games/${gameId}`));
            toast({
                title: "نجاح",
                description: "تم حذف اللعبة بنجاح",
            })
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم حذف اللعبة",
                variant: 'destructive'
            })
        }
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الألعاب</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              إضافة لعبة
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الألعاب</CardTitle>
          <CardDescription>
            إدارة الألعاب المتاحة في مناطق اللعب الخاصة بك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">صورة اللعبة</span>
                </TableHead>
                <TableHead>اسم اللعبة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="hidden md:table-cell">
                  السعر/ساعة
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  السعر/نصف ساعة
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  الفروع المتاحة
                </TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="hidden sm:table-cell">
                     <Image
                      alt="صورة اللعبة"
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={game.image}
                      width="64"
                      data-ai-hint="kids playground"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                     <Link href={`/games/${encodeURIComponent(game.name)}`} className="hover:underline">
                        {game.name}
                     </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={game.status === 'Available' ? 'default' : 'destructive'} className={game.status === 'Available' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}>
                      {game.status === 'Available' ? 'متاح' : 'صيانة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {`ج.م${game.hourly_rate}`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {`ج.م${game.fractional_rate || (game.hourly_rate / 2)}`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {game.branch}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">تبديل القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem>تعديل</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteGame(game.id)}>حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddGameDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddGame={handleAddGame} />
    </div>
  );
}

export default function GamesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <GamesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

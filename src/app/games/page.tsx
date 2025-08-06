
'use client';

import { useState, useEffect } from 'react';
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
import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/components/AuthProvider';


function GameFormDialog({ 
    open, 
    onOpenChange, 
    onSubmit,
    isEditMode,
    initialData
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSubmit: (game: Omit<Game, 'id'> | Game) => void; 
    isEditMode: boolean;
    initialData: Game | null;
}) {
    const { toast } = useToast();
    const { branches, employees, gameCategories } = useFirebase();
    const { user } = useAuth();
    const currentUser = employees.find(e => e.username === user?.username);

    const [name, setName] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [branch, setBranch] = useState('');
    const [status, setStatus] = useState<'Available' | 'Maintenance'>('Available');
    const [categoryId, setCategoryId] = useState('');
    
    useEffect(() => {
        if (isEditMode && initialData) {
            setName(initialData.name);
            setHourlyRate(String(initialData.hourly_rate));
            setBranch(initialData.branch);
            setStatus(initialData.status);
            setCategoryId(initialData.categoryId || '');
        } else {
            setName('');
            setHourlyRate('');
            if (currentUser && currentUser.branch !== 'كل الفروع') {
                setBranch(currentUser.branch);
            } else {
                setBranch('');
            }
            setStatus('Available');
            setCategoryId('');
        }
    }, [initialData, isEditMode, open, currentUser]);

    const handleSubmit = () => {
        if (!name || !hourlyRate || !branch || !status || !categoryId) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول.",
                variant: "destructive",
            });
            return;
        }

        const category = gameCategories.find(c => c.id === categoryId);

        const gameData: Omit<Game, 'id'> | Game = {
            ...(isEditMode && initialData ? { id: initialData.id } : {}),
            name,
            hourly_rate: parseFloat(hourlyRate),
            branch,
            status,
            categoryId,
            categoryName: category?.name || '',
            image: initialData?.image || 'https://placehold.co/64x64.png',
        };
        onSubmit(gameData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل بيانات اللعبة' : 'إضافة لعبة جديدة'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'قم بتحديث تفاصيل اللعبة.' : 'أدخل تفاصيل اللعبة الجديدة هنا. انقر على "حفظ" عند الانتهاء.'}
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
                        <Label htmlFor="category" className="text-right">
                            التصنيف
                        </Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر التصنيف" />
                            </SelectTrigger>
                            <SelectContent>
                                {gameCategories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="hourly_rate" className="text-right">
                            السعر/ساعة
                        </Label>
                        <Input id="hourly_rate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="col-span-3" placeholder="e.g. 100" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right">
                            الفرع
                        </Label>
                        <Select value={branch} onValueChange={setBranch} disabled={currentUser?.branch !== 'كل الفروع'}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="كل الفروع">كل الفروع</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                    <Button type="button" onClick={handleSubmit}>{isEditMode ? 'حفظ التغييرات' : 'إضافة اللعبة'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GamesContent() {
    const { games } = useFirebase();
    const { toast } = useToast();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    const handleAddGame = async (newGameData: Omit<Game, 'id'>) => {
        try {
            const gamesRef = ref(db, 'games');
            const newGameRef = push(gamesRef);
            await set(newGameRef, newGameData);
            toast({
                title: "تمت الإضافة بنجاح",
                description: `تمت إضافة لعبة "${newGameData.name}" إلى القائمة.`,
            });
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم إضافة اللعبة",
                variant: 'destructive'
            })
        }
    };
    
    const handleEditGame = async (gameToUpdate: Game) => {
        try {
            const gameRef = ref(db, `games/${gameToUpdate.id}`);
            const { id, ...gameData } = gameToUpdate;
            await update(gameRef, gameData);
            toast({
                title: "تم التعديل بنجاح",
                description: `تم تحديث بيانات اللعبة "${gameToUpdate.name}".`,
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "خطأ في التعديل",
                description: "لم يتم تحديث بيانات اللعبة.",
                variant: 'destructive',
            });
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
    
    const openForm = (game?: Game) => {
        if (game) {
            setIsEditMode(true);
            setSelectedGame(game);
        } else {
            setIsEditMode(false);
            setSelectedGame(null);
        }
        setFormOpen(true);
    };

    const handleFormSubmit = (gameData: Omit<Game, 'id'> | Game) => {
        if (isEditMode) {
            handleEditGame(gameData as Game);
        } else {
            handleAddGame(gameData as Omit<Game, 'id'>);
        }
    };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الألعاب</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
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
                <TableHead className="text-right">اسم اللعبة</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  السعر/ساعة
                </TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  الفروع المتاحة
                </TableHead>
                <TableHead className="text-center">
                  <span>الإجراءات</span>
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
                  <TableCell className="font-medium text-right">
                     <Link href={`/games/${encodeURIComponent(game.name)}`} className="hover:underline">
                        {game.name}
                     </Link>
                  </TableCell>
                  <TableCell className="text-right">{game.categoryName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={game.status === 'Available' ? 'default' : 'destructive'} className={game.status === 'Available' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}>
                      {game.status === 'Available' ? 'متاح' : 'صيانة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {`ج.م${game.hourly_rate}`}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {game.branch}
                  </TableCell>
                  <TableCell className="text-center">
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
                        <DropdownMenuItem onClick={() => openForm(game)}>تعديل</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">حذف</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف اللعبة بشكل دائم.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteGame(game.id)}>متابعة</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GameFormDialog 
        open={isFormOpen} 
        onOpenChange={setFormOpen} 
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedGame}
      />
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

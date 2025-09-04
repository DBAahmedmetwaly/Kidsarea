
'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
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
import { Skeleton } from '@/components/ui/skeleton';

const GameFormDialog = dynamic(() => import('./_components/GameFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});


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
                <TableHead className="text-right">اسم اللعبة</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  نموذج الدفع
                </TableHead>
                <TableHead className="hidden md:table-cell text-right">
                  السعر/الباقات
                </TableHead>
                <TableHead className="text-center">
                  <span>الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
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
                    <Badge variant="secondary">
                        {game.paymentModel === 'postpaid' ? 'دفع آجل (بالساعة)' : 'دفع مسبق (باقة)'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right font-semibold">
                     {game.paymentModel === 'postpaid' ? `ج.م ${game.price?.toFixed(2) || '0.00'}` : `${game.fixedTimePackages?.length || 0} باقات`}
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
      {isFormOpen && <GameFormDialog 
        open={isFormOpen} 
        onOpenChange={setFormOpen} 
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedGame}
      />}
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

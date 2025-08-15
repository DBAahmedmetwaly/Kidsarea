
'use client';

import { useParams } from 'next/navigation';
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
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function GameDetailsContent() {
  const params = useParams();
  const gameName = decodeURIComponent(params.gameName as string);
  const { completedSessions } = useSession();
  const { games } = useFirebase();

  const game = games.find((g) => g.name === gameName);
  const gameSessions = completedSessions.filter(
    (session) => session.game === gameName
  );

  if (!game) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-2xl font-bold">اللعبة غير موجودة</h1>
            <p className="text-muted-foreground">
                اللعبة التي تبحث عنها غير موجودة.
            </p>
            <Link href="/games" className="mt-4 text-primary hover:underline flex items-center gap-1">
                <ArrowRight className="h-4 w-4" />
                العودة إلى قائمة الألعاب
            </Link>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <div>
                 <h1 className="text-2xl md:text-3xl font-bold">{game.name}</h1>
                 <div className="flex items-center gap-2 mt-2">
                    <Badge variant={game.status === 'Available' ? 'default' : 'destructive'} className={game.status === 'Available' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}>
                        {game.status === 'Available' ? 'متاح' : 'صيانة'}
                    </Badge>
                     {game.paymentModel === 'postpaid' && (
                        <span className="text-muted-foreground">{`السعر: ج.م${game.price}/ساعة`}</span>
                     )}
                       {game.paymentModel === 'prepaid' && (
                        <span className="text-muted-foreground">{`السعر: ج.م${game.price} للباقة`}</span>
                     )}
                 </div>
            </div>

        </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل حركات اللعبة</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع جلسات اللعب التي تمت على {game.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الطفل</TableHead>
                <TableHead>اسم ولي الأمر</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>مدة اللعب</TableHead>
                <TableHead>التكلفة</TableHead>
                <TableHead>وقت الخروج</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gameSessions.length > 0 ? (
                gameSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.children.map(c => c.name).join(', ')}</TableCell>
                    <TableCell>{session.parentName}</TableCell>
                    <TableCell>{session.branchName}</TableCell>
                    <TableCell>{formatDuration(session.durationMs)}</TableCell>
                    <TableCell>{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                    <TableCell>
                      {new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    لا توجد جلسات مسجلة لهذه اللعبة حتى الآن.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GameDetailsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <GameDetailsContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

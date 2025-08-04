
'use client';

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
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { games } from '@/lib/data';

function GamesContent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الألعاب</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1">
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
                  الفروع المتاحة
                </TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.name}>
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
                        <DropdownMenuItem>حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GamesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <GamesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

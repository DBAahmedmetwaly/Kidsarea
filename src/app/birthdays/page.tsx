
'use client';

import { useState, useMemo } from 'react';
import { useCustomers } from '@/context/CustomerContext';
import { format, parseISO, getMonth, getDate, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Cake } from 'lucide-react';
import type { CustomerChild } from '@/lib/types';


function BirthdaysContent() {
    const { customers } = useCustomers();
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
    const [toDate, setToDate] = useState<Date | undefined>(addMonths(new Date(), 2));

    const upcomingBirthdays = useMemo(() => {
        if (!fromDate || !toDate) return [];

        const start = { month: getMonth(fromDate) + 1, day: getDate(fromDate) };
        const end = { month: getMonth(toDate) + 1, day: getDate(toDate) };
        
        const allChildren: (CustomerChild & { parentName: string, phoneNumber: string })[] = [];
        customers.forEach(c => {
            if(c.children) {
                c.children.forEach(child => {
                    if(child.birthdate) {
                        allChildren.push({ ...child, parentName: c.parentName, phoneNumber: c.phoneNumber });
                    }
                })
            }
        });

        return allChildren.filter(child => {
            if (!child.birthdate) return false;
            try {
                const birthdate = parseISO(child.birthdate);
                const birth = { month: getMonth(birthdate) + 1, day: getDate(birthdate) };
                
                // Handle date range spanning across the year end
                if (start.month > end.month || (start.month === end.month && start.day > end.day)) {
                    // Range is like Dec 15 to Jan 15
                    return (birth.month > start.month || (birth.month === start.month && birth.day >= start.day)) ||
                           (birth.month < end.month || (birth.month === end.month && birth.day <= end.day));
                } else {
                     // Range is within the same year, e.g., Jan 15 to Feb 15
                    return (birth.month > start.month || (birth.month === start.month && birth.day >= start.day)) &&
                           (birth.month < end.month || (birth.month === end.month && birth.day <= end.day));
                }
            } catch (e) {
                return false;
            }
        });

    }, [customers, fromDate, toDate]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <Cake className="h-8 w-8 text-primary" />
                <h1 className="text-lg font-semibold md:text-2xl">تقرير أعياد الميلاد</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>أعياد الميلاد القادمة</CardTitle>
                    <CardDescription>عرض أعياد ميلاد الأطفال في فترة محددة للتواصل مع أولياء الأمور وتقديم العروض.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>اختر تاريخ البداية</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground">إلى</span>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP", { locale: ar }) : <span>اختر تاريخ النهاية</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
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

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">اسم الطفل</TableHead>
                                <TableHead className="text-right">ولي الأمر</TableHead>
                                <TableHead className="text-center">رقم الهاتف</TableHead>
                                <TableHead className="text-center">تاريخ الميلاد</TableHead>
                                <TableHead className="text-center">العمر القادم</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((child, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium text-right">{child.name}</TableCell>
                                    <TableCell className="text-right">{child.parentName}</TableCell>
                                    <TableCell className="text-center">{child.phoneNumber}</TableCell>
                                    <TableCell className="text-center">{format(parseISO(child.birthdate!), "d MMMM", { locale: ar })}</TableCell>
                                    <TableCell className="text-center">{(new Date().getFullYear() - parseISO(child.birthdate!).getFullYear()) + 1}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        {(fromDate && toDate) ? "لا توجد أعياد ميلاد في هذه الفترة." : "يرجى تحديد فترة زمنية."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}


export default function BirthdaysPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <BirthdaysContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

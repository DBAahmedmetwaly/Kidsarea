
'use client';

import { useState, useMemo } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Users, Activity, Wallet, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import type { CompletedSession } from '@/lib/types';


const revenueChartConfig = {
  revenue: {
    label: 'الإيرادات',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const visitorsChartConfig = {
  visitors: {
    label: 'الزوار',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

function DashboardContent() {
    const { completedSessions, activeChildren } = useSession();
    const { branches, employees, games } = useFirebase();

    const [selectedBranch, setSelectedBranch] = useState('all');
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    const filteredData = useMemo(() => {
        const branchGames = selectedBranch === 'all' 
            ? games.map(g => g.name) 
            : games.filter(g => g.branch === selectedBranch).map(g => g.name);

        const range = date?.from && date.to ? { start: startOfDay(date.from), end: endOfDay(date.to) } : null;

        const sessions = completedSessions.filter(session => {
            const isBranchMatch = branchGames.includes(session.game);
            if (!range) return isBranchMatch;
            const sessionDate = new Date(session.checkOutTime);
            return isBranchMatch && isWithinInterval(sessionDate, range);
        });

        const active = activeChildren.filter(child => branchGames.includes(child.game));
        
        return { sessions, active };

    }, [completedSessions, activeChildren, games, selectedBranch, date]);

    const stats = useMemo(() => {
        const totalRevenue = filteredData.sessions.reduce((acc, s) => acc + s.cost, 0);
        const totalVisitors = filteredData.sessions.length;
        const activeNow = filteredData.active.length;
        
        const todayRange = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
        const revenueToday = completedSessions
            .filter(s => {
                 const isBranchMatch = selectedBranch === 'all' || games.find(g => g.name === s.game)?.branch === selectedBranch;
                 return isBranchMatch && isWithinInterval(new Date(s.checkOutTime), todayRange);
            })
            .reduce((acc, s) => acc + s.cost, 0);

        return { totalRevenue, totalVisitors, activeNow, revenueToday };
    }, [filteredData, completedSessions, selectedBranch, games]);

    const chartData = useMemo(() => {
        if (!date?.from || !date.to) return [];

        const intervalDays = eachDayOfInterval({
            start: date.from,
            end: date.to,
        });

        const branchGames = selectedBranch === 'all' 
            ? games.map(g => g.name) 
            : games.filter(g => g.branch === selectedBranch).map(g => g.name);

        return intervalDays.map(day => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);
            const dayInterval = { start: dayStart, end: dayEnd };
            
            const daySessions = completedSessions.filter(session => {
                 const isBranchMatch = branchGames.includes(session.game);
                 return isBranchMatch && isWithinInterval(new Date(session.checkOutTime), dayInterval);
            });

            return {
                date: format(day, 'MMM d', { locale: ar }),
                revenue: daySessions.reduce((sum, s) => sum + s.cost, 0),
                visitors: daySessions.length,
            };
        });

    }, [completedSessions, selectedBranch, games, date]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                 <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <h1 className="text-lg font-semibold md:text-2xl">لوحة التحكم</h1>
                <div className="ms-auto flex items-center gap-2 w-full sm:w-auto">
                    {/* Filters will be in a separate card now */}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>الفلاتر</CardTitle>
                    <CardDescription>استخدم الفلاتر أدناه لتخصيص البيانات المعروضة في لوحة التحكم.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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
                     <div className="space-y-2 lg:col-span-2">
                        <label className="text-sm font-medium">النطاق الزمني</label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {date?.from ? (
                                date.to ? (
                                    <>
                                    {format(date.from, "PPP", { locale: ar })} -{" "}
                                    {format(date.to, "PPP", { locale: ar })}
                                    </>
                                ) : (
                                    format(date.from, "PPP", { locale: ar })
                                )
                                ) : (
                                <span>اريده من تاريخ إلى تاريخ</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="إجمالي الإيرادات"
                value={`ج.م ${stats.totalRevenue.toFixed(2)}`}
                icon={DollarSign}
                description={date?.from && date?.to ? `في الفترة المحددة` : ''}
            />
            <StatCard
                title="إجمالي الزوار"
                value={`${stats.totalVisitors}`}
                icon={Users}
                description={date?.from && date?.to ? `في الفترة المحددة` : ''}
            />
            <StatCard
                title="الأطفال النشطون حاليًا"
                value={`${stats.activeNow}`}
                icon={Activity}
                description={selectedBranch === 'all' ? `في كل الفروع` : `في ${selectedBranch}`}
            />
            <StatCard
                title="إيرادات اليوم"
                value={`ج.م ${stats.revenueToday.toFixed(2)}`}
                icon={Wallet}
                description="يشمل جميع الفروع"
            />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                <CardTitle>الإيرادات في الفترة المحددة</CardTitle>
                </CardHeader>
                <CardContent>
                <ChartContainer config={revenueChartConfig} className="h-64 w-full">
                    <BarChart accessibilityLayer data={chartData} dir="ltr">
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tickFormatter={(value) => `ج.م${value / 1000}k`}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                    </BarChart>
                </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>الزوار في الفترة المحددة</CardTitle>
                </CardHeader>
                <CardContent>
                <ChartContainer config={visitorsChartConfig} className="h-64 w-full">
                    <BarChart accessibilityLayer data={chartData} dir="ltr">
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4} />
                    </BarChart>
                </ChartContainer>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}

function WithSidebar() {
  return (
    <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <DashboardContent />
          </main>
        </div>
    </SidebarProvider>
  );
}


export default function DashboardPage() {
    return <WithSidebar />;
}


'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Tooltip, PieChart, Pie } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useCustomers } from '@/context/CustomerContext';
import { useMemo, useState } from 'react';
import { getHours, format, startOfDay, endOfDay, isWithinInterval, parseISO, getMonth, getDate } from 'date-fns';
import { Subscription, CustomerChild } from '@/lib/types';
import { ar } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Cake } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const gameProfitChartConfig = {
  profit: {
    label: 'الربح',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const employeeIncomeChartConfig = {
    income: {
      label: 'صافي الدخل',
      color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

const peakHoursChartConfig = {
    visitors: {
        label: 'الزوار',
        color: 'hsl(var(--chart-3))',
    },
} satisfies ChartConfig;

const branchRevenueChartConfig = {
    revenue: {
        label: 'الإيرادات',
        color: 'hsl(var(--chart-4))',
    },
} satisfies ChartConfig;

const topCustomersChartConfig = {
    visits: {
        label: 'الزيارات',
        color: 'hsl(var(--chart-5))',
    },
} satisfies ChartConfig;


function BirthdayReport() {
    const { customers } = useCustomers();
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();

    const upcomingBirthdays = useMemo(() => {
        if (!fromDate || !toDate) return [];

        const start = { month: getMonth(fromDate) + 1, day: getDate(fromDate) };
        const end = { month: getMonth(toDate) + 1, day: getDate(toDate) };
        
        const allChildren: (CustomerChild & { parentName: string })[] = [];
        customers.forEach(c => {
            c.children.forEach(child => {
                if(child.birthdate) {
                    allChildren.push({ ...child, parentName: c.parentName });
                }
            })
        });

        return allChildren.filter(child => {
            const birthdate = parseISO(child.birthdate as string);
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
        });

    }, [customers, fromDate, toDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>تقرير أعياد الميلاد القادمة</CardTitle>
                <CardDescription>عرض أعياد ميلاد الأطفال في فترة محددة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-[280px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
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
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-[280px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}
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
                            <TableHead>اسم الطفل</TableHead>
                            <TableHead>ولي الأمر</TableHead>
                            <TableHead>تاريخ الميلاد</TableHead>
                            <TableHead>العمر القادم</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((child, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{child.name}</TableCell>
                                <TableCell>{child.parentName}</TableCell>
                                <TableCell>{format(parseISO(child.birthdate!), "d MMMM", { locale: ar })}</TableCell>
                                <TableCell>{(new Date().getFullYear() - parseISO(child.birthdate!).getFullYear()) + 1}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    {(fromDate && toDate) ? "لا توجد أعياد ميلاد في هذه الفترة." : "يرجى تحديد فترة زمنية."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function ReportsContent() {
    const { completedSessions } = useSession();
    const { games, employees, branches, subscriptions } = useFirebase();
    const { customers } = useCustomers();

    const gameProfitData = useMemo(() => {
        const profitByGame: { [key: string]: number } = {};

        games.forEach(game => {
            profitByGame[game.name] = 0;
        });

        completedSessions.forEach(session => {
            if (profitByGame[session.game] !== undefined) {
                profitByGame[session.game] += session.cost;
            }
        });
        
        return Object.entries(profitByGame).map(([name, profit]) => ({
            name,
            profit,
        })).filter(item => item.profit > 0);
    }, [completedSessions, games]);

    const employeeIncomeData = useMemo(() => {
        const incomeByEmployee: { [key: string]: number } = {};
        const cashiers = employees.filter(e => e.role === 'كاشير');

        cashiers.forEach(emp => {
            if (emp.username) {
                incomeByEmployee[emp.username] = 0;
            }
        });

        // Add income from completed sessions
        completedSessions.forEach(session => {
            if (incomeByEmployee[session.cashierUsername] !== undefined) {
                incomeByEmployee[session.cashierUsername] += session.cost;
            }
        });
        
        // Add income from subscriptions
        subscriptions.forEach(sub => {
            if (incomeByEmployee[sub.cashierUsername] !== undefined) {
                incomeByEmployee[sub.cashierUsername] += sub.price;
            }
        })

        return Object.entries(incomeByEmployee).map(([username, income]) => {
            const employee = employees.find(e => e.username === username);
            return {
                name: employee?.name || username,
                income,
            };
        }).filter(item => item.income > 0);
    }, [completedSessions, employees, subscriptions]);
    
    const peakHoursData = useMemo(() => {
        const visitsByHour: { [key: number]: number } = {};
        for(let i=0; i < 24; i++){
            visitsByHour[i] = 0;
        }

        completedSessions.forEach(session => {
            const hour = getHours(new Date(session.checkInTime));
            visitsByHour[hour]++;
        });

        return Object.entries(visitsByHour).map(([hour, visitors]) => ({
            hour: `${parseInt(hour) % 12 || 12} ${parseInt(hour) >= 12 ? 'PM' : 'AM'}`,
            visitors,
        }));
    }, [completedSessions]);


    const branchRevenueData = useMemo(() => {
        const revenueByBranch: { [key: string]: number } = {};

        branches.forEach(branch => {
            revenueByBranch[branch.name] = 0;
        });

        completedSessions.forEach(session => {
            const game = games.find(g => g.name === session.game);
            if(game && revenueByBranch[game.branch] !== undefined) {
                revenueByBranch[game.branch] += session.cost;
            }
        });

        return Object.entries(revenueByBranch).map(([name, revenue]) => ({
            name,
            revenue
        })).filter(item => item.revenue > 0);
    }, [completedSessions, games, branches]);

    const topCustomersData = useMemo(() => {
        const visitsByCustomer: { [key: string]: number } = {};
        
        completedSessions.forEach(session => {
            visitsByCustomer[session.parentName] = (visitsByCustomer[session.parentName] || 0) + 1;
        });

        return Object.entries(visitsByCustomer)
            .map(([name, visits]) => ({ name, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10); // Top 10 customers

    }, [completedSessions]);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">التقارير</h1>
      </div>

      <BirthdayReport />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>تقرير أرباح الألعاب</CardTitle>
            <CardDescription>عرض إجمالي الأرباح لكل لعبة بناءً على الجلسات المسجلة.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={gameProfitChartConfig} className="h-72 w-full">
              <BarChart accessibilityLayer data={gameProfitData} dir="ltr" margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 10) + (value.length > 10 ? '...' : '')}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => `ج.م${value.toFixed(0)}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" formatter={(value) => `ج.م ${Number(value).toFixed(2)}`} />}
                />
                <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تقرير صافي دخل الموظفين</CardTitle>
            <CardDescription>عرض صافي الدخل الناتج عن كل كاشير (شامل مبيعات الاشتراكات).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={employeeIncomeChartConfig} className="h-72 w-full">
              <BarChart accessibilityLayer data={employeeIncomeData} dir="ltr" margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.split(' ')[0]}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => `ج.م${value / 1000}k`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" formatter={(value) => `ج.م ${Number(value).toFixed(2)}`} />}
                />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>تقرير أوقات الذروة</CardTitle>
                <CardDescription>تحليل عدد الزوار على مدار ساعات اليوم لتحديد أوقات الذروة.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={peakHoursChartConfig} className="h-72 w-full">
                    <LineChart accessibilityLayer data={peakHoursData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }} dir="ltr">
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip content={<ChartTooltipContent indicator='dot' />} />
                        <Line type="monotone" dataKey="visitors" stroke="var(--color-visitors)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>تقرير إيرادات الفروع</CardTitle>
                <CardDescription>مقارنة إجمالي الإيرادات بين جميع الفروع.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={branchRevenueChartConfig} className="h-72 w-full">
                    <BarChart accessibilityLayer data={branchRevenueData} dir="ltr" margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.replace('فرع ', '').slice(0,10)}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => `ج.م${value / 1000}k`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" formatter={(value) => `ج.م ${Number(value).toFixed(2)}`} />}
                        />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>تقرير العملاء الأكثر زيارة</CardTitle>
                <CardDescription>عرض العملاء الأكثر زيارة بناءً على عدد الجلسات المسجلة.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={topCustomersChartConfig} className="h-72 w-full">
                    <BarChart accessibilityLayer data={topCustomersData} layout="vertical" dir="ltr" margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                        <CartesianGrid horizontal={false} />
                         <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 15)}
                        />
                        <XAxis dataKey="visits" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default function ReportsPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <ReportsContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

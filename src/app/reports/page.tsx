
'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useMemo } from 'react';

const employeeIncomeData = [
    { name: 'عبدالله الأحمد', income: 3200 },
    { name: 'مريم القحطاني', income: 2800 },
    { name: 'يوسف الزهراني', income: 2650 },
    { name: 'نورة الشمري', income: 4100 },
];

const peakHoursData = [
  { hour: '10 AM', visitors: 15 },
  { hour: '11 AM', visitors: 25 },
  { hour: '12 PM', visitors: 40 },
  { hour: '1 PM', visitors: 35 },
  { hour: '2 PM', visitors: 50 },
  { hour: '3 PM', visitors: 65 },
  { hour: '4 PM', visitors: 80 },
  { hour: '5 PM', visitors: 90 },
  { hour: '6 PM', visitors: 110 },
  { hour: '7 PM', visitors: 100 },
  { hour: '8 PM', visitors: 75 },
  { hour: '9 PM', visitors: 50 },
];

const branchRevenueData = [
  { name: 'فرع الرياض بارك', revenue: 45000 },
  { name: 'فرع جدة مول', revenue: 62000 },
  { name: 'فرع الدمام سيتي سنتر', revenue: 38000 },
  { name: 'فرع مكة هيلتون', revenue: 75000 },
];

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

function ReportsContent() {
    const { completedSessions } = useSession();
    const { games } = useFirebase();

    const gameProfitData = useMemo(() => {
        const profitByGame: { [key: string]: number } = {};

        // Initialize with all games having 0 profit
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
        }));
    }, [completedSessions, games]);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">التقارير</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>تقرير أرباح الألعاب</CardTitle>
            <CardDescription>عرض إجمالي الأرباح لكل لعبة بناءً على الجلسات المسجلة.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={gameProfitChartConfig} className="h-72 w-full">
              <BarChart accessibilityLayer data={gameProfitData} dir="ltr">
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 10)}
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
            <CardDescription>عرض صافي الدخل الناتج عن كل موظف.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={employeeIncomeChartConfig} className="h-72 w-full">
              <BarChart accessibilityLayer data={employeeIncomeData} dir="ltr">
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
                  content={<ChartTooltipContent indicator="dot" />}
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
                    <BarChart accessibilityLayer data={branchRevenueData} dir="ltr">
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
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
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

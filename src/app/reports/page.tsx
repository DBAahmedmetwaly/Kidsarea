'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const gameProfitData = [
  { name: 'الألعاب اللينة', profit: 4500 },
  { name: 'الترامبولين', profit: 7800 },
  { name: 'جدار التسلق', profit: 5600 },
  { name: 'لعبة الليزر', profit: 9200 },
];

const employeeIncomeData = [
    { name: 'عبدالله الأحمد', income: 3200 },
    { name: 'مريم القحطاني', income: 2800 },
    { name: 'يوسف الزهراني', income: 2650 },
    { name: 'نورة الشمري', income: 4100 },
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

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold md:text-2xl">التقارير</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>تقرير أرباح الألعاب</CardTitle>
            <CardDescription>عرض إجمالي الأرباح لكل لعبة خلال فترة محددة.</CardDescription>
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
                  tickFormatter={(value) => `ج.م${value / 1000}k`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
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
      </div>
    </div>
  );
}

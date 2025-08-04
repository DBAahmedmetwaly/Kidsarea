'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Activity, Wallet } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

const revenueData = [
  { day: 'الاثنين', revenue: 1250 },
  { day: 'الثلاثاء', revenue: 1500 },
  { day: 'الأربعاء', revenue: 1750 },
  { day: 'الخميس', revenue: 2200 },
  { day: 'الجمعة', revenue: 3500 },
  { day: 'السبت', revenue: 4000 },
  { day: 'الأحد', revenue: 3000 },
];

const visitorsData = [
  { day: 'الاثنين', visitors: 80 },
  { day: 'الثلاثاء', visitors: 95 },
  { day: 'الأربعاء', visitors: 110 },
  { day: 'الخميس', visitors: 130 },
  { day: 'الجمعة', visitors: 200 },
  { day: 'السبت', visitors: 250 },
  { day: 'الأحد', visitors: 180 },
];

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

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الإيرادات"
          value="ج.م 14,200"
          icon={DollarSign}
          description="+20.1% من الشهر الماضي"
        />
        <StatCard
          title="إجمالي الزوار"
          value="+2,350"
          icon={Users}
          description="+180.1% من الشهر الماضي"
        />
        <StatCard
          title="الأطفال النشطون حاليًا"
          value="12"
          icon={Activity}
          description="في جميع الفروع"
        />
        <StatCard
          title="إيرادات اليوم"
          value="ج.م 850"
          icon={Wallet}
          description="+19% من الأمس"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات هذا الأسبوع</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={revenueData} dir="ltr">
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
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
            <CardTitle>الزوار هذا الأسبوع</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={visitorsChartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={visitorsData} dir="ltr">
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
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

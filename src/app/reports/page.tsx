

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
import { useMemo, useState, useEffect } from 'react';
import { getHours, format, startOfDay, endOfDay, isWithinInterval, parseISO, getMonth, getDate, addMonths } from 'date-fns';
import { Subscription, CustomerChild, CompletedSession, ShiftRecord, Game } from '@/lib/types';
import { ar } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Cake, Percent, TrendingDown, Users, FilterX, TrendingUp, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/AuthProvider';


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

const expenseByCategoryChartConfig = {
    amount: {
        label: 'المبلغ',
        color: 'hsl(var(--chart-1))',
    },
} satisfies ChartConfig;

function GamePackageReport({ sessions, games, selectedBranch, fromDate, toDate }: { sessions: CompletedSession[], games: Game[], selectedBranch: string, fromDate?: Date, toDate?: Date }) {
    
    const reportData = useMemo(() => {
        const packageGames = games.filter(g => 
            g.paymentModel === 'prepaid' && 
            g.fixedTimePackages && 
            g.fixedTimePackages.length > 0 &&
            (selectedBranch === 'all' || g.branch === selectedBranch || g.branch === 'كل الفروع')
        );
        
        const range = fromDate && toDate ? { start: startOfDay(fromDate), end: endOfDay(toDate) } : null;

        const filteredSessions = sessions.filter(s => {
            const isPackageSession = !!s.packageName;
            const dateMatch = range ? isWithinInterval(new Date(s.checkOutTime), range) : true;
            return isPackageSession && dateMatch;
        });

        const gameStats: { [gameName: string]: { totalUsage: number, packages: { [packageName: string]: number } } } = {};

        packageGames.forEach(game => {
            gameStats[game.name] = { totalUsage: 0, packages: {} };
            game.fixedTimePackages?.forEach(pkg => {
                gameStats[game.name].packages[pkg.label] = 0;
            });
        });

        filteredSessions.forEach(session => {
            if (gameStats[session.game] && session.packageName) {
                if (gameStats[session.game].packages[session.packageName] !== undefined) {
                    gameStats[session.game].packages[session.packageName]++;
                    gameStats[session.game].totalUsage++;
                }
            }
        });

        return Object.entries(gameStats)
            .map(([gameName, stats]) => {
                const packageDetails = Object.entries(stats.packages).map(([name, count]) => ({ name, count }));
                const mostUsedPackage = packageDetails.reduce((max, pkg) => pkg.count > max.count ? pkg : max, { name: '', count: -1 });
                return {
                    gameName,
                    totalUsage: stats.totalUsage,
                    packageDetails,
                    mostUsedPackageName: mostUsedPackage.count > 0 ? mostUsedPackage.name : null,
                };
            })
            .filter(game => game.totalUsage > 0);

    }, [sessions, games, selectedBranch, fromDate, toDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>تقرير استخدام باقات الألعاب</CardTitle>
                <CardDescription>تحليل شامل لعدد مرات استخدام كل باقة لكل لعبة، مع تحديد الباقة الأكثر استخدامًا.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">اسم اللعبة</TableHead>
                            <TableHead className="text-right">الباقة</TableHead>
                            <TableHead className="text-center">عدد مرات الاستخدام</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map((game, gameIndex) => (
                            game.packageDetails.map((pkg, pkgIndex) => (
                                <TableRow key={`${game.gameName}-${pkg.name}`}>
                                    {pkgIndex === 0 && (
                                        <TableCell rowSpan={game.packageDetails.length} className="font-bold align-top text-right">
                                            {game.gameName}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">{pkg.name}</TableCell>
                                    <TableCell className="text-center font-semibold">
                                        {pkg.count}
                                        {game.mostUsedPackageName === pkg.name && (
                                            <Star className="inline-block ms-2 h-4 w-4 text-yellow-500" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    لا توجد بيانات استخدام للباقات في الفترة المحددة.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function CashierPerformanceReport({ sessions, subscriptions, shiftRecords, selectedBranch, fromDate, toDate } : { sessions: CompletedSession[], subscriptions: Subscription[], shiftRecords: ShiftRecord[], selectedBranch: string, fromDate?: Date, toDate?: Date }) {
    const { employees } = useFirebase();
    
    const performanceData = useMemo(() => {
        const cashiers = employees.filter(emp => {
            const isCashierRole = emp.role === 'كاشير' || emp.role === 'مدير فرع' || emp.role === 'مدير فرع';
            if (!isCashierRole) return false;

            const isBranchMatch = selectedBranch === 'all' || emp.branch === selectedBranch || emp.branch === 'كل الفروع';
            return isCashierRole && isBranchMatch;
        });

        const range = fromDate && toDate ? { start: startOfDay(fromDate), end: endOfDay(toDate) } : null;

        return cashiers.map(cashier => {
            if (!cashier.username) {
                 return {
                    name: cashier.name,
                    totalIncome: 0,
                    totalDiscount: 0,
                    sessionCount: 0,
                    discountPercentage: 0,
                    averageSale: 0,
                    totalDifference: 0,
                };
            }
            
            const cashierSessions = sessions.filter(s => {
                const usernameMatch = s.cashierUsername === cashier.username;
                const dateMatch = range ? isWithinInterval(new Date(s.checkOutTime), range) : true;
                return usernameMatch && dateMatch;
            });
            const cashierSubs = subscriptions.filter(s => {
                const usernameMatch = s.cashierUsername === cashier.username;
                const dateMatch = range ? isWithinInterval(new Date(s.createdAt), range) : true;
                return usernameMatch && dateMatch;
            });

            const cashierShiftRecords = shiftRecords.filter(r => {
                const usernameMatch = r.cashierUsername === cashier.username;
                const dateMatch = range ? isWithinInterval(new Date(r.date), range) : true;
                return usernameMatch && dateMatch;
            })

            const totalSessionsIncome = cashierSessions.reduce((sum, s) => sum + s.cost, 0);
            const totalSubscriptionsIncome = cashierSubs.reduce((sum, s) => sum + s.price, 0);
            const totalIncome = totalSessionsIncome + totalSubscriptionsIncome;

            const totalDiscount = cashierSessions.reduce((sum, s) => sum + (s.discount || 0), 0);
            const totalRevenueBeforeDiscount = cashierSessions.reduce((sum, s) => sum + (s.costBeforeDiscount > 0 ? s.costBeforeDiscount : (s.cost + (s.discount || 0))), 0) + totalSubscriptionsIncome;
            const totalDifference = cashierShiftRecords.reduce((sum, r) => sum + r.difference, 0);

            const discountPercentage = totalRevenueBeforeDiscount > 0 ? (totalDiscount / totalRevenueBeforeDiscount) * 100 : 0;

            const sessionCount = cashierSessions.length + cashierSubs.length;
            const averageSale = sessionCount > 0 ? totalIncome / sessionCount : 0;
            
            return {
                name: cashier.name,
                totalIncome,
                totalDiscount,
                sessionCount,
                discountPercentage,
                averageSale,
                totalDifference,
            };
        });

    }, [sessions, employees, subscriptions, shiftRecords, selectedBranch, fromDate, toDate]);
    

    return (
        <Card>
            <CardHeader>
                <CardTitle>تقرير أداء الموظفين</CardTitle>
                <CardDescription>تحليل شامل لأداء الموظفين بناءً على المبيعات والخصومات والفروقات المالية في الفترة المحددة.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">اسم الموظف</TableHead>
                            <TableHead className="text-center">إجمالي الدخل</TableHead>
                            <TableHead className="text-center">إجمالي الخصومات</TableHead>
                            <TableHead className="text-center">عدد الفواتير</TableHead>
                            <TableHead className="text-center">نسبة الخصم</TableHead>
                            <TableHead className="text-center">متوسط الفاتورة</TableHead>
                            <TableHead className="text-center">إجمالي الزيادة/العجز</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {performanceData.length > 0 ? performanceData.map((data, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium text-right">{data!.name}</TableCell>
                                <TableCell className="text-center font-semibold text-green-600">{`ج.م ${data!.totalIncome.toFixed(2)}`}</TableCell>
                                <TableCell className="text-center text-red-600">{`ج.م ${data!.totalDiscount.toFixed(2)}`}</TableCell>
                                <TableCell className="text-center">{data!.sessionCount}</TableCell>
                                <TableCell className="text-center">{`${data!.discountPercentage.toFixed(2)}%`}</TableCell>
                                <TableCell className="text-center">{`ج.م ${data!.averageSale.toFixed(2)}`}</TableCell>
                                <TableCell className={`text-center font-bold ${data!.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {`ج.م ${data!.totalDifference.toFixed(2)}`}
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    لا توجد بيانات أداء لعرضها حسب الفلاتر المحددة.
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
    const { games, employees, branches, subscriptions, shiftRecords, expenses, expenseTypes } = useFirebase();
    const { customers } = useCustomers();
    const { user } = useAuth();
    
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();

    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);

     useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setSelectedBranch(currentUser.branch);
        }
    }, [currentUser]);

    const filteredData = useMemo(() => {
        const range = fromDate && toDate ? { start: startOfDay(fromDate), end: endOfDay(toDate) } : null;

        const filteredSessions = completedSessions.filter(session => {
            const branchMatch = selectedBranch === 'all' || session.branchName === selectedBranch;
            const dateMatch = range ? isWithinInterval(new Date(session.checkOutTime), range) : true;
            return branchMatch && dateMatch;
        });
        
        const filteredSubscriptions = subscriptions.filter(sub => {
            const dateMatch = range ? isWithinInterval(new Date(sub.createdAt), range) : true;
            return dateMatch;
        });

        const filteredShiftRecords = shiftRecords.filter(record => {
             const branchMatch = selectedBranch === 'all' || record.branchName === selectedBranch;
             const dateMatch = range ? isWithinInterval(new Date(record.date), range) : true;
             return branchMatch && dateMatch;
        });
        
        const filteredExpenses = expenses.filter(exp => {
             const branchMatch = selectedBranch === 'all' || exp.branchName === selectedBranch;
             const dateMatch = range ? isWithinInterval(new Date(exp.date), range) : true;
             return branchMatch && dateMatch;
        });

        return { sessions: filteredSessions, subscriptions: filteredSubscriptions, shiftRecords: filteredShiftRecords, expenses: filteredExpenses };

    }, [completedSessions, subscriptions, shiftRecords, expenses, selectedBranch, fromDate, toDate]);


    const gameProfitData = useMemo(() => {
        const profitByGame: { [key: string]: number } = {};

        games.forEach(game => {
            if (selectedBranch === 'all' || game.branch === selectedBranch || game.branch === 'كل الفروع') {
               profitByGame[game.name] = 0;
            }
        });

        filteredData.sessions.forEach(session => {
            if (profitByGame[session.game] !== undefined) {
                profitByGame[session.game] += session.cost;
            }
        });
        
        return Object.entries(profitByGame).map(([name, profit]) => ({
            name,
            profit,
        })).filter(item => item.profit > 0).sort((a,b) => b.profit - a.profit).slice(0, 10);
    }, [filteredData.sessions, games, selectedBranch]);

    const employeeIncomeData = useMemo(() => {
        const incomeByEmployee: { [key: string]: number } = {};
        const cashiers = employees.filter(e => {
            const roleMatch = e.role === 'كاشير' || e.role === 'مدير فرع' || e.role === 'مدير فرع';
            const branchMatch = selectedBranch === 'all' || e.branch === selectedBranch || e.branch === 'كل الفروع';
            return roleMatch && branchMatch;
        });

        cashiers.forEach(emp => {
            if (emp.username) {
                incomeByEmployee[emp.username] = 0;
            }
        });

        filteredData.sessions.forEach(session => {
            if (incomeByEmployee[session.cashierUsername] !== undefined) {
                incomeByEmployee[session.cashierUsername] += session.cost;
            }
        });
        
        filteredData.subscriptions.forEach(sub => {
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
    }, [filteredData, employees, selectedBranch]);
    
    const peakHoursData = useMemo(() => {
        const visitsByHour: { [key: number]: number } = {};
        for(let i=0; i < 24; i++){
            visitsByHour[i] = 0;
        }

        filteredData.sessions.forEach(session => {
            const hour = getHours(new Date(session.checkInTime));
            visitsByHour[hour]++;
        });

        return Object.entries(visitsByHour).map(([hour, visitors]) => ({
            hour: `${parseInt(hour) % 12 || 12} ${parseInt(hour) >= 12 ? 'مساءً' : 'صباحًا'}`,
            visitors,
        }));
    }, [filteredData.sessions]);


    const branchRevenueData = useMemo(() => {
        const revenueByBranch: { [key: string]: number } = {};

        branches.forEach(branch => {
            revenueByBranch[branch.name] = 0;
        });

        completedSessions.forEach(session => {
             if(revenueByBranch[session.branchName] !== undefined) {
                revenueByBranch[session.branchName] += session.cost;
            }
        });
        
         subscriptions.forEach(sub => {
            // How to attribute subscription revenue to a branch?
            // For now, let's assume it's not tied to a branch or we skip it in this chart
        });

        return Object.entries(revenueByBranch).map(([name, revenue]) => ({
            name,
            revenue
        })).filter(item => item.revenue > 0);
    }, [completedSessions, subscriptions, branches]);

    const topCustomersData = useMemo(() => {
        const visitsByCustomer: { [key: string]: number } = {};
        
        filteredData.sessions.forEach(session => {
            visitsByCustomer[session.parentName] = (visitsByCustomer[session.parentName] || 0) + 1;
        });

        return Object.entries(visitsByCustomer)
            .map(([name, visits]) => ({ name, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10); // Top 10 customers

    }, [filteredData.sessions]);

     const expenseByCategoryData = useMemo(() => {
        const expenseMap: { [key: string]: number } = {};
        
        filteredData.expenses.forEach(expense => {
            const typeName = expenseTypes.find(t => t.id === expense.typeId)?.name || 'غير محدد';
            expenseMap[typeName] = (expenseMap[typeName] || 0) + expense.amount;
        });
        
        return Object.entries(expenseMap).map(([name, amount]) => ({
            name,
            amount,
        }));
    }, [filteredData.expenses, expenseTypes]);
    
    const stats = useMemo(() => {
        const totalDiscounts = filteredData.sessions.reduce((sum, s) => sum + (s.discount || 0), 0);
        const totalRevenueWithDiscounts = filteredData.sessions.reduce((sum, s) => sum + (s.costBeforeDiscount > 0 ? s.costBeforeDiscount : (s.cost + (s.discount || 0))), 0);
        const discountPercentage = totalRevenueWithDiscounts > 0 ? (totalDiscounts / totalRevenueWithDiscounts) : 0;
        const totalSurplus = filteredData.shiftRecords.reduce((sum, r) => r.difference > 0 ? sum + r.difference : sum, 0);
        const totalDeficit = filteredData.shiftRecords.reduce((sum, r) => r.difference < 0 ? sum + r.difference : sum, 0);
        return { totalDiscounts, discountPercentage, totalSurplus, totalDeficit };
    }, [filteredData]);
    
    const clearFilters = () => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            // Don't clear branch if it's locked
        } else {
            setSelectedBranch('all');
        }
        setFromDate(undefined);
        setToDate(undefined);
    }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">التقارير</h1>
      </div>

       <Card>
            <CardHeader className="flex-row items-center justify-between">
                 <div>
                    <CardTitle>فلاتر التقارير العامة</CardTitle>
                    <CardDescription>
                    استخدم الفلاتر أدناه لتخصيص البيانات المعروضة في الإحصائيات والمخططات أدناه.
                    </CardDescription>
                </div>
                <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="me-2 h-4 w-4" />
                    مسح الفلاتر
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع</label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={currentUser?.branch !== 'كل الفروع'}>
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium">من تاريخ</label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                disabled={(date) => toDate ? date > toDate : false}
                                initialFocus
                                locale={ar}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">إلى تاريخ</label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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
                </div>
            </CardContent>
        </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
            title="إجمالي الخصومات"
            value={`ج.م ${stats.totalDiscounts.toFixed(2)}`}
            icon={TrendingDown}
            description="مجموع كل الخصومات الممنوحة على الجلسات"
         />
         <StatCard 
            title="إجمالي الزيادة"
            value={`ج.م ${stats.totalSurplus.toFixed(2)}`}
            icon={TrendingUp}
            description="مجموع فروقات الورديات الإيجابية"
            className="text-green-600"
         />
         <StatCard 
            title="إجمالي العجز"
            value={`ج.م ${Math.abs(stats.totalDeficit).toFixed(2)}`}
            icon={TrendingDown}
            description="مجموع فروقات الورديات السلبية"
            className="text-red-600"
         />
         <StatCard 
            title="نسبة الخصم من الإيرادات"
            value={`${(stats.discountPercentage * 100).toFixed(2)}%`}
            icon={Percent}
            description="نسبة الخصومات من إجمالي الإيرادات قبل الخصم"
         />
      </div>

      <CashierPerformanceReport sessions={filteredData.sessions} subscriptions={filteredData.subscriptions} shiftRecords={filteredData.shiftRecords} selectedBranch={selectedBranch} fromDate={fromDate} toDate={toDate} />

      <GamePackageReport sessions={completedSessions} games={games} selectedBranch={selectedBranch} fromDate={fromDate} toDate={toDate} />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>تقرير أرباح الألعاب (أعلى 10)</CardTitle>
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
                <CardTitle>تقرير المصروفات حسب النوع</CardTitle>
                <CardDescription>تحليل إجمالي المصروفات لكل نوع في الفترة المحددة.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={expenseByCategoryChartConfig} className="h-72 w-full">
                    <BarChart accessibilityLayer data={expenseByCategoryData} dir="ltr" margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
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
                            content={<ChartTooltipContent indicator="dot" formatter={(value) => `ج.م ${Number(value).toFixed(2)}`} />}
                        />
                        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
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
        
        {selectedBranch === 'all' && (
        <Card>
            <CardHeader>
                <CardTitle>تقرير إيرادات الفروع</CardTitle>
                <CardDescription>مقارنة إجمالي الإيرادات بين جميع الفروع (لا تشمل الاشتراكات).</CardDescription>
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
        )}

        <Card>
            <CardHeader>
                <CardTitle>تقرير العملاء الأكثر زيارة (أعلى 10)</CardTitle>
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

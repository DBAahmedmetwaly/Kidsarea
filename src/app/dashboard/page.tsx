
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Users, Activity, Wallet, Calendar as CalendarIcon, FilterX, Menu, Sparkles, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import AppSidebar from '@/components/layout/AppSidebar';
import { useSidebar } from '@/components/ui/sidebar';
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
import { cn } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { useCustomers } from '@/context/CustomerContext';
import type { CompletedSession, GameCategory, Game, Customer, CustomerChild } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { ref, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


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

function DemoDataGenerator() {
    const { customers, loading: customersLoading } = useCustomers();
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();

    const handleGenerateData = async () => {
        setGenerating(true);
        toast({ title: "بدء إنشاء البيانات التجريبية...", description: "قد تستغرق هذه العملية بضع لحظات." });

        try {
            const demoCategoriesAndGames = [
                {
                    category: { name: 'ألعاب حركية', color: '#ff6347' },
                    games: ['الترامبولين', 'الزحليقة العملاقة', 'بيت الكور', 'مسار العقبات', 'التسلق الملون', 'النطاطات الهوائية', 'سباق الأكياس', 'حرب الوسائد']
                },
                {
                    category: { name: 'ألعاب الفيديو', color: '#4682b4' },
                    games: ['سباق السيارات', 'مغامرات الفضاء', 'كرة القدم الإلكترونية', 'تحدي الأبطال', 'بناء العوالم', 'فيفا 2024', 'ماريو كارت', 'ماين كرافت']
                },
                {
                    category: { name: 'ركن الفنون', color: '#9370db' },
                    games: ['تلوين الجبس', 'صناعة الأساور', 'الرسم على الوجوه', 'تشكيل الصلصال', 'فن الأوريغامي', 'تزيين الكب كيك', 'الطباعة على القمصان', 'صناعة الأقنعة']
                },
                {
                    category: { name: 'ألعاب الذكاء', color: '#3cb371' },
                    games: ['مكعبات التركيب (ليغو)', 'بازل الصور', 'لعبة الذاكرة', 'تحدي الشطرنج', 'سودوكو للأطفال', 'لعبة الأربعة تربح', 'مكعب روبيك', 'كلمات متقاطعة']
                },
                {
                    category: { name: 'المسرح والدمى', color: '#ffa500' },
                    games: ['مسرح العرائس', 'عرض الأزياء التنكرية', 'صناعة الدمى', 'تقليد الأصوات', 'سرد القصص', 'مسرح خيال الظل', 'كاريوكي الأطفال', 'تمثيل الأدوار']
                }
            ];

            const categoryRefs: (GameCategory & { games: string[] })[] = [];

            for (const item of demoCategoriesAndGames) {
                const newCatRef = push(ref(db, 'gameCategories'));
                await set(newCatRef, item.category);
                categoryRefs.push({ id: newCatRef.key!, ...item.category, games: item.games });
            }
            
            const gamePromises = [];
            for (const category of categoryRefs) {
                for (const gameName of category.games) {
                     const gameData = {
                        name: gameName,
                        hourly_rate: Math.floor(Math.random() * 100) + 50,
                        branch: 'كل الفروع',
                        status: 'Available',
                        categoryId: category.id!,
                        categoryName: category.name,
                        image: 'https://placehold.co/64x64.png',
                    };
                    const newGameRef = push(ref(db, 'games'));
                    gamePromises.push(set(newGameRef, gameData));
                }
            }
            await Promise.all(gamePromises);

            const firstNames = ["محمد", "أحمد", "علي", "فاطمة", "زينب", "نور", "يوسف", "عمر", "سارة", "مريم"];
            const lastNames = ["المصري", "السيد", "علي", "حسن", "إبراهيم", "خالد", "محمود", "عبدالله", "جمال", "سليمان"];
            const childNames = ["آدم", "ليان", "ملك", "ياسين", "جنى", "حمزة", "حلا", "أمير", "تالا", "كريم", "سلمى", "علي", "فرح", "زياد", "نور"];

            const customersToCreate: Omit<Customer, 'id'>[] = [];
            for (let i = 1; i <= 20; i++) {
                const children: CustomerChild[] = [];
                const numChildren = Math.floor(Math.random() * 3) + 1;
                for (let j = 1; j <= numChildren; j++) {
                     const birthYear = new Date().getFullYear() - (Math.floor(Math.random() * 10) + 2);
                     const birthMonth = Math.floor(Math.random() * 12);
                     const birthDay = Math.floor(Math.random() * 28) + 1;
                     children.push({
                        name: `${childNames[Math.floor(Math.random() * childNames.length)]}`,
                        age: new Date().getFullYear() - birthYear,
                        birthdate: new Date(birthYear, birthMonth, birthDay).toISOString().split('T')[0]
                     });
                }
                customersToCreate.push({
                    parentName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
                    phoneNumber: `010000000${i.toString().padStart(2, '0')}`,
                    children: children,
                    createdAt: new Date().toISOString()
                });
            }
            
            const customerPromises = customersToCreate.map(cust => {
                const newCustRef = push(ref(db, 'customers'));
                return set(newCustRef, cust);
            });
            await Promise.all(customerPromises);

            toast({ title: "اكتمل بنجاح!", description: "تم إنشاء جميع البيانات التجريبية." });
        } catch (error) {
            console.error(error);
            toast({ title: "خطأ", description: "فشل إنشاء البيانات التجريبية.", variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };


    if(customersLoading || customers.length > 0) {
        return null;
    }

    return (
        <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
                <CardTitle>بيانات تجريبية</CardTitle>
                <CardDescription>قاعدة بياناتك فارغة. هل تود إنشاء بيانات تجريبية لتسهيل اختبار النظام؟</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleGenerateData} disabled={generating}>
                    {generating ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
                    {generating ? 'جاري الإنشاء...' : 'نعم، قم بإنشاء بيانات تجريبية'}
                </Button>
            </CardContent>
        </Card>
    )
}

function DashboardContent() {
    const { completedSessions, activeChildren } = useSession();
    const { branches, employees, games } = useFirebase();
    const { toggleSidebar } = useSidebar();
    const { user } = useAuth();

    const currentUser = useMemo(() => {
        if (!user) return null;
        return employees.find(e => e.username === user.username);
    }, [user, employees]);


    const [selectedBranch, setSelectedBranch] = useState('all');
    const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 6));
    const [toDate, setToDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setSelectedBranch(currentUser.branch);
        }
    }, [currentUser]);

    const filteredData = useMemo(() => {
        const branchGames = selectedBranch === 'all' 
            ? games.map(g => g.name) 
            : games.filter(g => g.branch === selectedBranch || g.branch === 'كل الفروع').map(g => g.name);

        const range = fromDate && toDate ? { start: startOfDay(fromDate), end: endOfDay(toDate) } : null;

        const sessions = completedSessions.filter(session => {
            const isBranchMatch = branchGames.includes(session.game);
            if (!range) return isBranchMatch;
            const sessionDate = new Date(session.checkOutTime);
            return isBranchMatch && isWithinInterval(sessionDate, range);
        });

        const active = activeChildren.filter(child => branchGames.includes(child.game));
        
        return { sessions, active };

    }, [completedSessions, activeChildren, games, selectedBranch, fromDate, toDate]);

    const stats = useMemo(() => {
        const totalRevenue = filteredData.sessions.reduce((acc, s) => acc + s.cost, 0);
        const totalVisitors = filteredData.sessions.length;
        const activeNow = filteredData.active.length;
        
        const todayRange = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
        const revenueToday = completedSessions
            .filter(s => {
                 const game = games.find(g => g.name === s.game);
                 const isBranchMatch = selectedBranch === 'all' || game?.branch === selectedBranch || game?.branch === 'كل الفروع';
                 return isBranchMatch && isWithinInterval(new Date(s.checkOutTime), todayRange);
            })
            .reduce((acc, s) => acc + s.cost, 0);

        return { totalRevenue, totalVisitors, activeNow, revenueToday };
    }, [filteredData, completedSessions, selectedBranch, games]);

    const chartData = useMemo(() => {
        if (!fromDate || !toDate) return [];

        const intervalDays = eachDayOfInterval({
            start: fromDate,
            end: toDate,
        });

        const branchGames = selectedBranch === 'all' 
            ? games.map(g => g.name) 
            : games.filter(g => g.branch === selectedBranch || g.branch === 'كل الفروع').map(g => g.name);

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

    }, [completedSessions, selectedBranch, games, fromDate, toDate]);

    const clearFilters = () => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
             // Don't clear branch if it's locked
        } else {
            setSelectedBranch('all');
        }
        setFromDate(subDays(new Date(), 6));
        setToDate(new Date());
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                 <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold md:text-2xl">لوحة التحكم</h1>
                <div className="ms-auto flex items-center gap-2 w-full sm:w-auto">
                    {/* Filters will be in a separate card now */}
                </div>
            </div>

            <DemoDataGenerator />

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>الفلاتر</CardTitle>
                        <CardDescription>استخدم الفلاتر أدناه لتخصيص البيانات المعروضة.</CardDescription>
                    </div>
                    <Button variant="ghost" onClick={clearFilters}>
                        <FilterX className="me-2 h-4 w-4" />
                        مسح الفلاتر
                    </Button>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </CardContent>
            </Card>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="إجمالي الإيرادات"
                value={`ج.م ${stats.totalRevenue.toFixed(2)}`}
                icon={DollarSign}
                description={fromDate && toDate ? `في الفترة المحددة` : ''}
            />
            <StatCard
                title="إجمالي الزوار"
                value={`${stats.totalVisitors}`}
                icon={Users}
                description={fromDate && toDate ? `في الفترة المحددة` : ''}
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

export default function DashboardPage() {
    return (
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <DashboardContent />
          </main>
        </div>
    );
}

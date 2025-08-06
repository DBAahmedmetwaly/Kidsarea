
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
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
import type { Subscription, CompletedSession } from '@/lib/types';
import { ArrowLeft, Loader2, Star, User, Calendar, CircleDollarSign, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';
import { useSession } from '@/context/SessionContext';
import { StatCard } from '@/components/StatCard';


function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function SubscriptionDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.subscriptionId as string;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { completedSessions, loading: sessionsLoading } = useSession();

  useEffect(() => {
    if (!subscriptionId) return;

    const subscriptionRef = ref(db, `subscriptions/${subscriptionId}`);

    const unsubscribe = onValue(subscriptionRef, (snapshot) => {
      if (snapshot.exists()) {
        setSubscription({ id: snapshot.key, ...snapshot.val() });
      } else {
        setSubscription(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [subscriptionId]);

  const subscriptionUsage = useMemo(() => {
    if (!subscription) return [];
    return completedSessions.filter(session => session.subscriptionId === subscription.id);
  }, [subscription, completedSessions]);

  const usageStats = useMemo(() => {
    const totalVisits = subscriptionUsage.length;
    const totalSaved = subscriptionUsage.reduce((sum, session) => sum + session.cost, 0);
    return { totalVisits, totalSaved };
  }, [subscriptionUsage]);

  const getStatusBadge = (sub: Subscription) => {
    const today = new Date();
    if (sub.status === 'Expired') {
      return <Badge variant="destructive">منتهي</Badge>;
    }
    if (sub.status === 'Active') {
      const daysLeft = differenceInDays(new Date(sub.endDate), today);
      if (daysLeft <= 7) {
        return <Badge className="bg-orange-500 text-white">ينتهي قريباً</Badge>;
      }
      return <Badge className="bg-green-500 text-white">فعال</Badge>;
    }
    return <Badge variant="secondary">{sub.status}</Badge>
  }

  if (loading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">لم يتم العثور على الاشتراك</h1>
        <p className="text-muted-foreground">الاشتراك الذي تبحث عنه غير موجود.</p>
         <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="me-2 h-4 w-4" />
            العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <Star className="h-8 w-8 text-primary" />
        <div>
            <h1 className="text-2xl font-bold">{subscription.planName}</h1>
            <p className="text-muted-foreground">اشتراك الطفل: {subscription.childName} (ولي الأمر: {subscription.customerName})</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">حالة الاشتراك</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{getStatusBadge(subscription)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">تاريخ الانتهاء</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{new Date(subscription.endDate).toLocaleDateString('ar-EG')}</div>
            </CardContent>
        </Card>
         <StatCard
            title="إجمالي الزيارات"
            value={`${usageStats.totalVisits}`}
            icon={BarChart}
            description="عدد المرات التي تم استخدام الاشتراك فيها."
        />
        <StatCard
            title="إجمالي المبلغ الموفّر"
            value={`ج.م ${usageStats.totalSaved.toFixed(2)}`}
            icon={CircleDollarSign}
            description="قيمة الجلسات التي تم تغطيتها بالاشتراك."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل استخدام الاشتراك</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع الجلسات التي تم استخدام هذا الاشتراك فيها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اللعبة</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>تاريخ الدخول</TableHead>
                <TableHead>مدة اللعب</TableHead>
                <TableHead>التكلفة (الموفرة)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptionUsage.length > 0 ? (
                subscriptionUsage.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.game}</TableCell>
                    <TableCell>{session.branchName}</TableCell>
                    <TableCell>{new Date(session.checkInTime).toLocaleString('ar-EG')}</TableCell>
                    <TableCell>{formatDuration(session.durationMs)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    لم يتم استخدام هذا الاشتراك حتى الآن.
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

export default function SubscriptionDetailsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <SubscriptionDetailsContent />
        </main>
      </div>
    </SidebarProvider>
  );
}


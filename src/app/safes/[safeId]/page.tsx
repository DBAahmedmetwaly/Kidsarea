
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, get } from 'firebase/database';
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
import type { Safe, SafeTransaction } from '@/lib/types';
import { Landmark, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SafeDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const safeId = params.safeId as string;
  const [safe, setSafe] = useState<Safe | null>(null);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!safeId) return;

    const safeRef = ref(db, `safes/${safeId}`);
    const transactionsRef = ref(db, 'safeTransactions');

    const unsubscribeSafe = onValue(safeRef, (snapshot) => {
      if (snapshot.exists()) {
        setSafe({ id: snapshot.key, ...snapshot.val() });
      } else {
        setSafe(null);
      }
      setLoading(false);
    });

    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
        const data = snapshot.val();
        const allTransactions: SafeTransaction[] = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as any) })) : [];
        const filteredTransactions = allTransactions
            .filter(t => t.safeId === safeId)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(filteredTransactions);
    });

    return () => {
      unsubscribeSafe();
      unsubscribeTransactions();
    };
  }, [safeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!safe) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">لم يتم العثور على الخزينة</h1>
        <p className="text-muted-foreground">الخزينة التي تبحث عنها غير موجودة.</p>
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
        <Landmark className="h-8 w-8 text-primary" />
        <div>
            <h1 className="text-2xl font-bold">{safe.name}</h1>
            <p className="text-muted-foreground">{safe.branchName}</p>
        </div>
        <div className="ms-auto bg-green-100 text-green-800 font-bold p-4 rounded-lg">
            الرصيد الحالي: {`ج.م ${safe.balance.toFixed(2)}`}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل حركات الخزينة</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع الحركات التي تمت على خزينة {safe.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الموظف المسؤول</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date).toLocaleString('ar-EG')}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {tx.type === 'deposit' ? 'إيداع' : 'سحب'}
                        </span>
                    </TableCell>
                    <TableCell className="font-medium">{`ج.م ${tx.amount.toFixed(2)}`}</TableCell>
                    <TableCell>{tx.cashierName}</TableCell>
                    <TableCell>{tx.notes}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    لا توجد حركات مسجلة لهذه الخزينة حتى الآن.
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

export default function SafeDetailsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <SafeDetailsContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

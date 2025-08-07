
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import type { Customer, CompletedSession } from '@/lib/types';
import { Contact, ArrowLeft, Loader2, Phone, Users, Cake, Gamepad2, Home, Clock, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/context/CustomerContext';
import { useSession } from '@/context/SessionContext';

function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}


function CustomerDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { customers, loading: customersLoading } = useCustomers();
  const { completedSessions, loading: sessionsLoading } = useSession(); // assuming loading state exists

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSessions, setCustomerSessions] = useState<CompletedSession[]>([]);
  
  const loading = customersLoading || sessionsLoading;

  useEffect(() => {
    if (!customerId || customers.length === 0) return;

    const foundCustomer = customers.find(c => c.id === customerId);
    setCustomer(foundCustomer || null);

    if (foundCustomer) {
        const sessions = completedSessions
            .filter(s => s.phoneNumber === foundCustomer.phoneNumber)
            .sort((a,b) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime());
        setCustomerSessions(sessions);
    }

  }, [customerId, customers, completedSessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">لم يتم العثور على العميل</h1>
        <p className="text-muted-foreground">العميل الذي تبحث عنه غير موجود.</p>
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
        <Contact className="h-8 w-8 text-primary" />
        <div>
            <h1 className="text-2xl font-bold">{customer.parentName}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {customer.phoneNumber}
            </p>
        </div>
      </div>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    الأطفال المسجلون
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc list-inside space-y-2">
                    {customer.children.map((child, index) => (
                        <li key={index} className="flex items-center gap-2">
                           <Cake className="h-4 w-4 text-muted-foreground" />
                           {child.name} (العمر: {child.age} سنوات)
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل زيارات العميل</CardTitle>
          <CardDescription>
            عرض تفصيلي لجميع جلسات اللعب التي تمت لأطفال {customer.parentName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead><Users className="inline-block me-1 h-4 w-4"/> أسماء الأطفال</TableHead>
                    <TableHead><Gamepad2 className="inline-block me-1 h-4 w-4"/> اللعبة</TableHead>
                    <TableHead><Home className="inline-block me-1 h-4 w-4"/> الفرع</TableHead>
                    <TableHead><Clock className="inline-block me-1 h-4 w-4"/> مدة اللعب</TableHead>
                    <TableHead><DollarSign className="inline-block me-1 h-4 w-4"/> التكلفة</TableHead>
                    <TableHead><Calendar className="inline-block me-1 h-4 w-4"/> وقت الخروج</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {customerSessions.length > 0 ? (
                    customerSessions.map((session) => (
                    <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.children.map(c => c.name).join(', ')}
                        </TableCell>
                        <TableCell>{session.game}</TableCell>
                        <TableCell>{session.branchName}</TableCell>
                        <TableCell>{formatDuration(session.durationMs)}</TableCell>
                        <TableCell>{`ج.م ${session.cost.toFixed(2)}`}</TableCell>
                        <TableCell>
                        {new Date(session.checkOutTime).toLocaleString('ar-EG')}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                        لا توجد زيارات مسجلة لهذا العميل حتى الآن.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <CustomerDetailsContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

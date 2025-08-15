
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import type { Employee, Policies } from '@/lib/types';


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [policies, setPolicies] = useState<Policies | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  
  useEffect(() => {
    async function fetchData() {
        try {
            const employeesSnapshot = await get(ref(db, 'employees'));
            const policiesSnapshot = await get(ref(db, 'policies'));
            
            const employeesData = employeesSnapshot.val();
            const policiesData = policiesSnapshot.val();
            
            setEmployees(employeesData ? Object.values(employeesData) : []);
            setPolicies(policiesData || null);
        } catch (error) {
            toast({
                title: "خطأ في تحميل البيانات",
                description: "لم نتمكن من تحميل بيانات الموظفين.",
                variant: 'destructive',
            });
        } finally {
            setInitialLoading(false);
        }
    }
    fetchData();
  }, [toast]);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = employees.find(
        (emp) => (emp.role === 'كاشير' || emp.role === 'مدير فرع' || emp.role === 'مشرف') && emp.username === username && emp.password === password
    );

    if (user) {
        if(user.status === 'Disabled') {
            toast({
                title: 'الحساب معطل',
                description: 'تم تعطيل هذا الحساب. يرجى مراجعة المدير.',
                variant: 'destructive',
            });
            setLoading(false);
            return;
        }
        login(user);
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `مرحباً بعودتك، ${user.name}!`,
        });
    } else if (username === 'admin' && password === '123456') {
        login({ username: 'admin' });
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بعودتك!',
        });
    } else {
        toast({
        title: 'فشل تسجيل الدخول',
        description: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        variant: 'destructive',
        });
    }
    setLoading(false);
  };

  const appName = policies?.appName || 'FunTrack';

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Form Section */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Gamepad2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="mt-4 text-3xl font-bold">{appName}</h1>
          </div>
          <Card className="shadow-none border-none lg:shadow-lg lg:border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
              <CardDescription>
                أدخل بياناتك للوصول إلى لوحة التحكم
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-left"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading || initialLoading}>
                  {loading || initialLoading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      {/* Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted p-10">
        <div className="text-center">
          <Gamepad2 className="h-24 w-24 text-primary mx-auto animate-bounce" />
          <h1 className="mt-6 text-4xl font-bold">{appName}</h1>
          <p className="mt-2 text-lg text-muted-foreground">نظام إدارة مناطق ألعاب الأطفال</p>
        </div>
      </div>
    </main>
  );
}

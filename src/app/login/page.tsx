

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
import { useFirebase } from '@/context/FirebaseContext';


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const { policies, loading: dataLoading, findEmployeeByUsername } = useFirebase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (username === 'admin' && password === '123456') {
        login({ username: 'admin' });
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بعودتك!',
        });
        setLoading(false);
        return;
    }

    const user = await findEmployeeByUsername(username);

    if (user && user.password === password) {
        if (user.status === 'Disabled') {
            toast({
                title: 'الحساب معطل',
                description: 'تم تعطيل هذا الحساب. يرجى مراجعة المدير.',
                variant: 'destructive',
            });
        } else {
            const allowedRoles = ['كاشير', 'مدير عام الفرع', 'مدير فرع'];
            if (user.role && allowedRoles.includes(user.role)) {
                login(user);
                toast({
                    title: 'تم تسجيل الدخول بنجاح',
                    description: `مرحباً بعودتك، ${user.name}!`,
                });
            } else {
                toast({
                    title: 'فشل تسجيل الدخول',
                    description: 'هذا المستخدم ليس لديه صلاحية للدخول.',
                    variant: 'destructive',
                });
            }
        }
    } else {
        toast({
        title: 'فشل تسجيل الدخول',
        description: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        variant: 'destructive',
        });
    }
    setLoading(false);
  };

  const appName = policies?.find(p => p.id === 'default')?.appName || 'FunTrack';
  const isButtonDisabled = loading || dataLoading;

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
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isButtonDisabled}>
                  {isButtonDisabled ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري التحميل...
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

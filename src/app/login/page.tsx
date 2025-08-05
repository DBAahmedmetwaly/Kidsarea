
'use client';

import { useState } from 'react';
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
  const { employees, loading: firebaseLoading } = useFirebase();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const user = employees.find(
        (emp) => (emp.role === 'كاشير' || emp.role === 'مدير فرع') && emp.username === username && emp.password === password && emp.status !== 'Disabled'
    );

    if (user) {
        login(user);
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `مرحباً بعودتك، ${user.name}!`,
        });
        router.push('/tracking');
    } else if (username === 'admin' && password === '123456') {
        login({ username: 'admin' });
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بعودتك!',
        });
        router.push('/tracking');
    } else {
        toast({
        title: 'فشل تسجيل الدخول',
        description: 'اسم المستخدم أو كلمة المرور غير صحيحة أو الحساب معطل.',
        variant: 'destructive',
        });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <Gamepad2 className="h-10 w-10 text-primary" />
            </div>
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
                placeholder="admin or employee username"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || firebaseLoading}>
              {loading || firebaseLoading ? (
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
  );
}

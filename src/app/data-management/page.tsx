
'use client';

import { useState } from 'react';
import { ref, get, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function DataManagementContent() {
  const { toast } = useToast();
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const handleBackup = async () => {
    setLoadingBackup(true);
    try {
      const dbRef = ref(db);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `funtack-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: 'تم النسخ الاحتياطي بنجاح',
          description: 'تم تنزيل ملف النسخة الاحتياطية بنجاح.',
        });
      } else {
        toast({
          title: 'لا توجد بيانات',
          description: 'قاعدة البيانات فارغة، لا يوجد شيء لنسخه.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to backup data:', error);
      toast({
        title: 'خطأ في النسخ الاحتياطي',
        description: 'فشل تنزيل النسخة الاحتياطية. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleDeleteAllData = async () => {
    setLoadingDelete(true);
    try {
      const dbRef = ref(db);
      await remove(dbRef);
      toast({
        title: 'تم الحذف بنجاح',
        description: 'تم حذف جميع البيانات من قاعدة البيانات بنجاح.',
      });
    } catch (error) {
      console.error('Failed to delete data:', error);
      toast({
        title: 'خطأ في الحذف',
        description: 'فشل حذف البيانات. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
        setLoadingDelete(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Database className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold md:text-2xl">إدارة البيانات</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطي للبيانات</CardTitle>
          <CardDescription>
            قم بتنزيل نسخة احتياطية كاملة من جميع بياناتك في قاعدة البيانات بصيغة JSON. احتفظ بهذا الملف في مكان آمن.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackup} disabled={loadingBackup}>
            {loadingBackup ? (
                <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    جاري التنزيل...
                </>
            ) : (
                <>
                    <Download className="me-2 h-4 w-4" />
                    تنزيل نسخة احتياطية
                </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">منطقة الخطر</CardTitle>
          <CardDescription>
            الإجراءات في هذا القسم لا يمكن التراجع عنها. يرجى توخي الحذر الشديد.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>حذف جميع البيانات</AlertTitle>
                <AlertDescription>
                    سيؤدي هذا الإجراء إلى حذف جميع البيانات في قاعدة البيانات بشكل نهائي، بما في ذلك الألعاب والموظفين والجلسات والسجلات المالية. لا يمكن استعادة البيانات بعد حذفها إلا من خلال ملف نسخة احتياطية.
                </AlertDescription>
            </Alert>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loadingDelete}>
                 {loadingDelete ? (
                    <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        جاري الحذف...
                    </>
                ) : (
                    <>
                        <Trash2 className="me-2 h-4 w-4" />
                        حذف جميع البيانات نهائياً
                    </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                <AlertDialogDescription>
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك بشكل دائم. هل تريد المتابعة؟
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllData} className="bg-destructive hover:bg-destructive/90">
                  نعم، أحذف كل شيء
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DataManagementPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <DataManagementContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

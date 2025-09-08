
'use client';

import { useState } from 'react';
import { ref, get, remove, set, update } from 'firebase/database';
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
import { Database, Download, Trash2, AlertTriangle, Loader2, Upload } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

function DataManagementContent() {
  const { toast } = useToast();
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleRestoreData = async () => {
        if (!selectedFile) {
            toast({
                title: 'لم يتم اختيار ملف',
                description: 'يرجى اختيار ملف نسخة احتياطية أولاً.',
                variant: 'destructive',
            });
            return;
        }

        setLoadingRestore(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error("File content is not readable");
                const data = JSON.parse(content);
                const dbRef = ref(db);
                await set(dbRef, data);
                toast({
                    title: 'تمت الاستعادة بنجاح',
                    description: 'تم استعادة جميع البيانات من ملف النسخة الاحتياطية.',
                });
            } catch (error) {
                console.error('Failed to restore data:', error);
                toast({
                    title: 'خطأ في الاستعادة',
                    description: 'فشل في استعادة البيانات. تأكد من أن الملف صحيح.',
                    variant: 'destructive',
                });
            } finally {
                setLoadingRestore(false);
                setSelectedFile(null);
            }
        };
        reader.onerror = () => {
             toast({
                title: 'خطأ في قراءة الملف',
                description: 'لا يمكن قراءة الملف المختار.',
                variant: 'destructive',
            });
            setLoadingRestore(false);
        }
        reader.readAsText(selectedFile);
    };

  const handleDeleteAllData = async () => {
    setLoadingDelete(true);
    try {
      const dataPathsToDelete = [
        'expenses',
        'expenseTypes',
        'openShifts',
        'payrollTransactions',
        'productSales',
        'safeTransactions', 
        'sessions', 
        'shiftRecords',
        'subscriptions',
        'subscriptionPlans',
        'inventoryMovements',
      ];
      const deletePromises = dataPathsToDelete.map(path => remove(ref(db, path)));
      await Promise.all(deletePromises);

      // Reset all safe balances to 0
      const safesRef = ref(db, 'safes');
      const snapshot = await get(safesRef);
      if (snapshot.exists()) {
          const updates: any = {};
          snapshot.forEach((childSnapshot) => {
              updates[`safes/${childSnapshot.key}/balance`] = 0;
          });
          await update(ref(db), updates);
      }
      
      toast({
        title: 'تم الحذف بنجاح',
        description: 'تم حذف بيانات المعاملات، وتم تصفير أرصدة الخزائن.',
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
        <CardContent className="space-y-6">
            <div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>استعادة البيانات من نسخة احتياطية</AlertTitle>
                    <AlertDescription>
                       سيؤدي هذا الإجراء إلى استبدال جميع البيانات الحالية في قاعدة البيانات بالبيانات الموجودة في ملف النسخة الاحتياطية الذي تحدده.
                    </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2 mt-4">
                     <Input type="file" accept=".json" onChange={handleFileChange} className="max-w-xs" />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="secondary" disabled={!selectedFile || loadingRestore}>
                             {loadingRestore ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                    جاري الاستعادة...
                                </>
                            ) : (
                                <>
                                    <Upload className="me-2 h-4 w-4" />
                                    استعادة البيانات
                                </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              هذا الإجراء سيقوم بحذف جميع البيانات الحالية واستبدالها بالبيانات من الملف الذي اخترته. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRestoreData}>
                              نعم، قم بالاستعادة
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </div>
            </div>

            <div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>إعادة ضبط المصنع (حذف بيانات المعاملات)</AlertTitle>
                    <AlertDescription>
                       سيؤدي هذا إلى حذف جميع بيانات المعاملات (مثل الجلسات، المبيعات، المصروفات، إلخ) وتصفير أرصدة الخزائن، مع الاحتفاظ بالبيانات الأساسية مثل (العملاء، الموظفين، الفروع، المخزون، الألعاب، المنتجات، السياسات، والصلاحيات).
                    </AlertDescription>
                </Alert>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loadingDelete} className="mt-4">
                     {loadingDelete ? (
                        <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            جاري الحذف...
                        </>
                    ) : (
                        <>
                            <Trash2 className="me-2 h-4 w-4" />
                            حذف بيانات المعاملات
                        </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllData} className="bg-destructive hover:bg-destructive/90">
                      نعم، أحذف البيانات
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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

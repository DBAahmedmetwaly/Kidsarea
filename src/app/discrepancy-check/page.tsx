
import { DiscrepancyChecker } from '@/components/DiscrepancyChecker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

function DiscrepancyCheckContent() {
  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-2xl font-bold">فحص تباين الإيرادات بالذكاء الاصطناعي</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>أداة تحليل التباين</CardTitle>
                <CardDescription>
                أدخل تفاصيل الوردية لتحليل الفروقات المحتملة في الإيرادات باستخدام الذكاء الاصطناعي. سيساعدك هذا في تحديد الأخطاء المحتملة أو المشكلات التي تحتاج إلى مراجعة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full">
                  <DiscrepancyChecker />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

export default function DiscrepancyCheckPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <DiscrepancyCheckContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

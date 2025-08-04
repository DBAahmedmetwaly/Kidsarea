import { DiscrepancyChecker } from '@/components/DiscrepancyChecker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DiscrepancyCheckPage() {
  return (
    <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">فحص تباين الإيرادات بالذكاء الاصطناعي</h1>
        <Card>
            <CardHeader>
                <CardTitle>أداة تحليل التباين</CardTitle>
                <CardDescription>
                أدخل تفاصيل الوردية لتحليل الفروقات المحتملة في الإيرادات باستخدام الذكاء الاصطناعي. سيساعدك هذا في تحديد الأخطاء المحتملة أو المشكلات التي تحتاج إلى مراجعة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DiscrepancyChecker />
            </CardContent>
        </Card>
    </div>
  );
}

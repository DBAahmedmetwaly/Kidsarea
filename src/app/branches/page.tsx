import { MoreHorizontal, PlusCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const branches = [
  {
    name: 'فرع الرياض بارك',
    manager: 'أحمد الصالح',
    employees: 25,
    status: 'Active',
  },
  {
    name: 'فرع جدة مول',
    manager: 'فاطمة الغامدي',
    employees: 32,
    status: 'Active',
  },
  {
    name: 'فرع الدمام سيتي سنتر',
    manager: 'خالد المطيري',
    employees: 18,
    status: 'Inactive',
  },
  {
    name: 'فرع مكة هيلتون',
    manager: 'سارة عبد الله',
    employees: 45,
    status: 'Active',
  },
];

function BranchesContent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الفروع</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              إضافة فرع
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الفروع</CardTitle>
          <CardDescription>
            إدارة فروع منطقة اللعب الخاصة بك وتتبع أدائها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الفرع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="hidden md:table-cell">
                  عدد الموظفين
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  المدير المسؤول
                </TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.name}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'Active' ? 'default' : 'secondary'} className={branch.status === 'Active' ? 'bg-green-500 text-white' : ''}>
                      {branch.status === 'Active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {branch.employees}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {branch.manager}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">تبديل القائمة</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BranchesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <BranchesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

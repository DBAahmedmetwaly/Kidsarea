
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import Image from 'next/image';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { employees } from '@/lib/data';


function EmployeesContent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الموظفين</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              إضافة موظف
            </span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الموظفون</CardTitle>
          <CardDescription>
            قائمة بجميع الموظفين في جميع الفروع.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">الصورة الرمزية</span>
                </TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead className="hidden md:table-cell">الفرع</TableHead>
                <TableHead className="hidden md:table-cell">الحالة</TableHead>
                <TableHead className="hidden md:table-cell">اسم المستخدم</TableHead>
                <TableHead>
                  <span className="sr-only">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.email}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar>
                        <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{employee.name}</div>
                    <div className="text-sm text-muted-foreground">{employee.email}</div>
                  </TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {employee.branch}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'} className={employee.status === 'Active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                      {employee.status === 'Active' ? 'نشط' : 'في إجازة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {employee.username || 'N/A'}
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
                        <DropdownMenuItem>عرض الملف الشخصي</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          حذف
                        </DropdownMenuItem>
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

export default function EmployeesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <EmployeesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}


'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';

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
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { Skeleton } from '@/components/ui/skeleton';

const EmployeeFormDialog = dynamic(() => import('./_components/EmployeeFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});


function EmployeesContent() {
    const { employees } = useFirebase();
    const { toast } = useToast();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>) => {
        try {
            const employeesRef = ref(db, 'employees');
            const newEmployeeRef = push(employeesRef);
            await set(newEmployeeRef, newEmployee);
            toast({
                title: "تمت الإضافة بنجاح",
                description: `تمت إضافة الموظف "${newEmployee.name}" إلى القائمة.`,
            });
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم إضافة الموظف",
                variant: 'destructive'
            })
        }
    };
    
    const handleEditEmployee = async (employeeToUpdate: Employee) => {
        try {
            const employeeRef = ref(db, `employees/${employeeToUpdate.id}`);
            const { id, ...employeeData } = employeeToUpdate;
            await update(employeeRef, employeeData);
             toast({
                title: "تم التعديل بنجاح",
                description: `تم تحديث بيانات الموظف "${employeeToUpdate.name}".`,
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "خطأ في التعديل",
                description: "لم يتم تحديث بيانات الموظف.",
                variant: 'destructive',
            });
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        try {
            await remove(ref(db, `employees/${employeeId}`));
            toast({
                title: "نجاح",
                description: "تم حذف الموظف بنجاح",
            })
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم حذف الموظف",
                variant: 'destructive'
            })
        }
    }
    
    const openEditDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setEditDialogOpen(true);
    }
    
    const handleFormSubmit = (data: Omit<Employee, 'id'> | Employee) => {
        if ('id' in data) {
            handleEditEmployee(data as Employee);
        } else {
            handleAddEmployee(data as Omit<Employee, 'id'>);
        }
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <h1 className="text-lg font-semibold md:text-2xl">إدارة الموظفين</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setAddDialogOpen(true)}>
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
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="hidden md:table-cell text-right">الفرع</TableHead>
                <TableHead className="hidden md:table-cell text-center">الحالة</TableHead>
                <TableHead className="hidden md:table-cell text-right">اسم المستخدم</TableHead>
                <TableHead className="text-center">
                  <span>الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium text-right">
                    {employee.name}
                  </TableCell>
                  <TableCell className="text-right">{employee.role}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {employee.branch}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <Badge variant={employee.status === 'Active' ? 'default' : (employee.status === 'On Leave' ? 'secondary' : 'destructive')} 
                        className={
                            employee.status === 'Active' ? 'bg-green-500 text-white' : 
                            (employee.status === 'On Leave' ? 'bg-yellow-500 text-white' : '')
                        }
                    >
                      {employee.status === 'Active' ? 'نشط' : (employee.status === 'On Leave' ? 'في إجازة' : 'معطل')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {employee.username || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
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
                        <DropdownMenuItem onClick={() => openEditDialog(employee)}>تعديل</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteEmployee(employee.id)}>
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
      {isAddDialogOpen && <EmployeeFormDialog 
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleFormSubmit}
        isEditMode={false}
      />}
      {isEditDialogOpen && <EmployeeFormDialog 
        open={isEditDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={selectedEmployee}
        isEditMode={true}
      />}
    </div>
  );
}

export default function EmployeesPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <EmployeesContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

    

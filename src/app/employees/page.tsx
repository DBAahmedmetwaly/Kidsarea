

'use client';

import { useState } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Employee } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';

function AddEmployeeDialog({ open, onOpenChange, onAddEmployee }: { open: boolean; onOpenChange: (open: boolean) => void; onAddEmployee: (employee: Omit<Employee, 'id'>) => void; }) {
    const { toast } = useToast();
    const { branches } = useFirebase();
    const [name, setName] = useState('');
    const [role, setRole] = useState<'مشرف' | 'كاشير' | 'مدير فرع' | ''>('');
    const [branch, setBranch] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'Active' | 'On Leave'>('Active');
    
    const handleAddEmployee = () => {
        if (!name || !role || !branch) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول الأساسية.",
                variant: "destructive",
            });
            return;
        }

        const requiresCredentials = role === 'كاشير' || role === 'مدير فرع';

        if (requiresCredentials && (!username || !password)) {
            toast({
                title: "خطأ في الإدخال",
                description: "يجب إدخال اسم المستخدم وكلمة المرور لهذا الدور.",
                variant: "destructive",
            });
            return;
        }

        const newEmployee: Omit<Employee, 'id'> = {
            name,
            role,
            branch,
            status,
            avatarUrl: 'https://placehold.co/40x40.png',
            username: requiresCredentials ? username : '',
            password: requiresCredentials ? password : '',
        };
        onAddEmployee(newEmployee);
        toast({
            title: "تمت الإضافة بنجاح",
            description: `تمت إضافة الموظف "${name}" إلى القائمة.`,
        });
        // Reset fields
        setName('');
        setRole('');
        setBranch('');
        setUsername('');
        setPassword('');
        setStatus('Active');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة موظف جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الموظف الجديد. انقر على "إضافة" عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">الاسم</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="اسم الموظف" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">الدور</Label>
                        <Select value={role} onValueChange={(value) => setRole(value as any)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الدور" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="مشرف">مشرف</SelectItem>
                                <SelectItem value="كاشير">كاشير</SelectItem>
                                <SelectItem value="مدير فرع">مدير فرع</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {(role === 'كاشير' || role === 'مدير فرع') && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="username" className="text-right">اسم المستخدم</Label>
                                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3" placeholder="username" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right">كلمة المرور</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" placeholder="••••••••" />
                            </div>
                        </>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right">الفرع</Label>
                        <Select value={branch} onValueChange={setBranch}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">الحالة</Label>
                         <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">نشط</SelectItem>
                                <SelectItem value="On Leave">في إجازة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddEmployee}>إضافة موظف</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function EmployeesContent() {
    const { employees } = useFirebase();
    const { toast } = useToast();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>) => {
        try {
            const employeesRef = ref(db, 'employees');
            const newEmployeeRef = push(employeesRef);
            await set(newEmployeeRef, newEmployee);
        } catch(e) {
            console.error(e);
            toast({
                title: "خطأ",
                description: "لم يتم إضافة الموظف",
                variant: 'destructive'
            })
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
                <TableRow key={employee.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar>
                        <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {employee.name}
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
      <AddEmployeeDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} onAddEmployee={handleAddEmployee} />
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

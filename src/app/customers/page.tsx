
'use client';

import { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, Trash, Edit } from 'lucide-react';
import { ref, set, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useCustomers } from '@/context/CustomerContext';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Customer, CustomerChild } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
import { useFieldArray, useForm } from 'react-hook-form';


function CustomerFormDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    isEditMode,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (customer: Omit<Customer, 'id' | 'createdAt'> | Customer) => void;
    initialData?: Customer | null;
    isEditMode: boolean;
}) {
    const { toast } = useToast();
    
    const form = useForm<{ parentName: string, phoneNumber: string, children: { name: string, age: number }[]}>({
        defaultValues: {
            parentName: '',
            phoneNumber: '',
            children: [{ name: '', age: 0 }],
        }
    });

    const { register, control, handleSubmit, reset, formState: { errors } } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "children"
    });

    useEffect(() => {
        if (isEditMode && initialData) {
            reset({
                parentName: initialData.parentName,
                phoneNumber: initialData.phoneNumber,
                children: initialData.children,
            });
        } else {
            reset({
                parentName: '',
                phoneNumber: '',
                children: [{ name: '', age: 0 }],
            });
        }
    }, [initialData, isEditMode, open, reset]);


    const handleFormSubmit = (data: { parentName: string, phoneNumber: string, children: { name: string, age: number }[]}) => {
        if (data.children.some(c => !c.name || c.age <= 0)) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع بيانات الأطفال بشكل صحيح.",
                variant: "destructive",
            });
            return;
        }

        const customerData: Omit<Customer, 'id' | 'createdAt'> | Customer = {
            ...(isEditMode && initialData ? { id: initialData.id, createdAt: initialData.createdAt } : {}),
            ...data,
        };
        onSubmit(customerData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="parentName" className="text-right">اسم ولي الأمر</Label>
                        <Input id="parentName" {...register("parentName", { required: true })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phoneNumber" className="text-right">رقم الهاتف</Label>
                        <Input id="phoneNumber" {...register("phoneNumber", { required: true })} className="col-span-3" />
                    </div>
                    
                    <h3 className="text-md font-medium mt-4 col-span-4">الأطفال</h3>
                     {fields.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-11 items-center gap-2 col-span-4 border p-2 rounded-md">
                            <div className="col-span-5">
                                <Label>اسم الطفل</Label>
                                <Input {...register(`children.${index}.name`, { required: true })} placeholder="اسم الطفل"/>
                            </div>
                            <div className="col-span-4">
                                <Label>العمر</Label>
                                <Input type="number" {...register(`children.${index}.age`, { required: true, valueAsNumber: true, min: 1 })} placeholder="العمر"/>
                            </div>
                            <div className="col-span-2 flex justify-end items-end h-full">
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 col-span-4"
                        onClick={() => append({ name: '', age: 0 })}
                    >
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة طفل آخر
                    </Button>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="submit">{isEditMode ? 'حفظ التغييرات' : 'إضافة عميل'}</Button>
                </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CustomersContent() {
    const { customers } = useCustomers();
    const { toast } = useToast();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [filter, setFilter] = useState('');

    const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt'>) => {
        try {
            const customersRef = ref(db, 'customers');
            const newCustomerRef = ref(db, `customers/${newCustomerData.phoneNumber}`); // Use phone number as ID for uniqueness
             const finalData = { ...newCustomerData, createdAt: new Date().toISOString() };
            await set(newCustomerRef, finalData);
            toast({
                title: "تمت الإضافة بنجاح",
                description: `تمت إضافة العميل "${newCustomerData.parentName}".`,
            });
        } catch(e) {
            console.error(e);
            toast({ title: "خطأ", description: "لم يتم إضافة العميل", variant: 'destructive' })
        }
    };
    
    const handleEditCustomer = async (customerToUpdate: Customer) => {
        try {
            const customerRef = ref(db, `customers/${customerToUpdate.id}`);
            const { id, ...customerData } = customerToUpdate;
            await update(customerRef, customerData);
            toast({ title: "تم التعديل بنجاح" });
        } catch (e) {
            console.error(e);
            toast({ title: "خطأ في التعديل", variant: 'destructive' });
        }
    };
    
    const handleDeleteCustomer = async (customerId: string) => {
        try {
            await remove(ref(db, `customers/${customerId}`));
            toast({ title: "نجاح", description: "تم حذف العميل بنجاح" })
        } catch(e) {
            console.error(e);
            toast({ title: "خطأ", description: "لم يتم حذف العميل", variant: 'destructive' })
        }
    }
    
    const openForm = (customer?: Customer) => {
        if (customer) {
            setIsEditMode(true);
            setSelectedCustomer(customer);
        } else {
            setIsEditMode(false);
            setSelectedCustomer(null);
        }
        setFormOpen(true);
    };

    const handleFormSubmit = (customerData: Omit<Customer, 'id' | 'createdAt'> | Customer) => {
        if (isEditMode) {
            handleEditCustomer(customerData as Customer);
        } else {
            handleAddCustomer(customerData as Omit<Customer, 'id' | 'createdAt'>);
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!filter) return customers;
        return customers.filter(c => 
            c.parentName.toLowerCase().includes(filter.toLowerCase()) || 
            c.phoneNumber.includes(filter)
        );
    }, [customers, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden"><SidebarTrigger /></div>
        <h1 className="text-lg font-semibold md:text-2xl">العملاء</h1>
        <div className="ms-auto flex items-center gap-2">
          <Input 
            placeholder="ابحث بالاسم أو الرقم..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button size="sm" className="h-8 gap-1" onClick={() => openForm()}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة عميل</span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
          <CardDescription>عرض وإدارة بيانات العملاء المسجلين.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم ولي الأمر</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>الأطفال</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead><span>الإجراءات</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.parentName}</TableCell>
                  <TableCell>{customer.phoneNumber}</TableCell>
                  <TableCell>{customer.children.map(c => `${c.name} (${c.age})`).join(', ')}</TableCell>
                  <TableCell>{new Date(customer.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openForm(customer)}><Edit className="me-2 h-4 w-4"/>تعديل</DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600"><Trash className="me-2 h-4 w-4"/>حذف</DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                              <AlertDialogDescription>سيؤدي هذا إلى حذف العميل وجميع بيانات أطفاله بشكل دائم.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>متابعة</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CustomerFormDialog 
        open={isFormOpen} 
        onOpenChange={setFormOpen} 
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedCustomer}
      />
    </div>
  );
}

export default function CustomersPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <CustomersContent />
            </main>
            </div>
        </SidebarProvider>
    );
}

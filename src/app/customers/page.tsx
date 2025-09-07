

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { MoreHorizontal, PlusCircle, Trash, Edit, Calendar as CalendarIcon, Loader2, Upload, Download, Trash2, AlertTriangle } from 'lucide-react';
import { ref, set, remove, update, push, runTransaction } from 'firebase/database';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { useCustomers } from '@/context/CustomerContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ar } from 'date-fns/locale';

type ChildFormField = {
    id: string;
    name: string;
    age: number;
    birthdate?: Date | undefined;
}
type PhoneFormField = {
    value: string;
}

export function CustomerFormDialog({
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
    
    const form = useForm<{ parentName: string, phoneNumbers: PhoneFormField[], children: ChildFormField[]}>({
        defaultValues: {
            parentName: '',
            phoneNumbers: [{ value: '' }],
            children: [{ id: Date.now().toString(), name: '', age: 1, birthdate: undefined }],
        }
    });

    const { register, control, handleSubmit, reset, formState: { errors } } = form;

    const { fields: childrenFields, append: appendChild, remove: removeChild } = useFieldArray({
        control,
        name: "children"
    });
     const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
        control,
        name: "phoneNumbers"
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                reset({
                    parentName: initialData.parentName,
                    phoneNumbers: initialData.phoneNumbers ? initialData.phoneNumbers.map(p => ({ value: p })) : [{value: ''}],
                    children: initialData.children && initialData.children.length > 0 
                        ? initialData.children.map(c => ({...c, birthdate: c.birthdate ? new Date(c.birthdate) : undefined }))
                        : [{ id: Date.now().toString(), name: '', age: 1, birthdate: undefined }],
                });
            } else {
                reset({
                    parentName: '',
                    phoneNumbers: [{ value: '' }],
                    children: [{ id: Date.now().toString(), name: '', age: 1, birthdate: undefined }],
                });
            }
        }
    }, [initialData, isEditMode, open, reset]);


    const handleFormSubmit = (data: { parentName: string, phoneNumbers: PhoneFormField[], children: ChildFormField[]}) => {
        const validChildren = (data.children || [])
            .filter(c => c.name.trim() !== '') // Filter out children with no name
            .map(c => ({
                ...c,
                birthdate: c.birthdate ? c.birthdate.toISOString().split('T')[0] : '', // Store as YYYY-MM-DD
            }));
        
        // Validate that if a child name is entered, age must be valid
        if (data.children && data.children.some(c => c.name.trim() !== '' && c.age < 1)) {
            toast({
                title: "خطأ في الإدخال",
                description: "عمر الطفل يجب أن يكون سنة واحدة على الأقل.",
                variant: "destructive",
            });
            return;
        }
        
        const phoneNumbers = data.phoneNumbers.map(p => p.value).filter(p => p.trim() !== '');
        if (phoneNumbers.length === 0) {
             toast({
                title: "خطأ في الإدخال",
                description: "يجب إدخال رقم هاتف واحد على الأقل.",
                variant: "destructive",
            });
            return;
        }

        const customerData: Omit<Customer, 'id' | 'createdAt'> | Customer = {
            ...(isEditMode && initialData ? { id: initialData.id, createdAt: initialData.createdAt } : {}),
            parentName: data.parentName,
            phoneNumbers: phoneNumbers,
            children: validChildren,
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
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="col-span-4">
                        <Label htmlFor="parentName">اسم ولي الأمر</Label>
                        <Input id="parentName" {...register("parentName", { required: true })} className="w-full text-base" />
                    </div>
                    
                    <h3 className="text-md font-medium mt-4 col-span-4">أرقام الهواتف</h3>
                    {phoneFields.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 items-center gap-2 col-span-4">
                            <div className="col-span-11">
                                <Label htmlFor={`phoneNumbers.${index}.value`} className="sr-only">رقم الهاتف</Label>
                                <Input {...register(`phoneNumbers.${index}.value`)} placeholder={`رقم الهاتف ${index + 1}`}/>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Button type="button" variant="destructive" size="icon" onClick={() => removePhone(index)} disabled={phoneFields.length <= 1}>
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
                        onClick={() => appendPhone({ value: '' })}
                    >
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة رقم هاتف آخر
                    </Button>


                    
                    <h3 className="text-md font-medium mt-4 col-span-4">الأطفال (اختياري)</h3>
                     {childrenFields.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 items-center gap-2 col-span-4 border p-2 rounded-md">
                            <div className="col-span-4">
                                <Label>اسم الطفل</Label>
                                <Input {...register(`children.${index}.name`)} placeholder="اسم الطفل"/>
                            </div>
                            <div className="col-span-3">
                                <Label>العمر</Label>
                                <Input type="number" {...register(`children.${index}.age`, { valueAsNumber: true, min: 1 })} placeholder="العمر"/>
                            </div>
                             <div className="col-span-4">
                                <Label>تاريخ الميلاد</Label>
                                <Controller
                                    control={control}
                                    name={`children.${index}.birthdate`}
                                    render={({ field }) => (
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="me-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختياري</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                locale={ar}
                                                captionLayout="dropdown-buttons"
                                                fromYear={1990}
                                                toYear={new Date().getFullYear()}
                                            />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                            </div>
                            <div className="col-span-1 flex justify-end items-end h-full">
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeChild(index)}>
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
                        onClick={() => appendChild({ id: Date.now().toString(), name: '', age: 1, birthdate: undefined })}
                    >
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة طفل آخر
                    </Button>
                </div>
                <DialogFooter className="pt-4">
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
    const { customers, loading: customersLoading } = useCustomers();
    const { toast } = useToast();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [filter, setFilter] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleDownloadTemplate = () => {
        const headers = ['ولي الأمر', 'الطفل الأول', 'الطفل الثاني', 'الطفل الثالث', 'الطفل الرابع', 'رقم اول', 'رقم ثاني'];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "Customer_Template.xlsx");
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        toast({
            title: "جاري استيراد العملاء...",
            description: "قد تستغرق هذه العملية بضع لحظات.",
        });

        const reader = new FileReader();
        reader.onload = (e) => {
            const processData = async () => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                    const newCustomers: Omit<Customer, 'id' | 'createdAt'>[] = [];
                    let childIdCounter = 0;
                    
                    for (const row of json) {
                        const parentName = row['ولي الأمر'];
                        const phone1 = String(row['رقم اول'] || '').trim();
                        const phone2 = String(row['رقم ثاني'] || '').trim();
                        
                        if (!parentName || !phone1) continue;

                        const phoneNumbers = [phone1, phone2].filter(p => p && p !== 'NULL');
                        
                        const existingCustomer = customers.find(c => c.phoneNumbers.some(p => phoneNumbers.includes(p)));
                        if (existingCustomer) {
                            console.warn(`Customer with phone number already exists: ${parentName}`);
                            continue;
                        }

                        const children: CustomerChild[] = [];
                        ['الطفل الأول', 'الطفل الثاني', 'الطفل الثالث', 'الطفل الرابع'].forEach(key => {
                            if (row[key]) {
                                children.push({ 
                                    id: `${Date.now()}-${childIdCounter++}`,
                                    name: String(row[key]), 
                                    age: 1 
                                });
                            }
                        });

                        newCustomers.push({
                            parentName,
                            phoneNumbers,
                            children,
                        });
                    }
                    
                    if (newCustomers.length > 0) {
                        await Promise.all(newCustomers.map(cust => {
                            const newCustomerRef = push(ref(db, 'customers'));
                            return set(newCustomerRef, { ...cust, createdAt: new Date().toISOString() });
                        }));

                        toast({
                            title: "نجاح",
                            description: `تم استيراد ${newCustomers.length} عميل بنجاح.`,
                        });
                    } else {
                        toast({
                            title: "لا يوجد عملاء جدد",
                            description: "لم يتم العثور على عملاء جدد في الملف أو أنهم موجودون بالفعل.",
                            variant: 'destructive',
                        });
                    }

                } catch (error) {
                    console.error("Error processing file:", error);
                    toast({
                        title: "خطأ في معالجة الملف",
                        description: "تأكد من أن الملف بالصيغة الصحيحة.",
                        variant: 'destructive',
                    });
                } finally {
                    setIsUploading(false);
                    if(fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            // Use setTimeout to make the heavy lifting async and not block the UI
            setTimeout(processData, 50); 
        };
        reader.readAsBinaryString(file);
    };

    const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt'>) => {
        try {
            const existingCustomer = customers.find(c => 
                (c.phoneNumbers || []).some(p => newCustomerData.phoneNumbers.includes(p))
            );
            if (existingCustomer) {
                 toast({ title: "خطأ", description: "أحد أرقام الهواتف المدخلة مسجل لعميل آخر.", variant: 'destructive' });
                 return;
            }
            const customersRef = ref(db, 'customers');
            const newCustomerRef = push(customersRef);
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
    
    const handleDeleteAllCustomers = async () => {
        try {
            await remove(ref(db, 'customers'));
            toast({ title: "نجاح", description: "تم حذف جميع العملاء بنجاح." });
        } catch(e) {
            console.error(e);
            toast({ title: "خطأ", description: "فشل حذف جميع العملاء.", variant: 'destructive' });
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
            (c.phoneNumbers || []).some(p => p.includes(filter))
        );
    }, [customers, filter]);

    const visibleCustomers = useMemo(() => {
        return filteredCustomers.slice(0, visibleCount);
    }, [filteredCustomers, visibleCount]);

    const totalChildren = useMemo(() => {
        return customers.reduce((acc, curr) => acc + (curr.children ? curr.children.length : 0), 0);
    }, [customers]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 20);
    }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
         <div className="md:hidden"><SidebarTrigger /></div>
        <h1 className="text-lg font-semibold md:text-2xl">العملاء</h1>
        <div className="ms-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="me-2 h-4 w-4" />
                تنزيل القالب
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}
                {isUploading ? 'جاري الرفع...' : 'رفع ملف'}
            </Button>
             <Input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".xlsx, .xls"
            />
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>قائمة العملاء</CardTitle>
              <CardDescription>إجمالي العملاء: {customers.length} | إجمالي الأطفال: {totalChildren}. انقر على اسم العميل لعرض سجل زياراته.</CardDescription>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={customers.length === 0}>
                        <Trash2 className="me-2 h-4 w-4"/>
                        حذف كل العملاء
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                    <AlertDialogDescription>
                       <span className="font-bold text-red-600">هذا الإجراء لا يمكن التراجع عنه.</span> سيؤدي هذا إلى حذف جميع العملاء وبياناتهم بشكل دائم من قاعدة البيانات.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllCustomers}>نعم، أحذف كل شيء</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم ولي الأمر</TableHead>
                <TableHead className="text-right">أرقام الهواتف</TableHead>
                <TableHead className="text-right">الأطفال</TableHead>
                <TableHead className="text-center">تاريخ التسجيل</TableHead>
                <TableHead className="text-center"><span>الإجراءات</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersLoading ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                </TableRow>
              ) : visibleCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-right">
                     <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                        {customer.parentName}
                     </Link>
                  </TableCell>
                  <TableCell className="text-right">{(customer.phoneNumbers || []).join(' / ')}</TableCell>
                  <TableCell className="text-right">{customer.children?.map(c => `${c.name} (${c.age})`).join(', ')}</TableCell>
                  <TableCell className="text-center">{new Date(customer.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell className="text-center">
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
           {filteredCustomers.length > visibleCount && (
            <div className="mt-4 text-center">
                <Button onClick={handleLoadMore}>
                    تحميل المزيد
                </Button>
            </div>
           )}
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

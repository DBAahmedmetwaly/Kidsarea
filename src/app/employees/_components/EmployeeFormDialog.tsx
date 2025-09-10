
'use client';
import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function EmployeeFormDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    isEditMode,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (employee: Omit<Employee, 'id'> | Employee) => void;
    initialData?: Employee | null;
    isEditMode: boolean;
}) {
    const { toast } = useToast();
    const { branches, employees } = useFirebase();
    const { user } = useAuth();
    const currentUser = employees.find(e => e.username === user?.username);

    const [name, setName] = useState('');
    const [role, setRole] = useState<'مشرف' | 'كاشير' | 'مدير عام الفرع' | ''>('');
    const [branch, setBranch] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'Active' | 'On Leave' | 'Disabled'>('Active');
    const [canApplyDiscount, setCanApplyDiscount] = useState(false);
    
    useEffect(() => {
        if (isEditMode && initialData) {
            setName(initialData.name);
            setRole(initialData.role);
            setBranch(initialData.branch);
            setUsername(initialData.username || '');
            setPassword(initialData.password || '');
            setStatus(initialData.status);
            setCanApplyDiscount(initialData.canApplyDiscount || false);
        } else {
            setName('');
            setRole('');
            if (currentUser && currentUser.branch !== 'كل الفروع') {
                setBranch(currentUser.branch);
            } else {
                setBranch('');
            }
            setUsername('');
            setPassword('');
            setStatus('Active');
            setCanApplyDiscount(false);
        }
    }, [initialData, isEditMode, open, currentUser]);


    const handleSubmit = () => {
        if (!name || !role || !branch) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول الأساسية.",
                variant: "destructive",
            });
            return;
        }

        const requiresCredentials = role === 'كاشير' || role === 'مدير عام الفرع' || role === 'مشرف';

        if (requiresCredentials && (!username || !password)) {
            toast({
                title: "خطأ في الإدخال",
                description: "يجب إدخال اسم المستخدم وكلمة المرور لهذا الدور.",
                variant: "destructive",
            });
            return;
        }

        const employeeData: Omit<Employee, 'id'> | Employee = {
            ...(isEditMode && initialData ? { id: initialData.id } : {}),
            name,
            role,
            branch,
            status,
            username: requiresCredentials ? username : '',
            password: requiresCredentials ? password : '',
            canApplyDiscount,
        };
        onSubmit(employeeData);
        onOpenChange(false);
    };
    
    const isBranchSelectDisabled = () => {
        if (user?.username === 'admin') return false; // Admin can always edit
        if (!isEditMode && currentUser?.branch !== 'كل الفروع') return true; // Branch manager can only add to their own branch
        if (isEditMode && currentUser?.branch !== 'كل الفروع') return false; // Branch manager can edit branch for their employees
        return false;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</DialogTitle>
                    <DialogDescription>
                       {isEditMode ? 'قم بتحديث تفاصيل الموظف.' : 'أدخل تفاصيل الموظف الجديد. انقر على "حفظ" عند الانتهاء.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
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
                                <SelectItem value="مدير عام الفرع">مدير عام الفرع</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {(role === 'كاشير' || role === 'مدير عام الفرع' || role === 'مشرف') && (
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
                        <Select value={branch} onValueChange={setBranch} disabled={isBranchSelectDisabled()}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="كل الفروع">كل الفروع</SelectItem>
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
                                <SelectItem value="Disabled">معطل</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox id="canApplyDiscount" checked={canApplyDiscount} onCheckedChange={(checked) => setCanApplyDiscount(!!checked)} />
                        <Label htmlFor="canApplyDiscount" className="cursor-pointer">يمكنه تطبيق الخصم</Label>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSubmit}>{isEditMode ? 'حفظ التغييرات' : 'إضافة موظف'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

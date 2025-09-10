
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import type { Branch } from '@/lib/types';


export default function BranchFormDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    isEditMode = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (branch: Omit<Branch, 'id' | 'employees'> | Branch) => void;
    initialData?: Branch | null;
    isEditMode?: boolean;
}) {
    const { toast } = useToast();
    const { employees } = useFirebase();
    const [name, setName] = useState('');
    const [manager, setManager] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    
    const branchManagers = employees.filter(emp => emp.role === 'مدير عام الفرع');

    useEffect(() => {
        if (isEditMode && initialData) {
            setName(initialData.name);
            setManager(initialData.manager);
            setStatus(initialData.status);
        } else {
            setName('');
            setManager('');
            setStatus('Active');
        }
    }, [initialData, isEditMode, open]);

    const handleFormSubmit = () => {
        if (!name || !manager) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول.",
                variant: "destructive",
            });
            return;
        }

        const branchData: Omit<Branch, 'id' | 'employees'> | Branch = {
             ...(isEditMode && initialData ? { id: initialData.id } : {}),
            name,
            manager,
            status,
        };
        onSubmit(branchData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل فرع' : 'إضافة فرع جديد'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'قم بتحديث تفاصيل الفرع. لا يمكن تغيير اسم الفرع بعد إنشائه.' : 'أدخل تفاصيل الفرع الجديد. سيتم إنشاء خزينة تلقائية لهذا الفرع.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            اسم الفرع
                        </Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: فرع الرياض" disabled={isEditMode} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manager" className="text-right">
                            المدير المسؤول
                        </Label>
                        <Select value={manager} onValueChange={setManager}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر مديرًا" />
                            </SelectTrigger>
                            <SelectContent>
                                {branchManagers.map(m => (
                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            الحالة
                        </Label>
                         <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">نشط</SelectItem>
                                <SelectItem value="Inactive">غير نشط</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            إلغاء
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleFormSubmit}>{isEditMode ? 'حفظ التغييرات' : 'إضافة الفرع'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

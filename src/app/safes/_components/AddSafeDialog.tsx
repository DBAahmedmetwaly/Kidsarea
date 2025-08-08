
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
import { useAuth } from '@/components/AuthProvider';
import type { Safe } from '@/lib/types';


export default function AddSafeDialog({ open, onOpenChange, onAddSafe }: { open: boolean; onOpenChange: (open: boolean) => void; onAddSafe: (safe: Omit<Safe, 'id'>) => void; }) {
    const { toast } = useToast();
    const { branches, employees } = useFirebase();
    const { user } = useAuth();
    const currentUser = employees.find(e => e.username === user?.username);

    const [name, setName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [balance, setBalance] = useState('0');
    
    useEffect(() => {
        if (open) {
            setName('');
            setBalance('0');
            if (currentUser && currentUser.branch !== 'كل الفروع') {
                setBranchName(currentUser.branch);
            } else {
                setBranchName('');
            }
        }
    }, [open, currentUser]);
    
    const handleAddSafe = () => {
        if (!name || !branchName) {
            toast({
                title: "خطأ في الإدخال",
                description: "يرجى تعبئة جميع الحقول الأساسية.",
                variant: "destructive",
            });
            return;
        }

        const newSafe: Omit<Safe, 'id'> = {
            name,
            branchName,
            balance: parseFloat(balance) || 0,
        };
        onAddSafe(newSafe);
        toast({
            title: "تمت الإضافة بنجاح",
            description: `تمت إضافة الخزينة "${name}" إلى القائمة.`,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة خزينة جديدة</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الخزينة الجديدة. انقر على "إضافة" عند الانتهاء.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم الخزينة</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: الخزينة الرئيسية" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branchName" className="text-right">الفرع</Label>
                        <Select value={branchName} onValueChange={setBranchName} disabled={currentUser?.branch !== 'كل الفروع'}>
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
                        <Label htmlFor="balance" className="text-right">الرصيد الافتتاحي</Label>
                        <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="col-span-3" placeholder="0" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleAddSafe}>إضافة خزينة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


    
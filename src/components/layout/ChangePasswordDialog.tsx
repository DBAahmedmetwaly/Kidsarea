

'use client';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useFirebase } from '@/context/FirebaseContext';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types';


export default function ChangePasswordDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { user } = useAuth();
    const { employees } = useFirebase();
    const { toast } = useToast();

    const handleConfirm = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            toast({ messageKey: 'invalidInput', description: "كلمتا المرور الجديدتان غير متطابقتين."});
            return;
        }

        if (!user || !('id' in user)) {
            toast({ messageKey: 'saveError', description: "لا يمكن تغيير كلمة مرور هذا المستخدم."});
            return;
        }

        const currentUserData = employees.find(e => e.id === (user as Employee).id);
        if (!currentUserData) {
            toast({ messageKey: 'saveError', description: "لم يتم العثور على المستخدم."});
            return;
        }

        if (currentUserData.password !== currentPassword) {
            toast({ messageKey: 'wrongPassword', description: "كلمة المرور الحالية غير صحيحة."});
            return;
        }

        try {
            const employeeRef = ref(db, `employees/${(user as Employee).id}`);
            await update(employeeRef, { password: newPassword });
            toast({ messageKey: 'saveSuccess', description: "تم تغيير كلمة المرور بنجاح."});
            onOpenChange(false);
        } catch (error) {
            toast({ messageKey: 'saveError', description: "فشل تحديث كلمة المرور."});
            console.error(error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>تغيير كلمة المرور</DialogTitle>
                    <DialogDescription>
                        أدخل كلمة المرور الحالية والجديدة لتحديث بيانات الدخول الخاصة بك.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                        <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button onClick={handleConfirm}>تأكيد التغيير</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

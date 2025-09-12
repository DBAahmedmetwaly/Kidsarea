
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

export default function PasswordDialog({ open, onOpenChange, onConfirm }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: (password: string) => void }) {
    const [password, setPassword] = useState('');

    const handleConfirm = () => {
        onConfirm(password);
        onOpenChange(false);
        setPassword('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>التحقق من الأمان</DialogTitle>
                    <DialogDescription>
                        اكتب كلمة المرور للمتابعة
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">إلغاء</Button>
                    </DialogClose>
                    <Button onClick={handleConfirm}>تأكيد</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

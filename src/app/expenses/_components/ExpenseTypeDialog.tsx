
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ExpenseType } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function ExpenseTypeDialog({
  open,
  onOpenChange,
  onAddType,
  existingTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddType: (name: string) => void;
  existingTypes: ExpenseType[];
}) {
  const [newTypeName, setNewTypeName] = useState('');
  const { toast } = useToast();

  const handleAddClick = () => {
    if (newTypeName.trim() === '') {
      toast({ title: 'اسم النوع مطلوب', variant: 'destructive' });
      return;
    }
    onAddType(newTypeName);
    setNewTypeName('');
  };

  const handleDeleteType = async (id: string) => {
    try {
      await remove(ref(db, `expenseTypes/${id}`));
      toast({ title: 'تم حذف النوع بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل حذف النوع', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إدارة أنواع المصروفات</DialogTitle>
          <DialogDescription>أضف أو احذف أنواع المصروفات لتصنيفها.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="مثال: صيانة، فواتير، مشتريات"
                />
                <Button onClick={handleAddClick}>إضافة</Button>
            </div>

            <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                    {existingTypes.length > 0 ? (
                        existingTypes.map(type => (
                            <div key={type.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                               <span>{type.name}</span>
                               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteType(type.id)}>
                                    <X className="h-4 w-4" />
                               </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-4">لا توجد أنواع مضافة.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">إغلاق</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

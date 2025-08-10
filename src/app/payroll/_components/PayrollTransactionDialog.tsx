
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/context/FirebaseContext';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Employee, PayrollTransaction } from '@/lib/types';

const transactionSchema = z.object({
  amount: z.coerce.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().optional(),
  safeId: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const typeLabels: Record<'advance' | 'bonus' | 'penalty', string> = {
    advance: 'سلفة',
    bonus: 'مكافأة',
    penalty: 'جزاء',
}

export default function PayrollTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  employee,
  transactionType
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (transaction: Omit<PayrollTransaction, 'id'>, safeId: string) => void;
  employee: Employee;
  transactionType: 'advance' | 'bonus' | 'penalty';
}) {
  const { safes, employees } = useFirebase();
  const { user } = useAuth();
  
  const currentUser = employees.find(e => e.username === user?.username);
  const branchSafes = safes.filter(s => s.branchName === employee.branch);
  const requiresSafe = transactionType === 'advance' || transactionType === 'bonus';

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      notes: '',
      safeId: '',
    },
  });

  const handleFormSubmit = (data: TransactionFormValues) => {
    if (requiresSafe && !data.safeId) {
        form.setError('safeId', { message: 'يجب اختيار خزينة' });
        return;
    }
    
    const finalData: Omit<PayrollTransaction, 'id'> = {
        employeeId: employee.id,
        employeeName: employee.name,
        type: transactionType,
        amount: data.amount,
        date: new Date().toISOString(),
        notes: data.notes,
        recordedBy: currentUser?.name || user?.username || 'Admin',
    };
    onSubmit(finalData, data.safeId || '');
  };

  useEffect(() => {
    if (open) {
        form.reset({
            amount: 0,
            notes: '',
            safeId: branchSafes.length > 0 ? branchSafes[0].id : '',
        })
    }
  }, [open, employee, form, branchSafes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل {typeLabels[transactionType]} لـ {employee.name}</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل الحركة. سيتم تسجيلها في سجلات الموظف.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (ج.م)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            {requiresSafe && (
                <FormField
                    control={form.control}
                    name="safeId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الخزينة المصروف منها</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الخزينة..." /></SelectTrigger></FormControl>
                            <SelectContent>
                            {branchSafes.map(safe => <SelectItem key={safe.id} value={safe.id}>{safe.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (السبب)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل أي تفاصيل إضافية هنا..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
              <Button type="submit">تسجيل الحركة</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

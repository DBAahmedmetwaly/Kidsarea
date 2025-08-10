
'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Expense } from '@/lib/types';


const expenseSchema = z.object({
  date: z.date({ required_error: 'التاريخ مطلوب' }),
  typeId: z.string().min(1, 'يجب اختيار نوع المصروف'),
  branchName: z.string().min(1, 'يجب اختيار الفرع'),
  amount: z.coerce.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  safeId: z.string().min(1, 'يجب اختيار الخزينة'),
  gameId: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpenseFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
}) {
  const { branches, employees, games, safes, expenseTypes } = useFirebase();
  const { user } = useAuth();
  const currentUser = employees.find(e => e.username === user?.username);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      typeId: '',
      branchName: currentUser?.branch !== 'كل الفروع' ? currentUser?.branch : '',
      amount: 0,
      safeId: '',
      gameId: '',
      notes: '',
    },
  });

  const watchedBranch = form.watch('branchName');

  const filteredSafes = safes.filter(s => s.branchName === watchedBranch);
  const filteredGames = games.filter(g => g.branch === watchedBranch || g.branch === 'كل الفروع');

  const handleFormSubmit = (data: ExpenseFormValues) => {
    const selectedGame = games.find(g => g.id === data.gameId);
    
    const finalData = {
      ...data,
      date: data.date.toISOString(),
      gameId: data.gameId === 'no-game' ? '' : data.gameId,
      gameName: data.gameId === 'no-game' ? '' : (selectedGame?.name || ''),
    };
    onSubmit(finalData);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
        form.reset();
    } else {
        form.reset({
            date: new Date(),
            typeId: '',
            branchName: currentUser?.branch !== 'كل الفروع' ? currentUser?.branch : '',
            amount: 0,
            safeId: '',
            gameId: '',
            notes: '',
        })
    }
  }, [open, form, currentUser]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل مصروف جديد</DialogTitle>
          <DialogDescription>
            أدخل بيانات المصروف. سيتم خصم المبلغ من الخزينة المحددة.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ المصروف</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: ar }) : <span>اختر تاريخ</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={ar}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (ج.م)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="150.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المصروف</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر نوع المصروف..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {expenseTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="branchName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الفرع</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={currentUser?.branch !== 'كل الفروع'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الفرع..." /></SelectTrigger></FormControl>
                            <SelectContent>
                            {branches.map(branch => <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="safeId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الخزينة المصروف منها</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedBranch}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الخزينة..." /></SelectTrigger></FormControl>
                            <SelectContent>
                            {filteredSafes.map(safe => <SelectItem key={safe.id} value={safe.id}>{safe.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="gameId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>اللعبة (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!watchedBranch}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر لعبة لربط المصروف بها..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="no-game">بدون لعبة</SelectItem>
                            {filteredGames.map(game => <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل أي تفاصيل إضافية هنا..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
              <Button type="submit">تسجيل المصروف</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

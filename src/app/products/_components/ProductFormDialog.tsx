
'use client';

import { useState, useEffect } from 'react';
import { ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import type { Product, ProductCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProductFormDialog({ 
    open, 
    onOpenChange, 
    onSubmit,
    isEditMode,
    initialData
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSubmit: (product: Omit<Product, 'id'> | Product) => void; 
    isEditMode: boolean;
    initialData: Product | null;
}) {
    const { toast } = useToast();
    const { productCategories } = useFirebase();

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

    useEffect(() => {
        if (open) {
            if (isEditMode && initialData) {
                setName(initialData.name);
                setCategoryId(initialData.categoryId);
            } else {
                setName('');
                setCategoryId('');
            }
        }
    }, [initialData, isEditMode, open]);

    const handleCategorySelect = (id: string) => {
        setCategoryId(id);
        setOpenCategoryCombobox(false);
    }

    const handleSubmit = () => {
        if (!name || !categoryId) {
            toast({ title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول الأساسية.", variant: "destructive" });
            return;
        }

        const category = productCategories.find(c => c.id === categoryId);
        
        const productData = {
            type: 'product' as const,
            name,
            categoryId,
            categoryName: category?.name || '',
        };

        const finalData = isEditMode && initialData ? { ...productData, id: initialData.id } : productData;

        onSubmit(finalData);
        onOpenChange(false);
    };

    const selectedCategoryName = productCategories.find(c => c.id === categoryId)?.name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد إلى الكتالوج'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم المنتج</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">الفئة</Label>
                        <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openCategoryCombobox} className="col-span-3 justify-between">
                                    {selectedCategoryName || "اختر الفئة..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="ابحث عن فئة..." />
                                    <CommandList>
                                        <CommandEmpty>لم يتم العثور على فئة.</CommandEmpty>
                                        <CommandGroup>
                                            {productCategories.map((c) => (
                                                <CommandItem key={c.id} value={c.name} onSelect={() => handleCategorySelect(c.id)}>
                                                    <Check className={cn("mr-2 h-4 w-4", categoryId === c.id ? "opacity-100" : "opacity-0")} />
                                                    {c.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup>
                                            <CommandItem asChild>
                                                <Link href="/product-categories" className="flex items-center w-full">
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    إدارة الفئات
                                                </Link>
                                            </CommandItem>
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                    <Button type="button" onClick={handleSubmit}>{isEditMode ? 'حفظ' : 'إضافة'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

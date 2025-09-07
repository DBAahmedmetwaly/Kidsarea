
'use client';

import { useState, useEffect } from 'react';
import { ChevronsUpDown, Check, PlusCircle, Trash } from 'lucide-react';
import dynamic from 'next/dynamic';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import type { Game, GameCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const CategoryFormDialog = dynamic(() => import('../../game-categories/_components/CategoryFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

import { CategoryFormValues } from '../../game-categories/page';

type FixedTimePackage = {
    id: number;
    label: string;
    duration: number;
    price: string;
}

export default function GameFormDialog({ 
    open, 
    onOpenChange, 
    onSubmit,
    isEditMode,
    initialData
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSubmit: (game: Omit<Game, 'id'> | Game) => void; 
    isEditMode: boolean;
    initialData: Game | null;
}) {
    const { toast } = useToast();
    const { branches, employees, gameCategories } = useFirebase();
    const { user } = useAuth();
    const currentUser = employees.find(e => e.username === user?.username);

    // Form State
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('');
    const [status, setStatus] = useState<'Available' | 'Maintenance'>('Available');
    const [categoryId, setCategoryId] = useState('');
    const [paymentModel, setPaymentModel] = useState<'postpaid' | 'prepaid'>('postpaid');
    const [price, setPrice] = useState('');
    const [fixedTimePackages, setFixedTimePackages] = useState<FixedTimePackage[]>([]);

    // UI State
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
    const [isAddCategoryOpen, setAddCategoryOpen] = useState(false);
    
    useEffect(() => {
        if (open) { // Reset state when dialog opens
            if (isEditMode && initialData) {
                setName(initialData.name);
                setBranch(initialData.branch);
                setStatus(initialData.status);
                setCategoryId(initialData.categoryId || '');
                setPaymentModel(initialData.paymentModel || 'postpaid');
                setPrice(String(initialData.price || ''));
                setFixedTimePackages(
                    (initialData.fixedTimePackages || []).map((p, i) => ({...p, id: i, price: String(p.price) }))
                );
            } else {
                setName('');
                setPrice('');
                if (currentUser && currentUser.branch !== 'كل الفروع') {
                    setBranch(currentUser.branch);
                } else {
                    setBranch('');
                }
                setStatus('Available');
                setCategoryId('');
                setPaymentModel('postpaid');
                setFixedTimePackages([]);
            }
        }
    }, [initialData, isEditMode, open, currentUser]);
    
    const handleCategorySelect = (id: string) => {
        setCategoryId(id);
        setOpenCategoryCombobox(false);
    }
    
    const handleAddCategory = async (data: CategoryFormValues) => {
        try {
            const categoriesRef = ref(db, 'gameCategories');
            const newCategoryRef = push(categoriesRef);
            await set(newCategoryRef, data);
            toast({ title: 'تمت الإضافة بنجاح', description: `تمت إضافة التصنيف "${data.name}".` });
            if(newCategoryRef.key) {
                setCategoryId(newCategoryRef.key);
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'خطأ', description: 'فشلت عملية إضافة التصنيف.', variant: 'destructive' });
        }
    };
    
    const handleSubmit = () => {
        if (!name || !branch || !status || !categoryId) {
            toast({ title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول الأساسية.", variant: "destructive" });
            return;
        }

        const category = gameCategories.find(c => c.id === categoryId);
        
        let gameData: Omit<Game, 'id'> = {
            name,
            branch,
            status,
            categoryId,
            categoryName: category?.name || '',
            paymentModel,
        };

        if (paymentModel === 'postpaid') {
            gameData.price = parseFloat(price || '0');
        } else {
            gameData.fixedTimePackages = fixedTimePackages.map(({id, ...p}) => ({...p, price: parseFloat(p.price || '0')}));
            delete gameData.price;
        }
        
        const finalData = isEditMode && initialData ? { ...gameData, id: initialData.id } : gameData;

        onSubmit(finalData);
        onOpenChange(false);
    };

    const selectedCategoryName = gameCategories.find(c => c.id === categoryId)?.name;

    const handlePackageChange = (id: number, field: 'label' | 'duration' | 'price', value: string | number) => {
        setFixedTimePackages(prev => prev.map(p => p.id === id ? {...p, [field]: value} : p));
    }
    
    const addPackage = () => {
        setFixedTimePackages(prev => [...prev, { id: Date.now(), label: '', duration: 30, price: ''}])
    }
    
    const removePackage = (id: number) => {
        setFixedTimePackages(prev => prev.filter(p => p.id !== id));
    }

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل بيانات اللعبة' : 'إضافة لعبة جديدة'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">الاسم</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="اسم اللعبة" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right">الفرع</Label>
                        <Select value={branch} onValueChange={setBranch} disabled={currentUser?.branch !== 'كل الفروع'}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر الفرع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="كل الفروع">كل الفروع</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">التصنيف</Label>
                        <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCategoryCombobox}
                                className="col-span-3 justify-between"
                                >
                                {selectedCategoryName || "اختر التصنيف..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="ابحث عن تصنيف..." />
                                    <CommandList>
                                        <CommandEmpty>لم يتم العثور على تصنيف.</CommandEmpty>
                                        <CommandGroup>
                                            {gameCategories.map((c) => (
                                            <CommandItem
                                                key={c.id}
                                                value={c.name}
                                                onSelect={() => handleCategorySelect(c.id)}
                                            >
                                                <Check
                                                className={cn( "mr-2 h-4 w-4", categoryId === c.id ? "opacity-100" : "opacity-0" )}/>
                                                {c.name}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup>
                                            <CommandItem onSelect={() => { setOpenCategoryCombobox(false); setAddCategoryOpen(true);}}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                إضافة تصنيف جديد
                                            </CommandItem>
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">الحالة</Label>
                         <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Available">متاح</SelectItem>
                                <SelectItem value="Maintenance">صيانة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 items-center gap-4">
                        <Label>نموذج الدفع</Label>
                        <RadioGroup
                            value={paymentModel}
                            onValueChange={(value: 'postpaid' | 'prepaid') => setPaymentModel(value)}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="postpaid" id="postpaid" />
                                <Label htmlFor="postpaid">دفع آجل (للألعاب بالساعة)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="prepaid" id="prepaid" />
                                <Label htmlFor="prepaid">دفع مسبق (للألعاب بالباقة)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    {paymentModel === 'postpaid' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">سعر الساعة (ج.م)</Label>
                            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" placeholder="e.g. 100" />
                        </div>
                    )}

                    {paymentModel === 'prepaid' && (
                        <div className="space-y-4">
                            <Label>باقات الوقت المحددة</Label>
                             <div className="space-y-2 border p-2 rounded-md max-h-48 overflow-y-auto">
                                {fixedTimePackages.map((pkg) => (
                                     <div key={pkg.id} className="grid grid-cols-12 gap-2 items-center">
                                        <Input className="col-span-4" placeholder="اسم الباقة (ساعة)" value={pkg.label} onChange={(e) => handlePackageChange(pkg.id, 'label', e.target.value)} />
                                        <Input className="col-span-3" type="number" placeholder="المدة (دقائق)" value={String(pkg.duration)} onChange={(e) => handlePackageChange(pkg.id, 'duration', parseInt(e.target.value) || 0)} />
                                        <Input className="col-span-3" type="number" placeholder="السعر" value={pkg.price} onChange={(e) => handlePackageChange(pkg.id, 'price', e.target.value)} />
                                        <Button className="col-span-2" variant="destructive" size="icon" onClick={() => removePackage(pkg.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                     </div>
                                ))}
                                {fixedTimePackages.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">لا توجد باقات. أضف واحدة.</p>}
                            </div>
                             <Button type="button" variant="outline" size="sm" onClick={addPackage}>
                                <PlusCircle className="me-2 h-4 w-4" />
                                إضافة باقة جديدة
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                    <Button type="button" onClick={handleSubmit}>{isEditMode ? 'حفظ التغييرات' : 'إضافة اللعبة'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
         {isAddCategoryOpen && <CategoryFormDialog
            open={isAddCategoryOpen}
            onOpenChange={setAddCategoryOpen}
            onSubmit={handleAddCategory}
            isEditMode={false}
            initialData={null}
        />}
        </>
    );
}

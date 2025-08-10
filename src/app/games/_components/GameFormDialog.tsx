
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
import type { Game, GameCategory, GamePackage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const CategoryFormDialog = dynamic(() => import('../../game-categories/_components/CategoryFormDialog'), {
    loading: () => <Skeleton className="w-full h-96" />,
});

import { CategoryFormValues } from '../../game-categories/page';

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
    const [gameType, setGameType] = useState<'hourly' | 'package'>('hourly');
    const [hourlyRate, setHourlyRate] = useState('');
    const [packages, setPackages] = useState<Omit<GamePackage, 'id'>[]>([]);


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
                setGameType(initialData.gameType || 'hourly');
                setHourlyRate(String(initialData.hourly_rate || ''));
                setPackages(initialData.packages?.map(({id, ...rest}) => rest) || []);
            } else {
                setName('');
                setHourlyRate('');
                if (currentUser && currentUser.branch !== 'كل الفروع') {
                    setBranch(currentUser.branch);
                } else {
                    setBranch('');
                }
                setStatus('Available');
                setCategoryId('');
                setGameType('hourly');
                setPackages([]);
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
    
    const handleAddPackage = () => {
        setPackages([...packages, { duration: 30, price: 50 }]);
    };

    const handlePackageChange = (index: number, field: 'duration' | 'price', value: string) => {
        const newPackages = [...packages];
        newPackages[index] = { ...newPackages[index], [field]: Number(value) };
        setPackages(newPackages);
    };

    const handleRemovePackage = (index: number) => {
        const newPackages = packages.filter((_, i) => i !== index);
        setPackages(newPackages);
    };

    const handleSubmit = () => {
        if (!name || !branch || !status || !categoryId) {
            toast({ title: "خطأ في الإدخال", description: "يرجى تعبئة جميع الحقول الأساسية.", variant: "destructive" });
            return;
        }

        const category = gameCategories.find(c => c.id === categoryId);
        let gameData: Omit<Game, 'id'>;

        if (gameType === 'hourly') {
            if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
                 toast({ title: "خطأ في الإدخال", description: "يرجى إدخال سعر ساعة صالح.", variant: "destructive" });
                 return;
            }
            gameData = {
                name,
                branch,
                status,
                categoryId,
                categoryName: category?.name || '',
                image: initialData?.image || 'https://placehold.co/64x64.png',
                gameType: 'hourly',
                hourly_rate: parseFloat(hourlyRate)
            }
        } else {
            if (packages.length === 0 || packages.some(p => p.duration <= 0 || p.price <= 0)) {
                 toast({ title: "خطأ في الإدخال", description: "يرجى إضافة باقة واحدة على الأقل بمدة وسعر صالحين.", variant: "destructive" });
                 return;
            }
            gameData = {
                name,
                branch,
                status,
                categoryId,
                categoryName: category?.name || '',
                image: initialData?.image || 'https://placehold.co/64x64.png',
                gameType: 'package',
                packages: packages.map((p, i) => ({ ...p, id: `pkg-${i}` })),
            }
        }
        

        const finalData = isEditMode && initialData ? { ...gameData, id: initialData.id } : gameData;

        onSubmit(finalData);
        onOpenChange(false);
    };

    const selectedCategoryName = gameCategories.find(c => c.id === categoryId)?.name;

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل بيانات اللعبة' : 'إضافة لعبة جديدة'}</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل اللعبة الجديدة هنا. انقر على "حفظ" عند الانتهاء.
                    </DialogDescription>
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

                    <div className="grid grid-cols-1 items-center gap-4 border-t pt-4 mt-2">
                        <Label>نموذج التسعير</Label>
                        <RadioGroup
                            value={gameType}
                            onValueChange={(value: 'hourly' | 'package') => setGameType(value)}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="hourly" id="hourly" />
                                <Label htmlFor="hourly">بالساعة (عداد تصاعدي)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="package" id="package" />
                                <Label htmlFor="package">باقة وقت (عداد تنازلي)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    {gameType === 'hourly' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hourly_rate" className="text-right">السعر/ساعة</Label>
                            <Input id="hourly_rate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="col-span-3" placeholder="e.g. 100" />
                        </div>
                    )}

                    {gameType === 'package' && (
                        <div className="col-span-4 space-y-4 pt-4 border-t">
                            <Label>باقات الوقت المتاحة</Label>
                             {packages.map((pkg, index) => (
                                <div key={index} className="grid grid-cols-12 items-end gap-2">
                                    <div className="col-span-5">
                                        <Label className="text-xs">المدة (دقائق)</Label>
                                        <Input
                                            type="number"
                                            value={pkg.duration}
                                            onChange={(e) => handlePackageChange(index, 'duration', e.target.value)}
                                            placeholder="e.g. 30"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <Label className="text-xs">السعر (ج.م)</Label>
                                        <Input
                                            type="number"
                                            value={pkg.price}
                                            onChange={(e) => handlePackageChange(index, 'price', e.target.value)}
                                            placeholder="e.g. 50"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Button type="button" variant="destructive" size="icon" onClick={() => handleRemovePackage(index)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={handleAddPackage}>
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



'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { InventoryItem, Product, Branch, InventoryMovement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/context/FirebaseContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

export default function InventoryFormDialog({ 
    open, 
    onOpenChange, 
    onSubmit,
    isEditMode,
    initialData,
    branchName
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSubmit: (item: Omit<InventoryItem, 'id'> | InventoryItem, movement?: Omit<InventoryMovement, 'id'>) => void; 
    isEditMode: boolean;
    initialData: InventoryItem | null;
    branchName: string;
}) {
    const { toast } = useToast();
    const { products, branches, inventory } = useFirebase();
    const { user } = useAuth();

    // Form State
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    
    // UI State
    const [openProductCombobox, setOpenProductCombobox] = useState(false);
    
    const branch = branches.find(b => b.name === branchName);

    const availableProducts = useMemo(() => {
        if (!branch) return [];
        const branchInventoryProductIds = inventory
            .filter(item => item.branchId === branch.id)
            .map(item => item.productId);
        
        return products.filter(p => !branchInventoryProductIds.includes(p.id));
    }, [products, inventory, branch]);

    useEffect(() => {
        if (open) { // Reset state when dialog opens
            if (isEditMode && initialData) {
                const product = products.find(p => p.id === initialData.productId);
                setSelectedProduct(product || null);
                setPrice(String(initialData.price));
                setQuantity(String(initialData.quantity));
            } else {
                setSelectedProduct(null);
                setPrice('');
                setQuantity('');
            }
        }
    }, [initialData, isEditMode, open, products]);
    
    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setOpenProductCombobox(false);
    }
    
    const handleSubmit = () => {
        if (!isEditMode && !selectedProduct) {
            toast({ messageKey: "inventoryProductRequired" });
            return;
        }
        if (!price || parseFloat(price) < 0 || !quantity || parseInt(quantity) < 0) {
            toast({ messageKey: "inventoryInvalidPriceQuantity" });
            return;
        }
        if (!branch) {
            toast({ messageKey: "inventoryBranchNotFound" });
            return;
        }

        const product = isEditMode && initialData ? products.find(p => p.id === initialData.productId) : selectedProduct;
        if (!product) {
            toast({ messageKey: "inventoryProductNotFound" });
            return;
        }

        let movement: Omit<InventoryMovement, 'id'> | undefined = undefined;
        const newQuantity = parseInt(quantity, 10);

        if (isEditMode && initialData) {
            const change = newQuantity - initialData.quantity;
            if (change !== 0) {
                movement = {
                    date: new Date().toISOString(),
                    productId: initialData.productId,
                    productName: initialData.productName,
                    branchId: initialData.branchId,
                    branchName: initialData.branchName,
                    type: 'Manual Adjustment',
                    change: change,
                    quantityBefore: initialData.quantity,
                    quantityAfter: newQuantity,
                    recordedBy: user?.username || 'N/A',
                }
            }
        } else {
            // New item added to inventory
             movement = {
                date: new Date().toISOString(),
                productId: product.id,
                productName: product.name,
                branchId: branch.id,
                branchName: branch.name,
                type: 'Initial Stock',
                change: newQuantity,
                quantityBefore: 0,
                quantityAfter: newQuantity,
                recordedBy: user?.username || 'N/A',
            }
        }

        const itemData = {
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
            branchId: branch.id,
            branchName: branch.name,
            price: parseFloat(price),
            quantity: newQuantity,
        };

        const finalData = isEditMode && initialData ? { ...itemData, id: initialData.id } : itemData;

        onSubmit(finalData, movement);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'تعديل منتج في المخزون' : `إضافة منتج لمخزون فرع ${branchName}`}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="space-y-2">
                        <Label htmlFor="product">المنتج</Label>
                        {isEditMode && initialData ? (
                            <Input value={initialData.productName} disabled />
                        ) : (
                            <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openProductCombobox} className="w-full justify-between">
                                        {selectedProduct?.name || "اختر منتج من الكتالوج..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="ابحث عن منتج..." />
                                        <CommandList>
                                            <CommandEmpty>لا توجد منتجات متاحة. أضفها من كتالوج المنتجات أولاً.</CommandEmpty>
                                            <CommandGroup>
                                                {availableProducts.map((p) => (
                                                    <CommandItem key={p.id} value={p.name} onSelect={() => handleProductSelect(p)}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === p.id ? "opacity-100" : "opacity-0")} />
                                                        {p.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity">الكمية</Label>
                        <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="price">سعر البيع (ج.م)</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 15.00" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                    <Button type="button" onClick={handleSubmit}>{isEditMode ? 'حفظ التغييرات' : 'إضافة للمخزون'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

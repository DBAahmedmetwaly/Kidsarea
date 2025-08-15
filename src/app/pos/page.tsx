

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, Square, AlertTriangle, ChevronsUpDown, Check, PlusCircle, Star, Clock, Users, UserCheck, Briefcase, Search, ChevronDown, PackageCheck, Phone, ShoppingCart, Trash2 } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, Game, Employee, Customer, Subscription, GameCategory, CustomerChild, CompletedSession, Policies, DayOfWeek, ReceiptSettings, Branch, GamePackage, InventoryItem, ProductSale, Product, ProductCategory, SubscriptionPlan } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, set, onValue, push, get, update, runTransaction } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { useCustomers } from '@/context/CustomerContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CustomerFormDialog } from '../customers/page';
import Link from 'next/link';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { startOfDay, isToday } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PosReceipt, type PosReceiptProps } from '@/components/Receipt';
import { usePosPrint } from '@/hooks/use-pos-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/StatCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ProductReceipt, type ProductReceiptProps } from '@/components/ProductReceipt';

const TimeCounter = ({ startTime, packageDuration, onTimeEnd }: { startTime: number, packageDuration?: number, onTimeEnd?: () => void }) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const timeEnded = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        setElapsed(elapsedMs);

        if (packageDuration) {
            const totalDurationMs = packageDuration * 60 * 1000;
            const newRemaining = Math.max(0, totalDurationMs - elapsedMs);
            setRemaining(newRemaining);
            
            if(newRemaining === 0 && !timeEnded.current) {
                timeEnded.current = true;
                onTimeEnd?.();
            }
        }
    }, 1000);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
    };
  }, [startTime, packageDuration, onTimeEnd]);
  
  const formatTime = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (packageDuration) {
      if (remaining === null) return <span>...</span>;
      const isEndingSoon = remaining <= 5 * 60 * 1000; // 5 minutes
      const isEnded = remaining === 0;
      
      return (
        <span 
          className={cn(
            "font-mono font-bold",
            isEnded ? "text-red-500 animate-pulse" :
            isEndingSoon ? "text-orange-500" : ""
          )}
          dir="ltr"
        >
          {formatTime(remaining)}
        </span>
      );
  }

  if (elapsed === null) return <span>...</span>;
  return <span className="font-mono" dir="ltr">{formatTime(elapsed)}</span>;
};


function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function calculateCost(durationMs: number, hourlyRate: number, policies: Policies | null, numberOfChildren: number) {
    const durationHours = durationMs / (1000 * 60 * 60);
    let roundedHours = durationHours;

    if (policies?.roundingPolicy && policies.roundingPolicy !== 'none') {
        const minutes = durationHours * 60;
        switch(policies.roundingPolicy) {
            case 'quarter-hour':
                roundedHours = Math.ceil(minutes / 15) * 15 / 60;
                break;
            case 'half-hour':
                roundedHours = Math.ceil(minutes / 30) * 30 / 60;
                break;
            case 'hour':
                roundedHours = Math.ceil(minutes / 60);
                break;
        }
    }
    
    // Cost is per child
    const durationCost = (roundedHours * hourlyRate) * numberOfChildren;

    return { durationCost };
}

function getDayOfWeek(date: Date): DayOfWeek {
    const dayIndex = date.getDay(); // Sunday = 0, Monday = 1, etc.
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
}

function CheckOutDialog({
  open,
  onOpenChange,
  child,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  onConfirm: (child: Child, receiptDetails: PosReceiptProps, costBeforeDiscount: number) => void;
}) {
  const { games, policies: allPolicies, employees, receiptSettings, subscriptions, branches } = useFirebase();
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const { user } = useAuth();
  const { printReceipt } = usePosPrint();
  const amountReceivedInputRef = useRef<HTMLInputElement>(null);
  
  const policies = useMemo(() => {
    if (!child || !allPolicies) return null;
    const branch = branches.find(b => b.name === child.branchName);
    const branchPolicy = allPolicies.find(p => p.id === branch?.id);
    const defaultPolicy = allPolicies.find(p => p.id === 'default');

    if (branchPolicy) {
        return { ...(defaultPolicy || {}), ...branchPolicy };
    }
    return defaultPolicy || null;

  }, [child, allPolicies, branches]);
  
  const isPackageGame = child?.packageDuration && child.packageDuration > 0;

  const checkoutData = useMemo(() => {
    if (!child) return null;
    
    const durationMs = Date.now() - child.checkInTime;
    const numberOfChildren = child.children.length;
    let finalTotalCost: number;
    let finalDurationCost: number = 0;
    let finalEntryFee: number = 0;
    let costBeforeDiscount: number;
    let overtimeCost = 0;


    if (isPackageGame) {
        const packageChildrenCount = policies?.packagePricingModel === 'per_child' ? numberOfChildren : 1;
        let packageBasePrice = (child.packagePrice || 0) * packageChildrenCount;
        
        // Calculate overtime if applicable
        if (policies?.enablePackageOvertime && child.packageDuration) {
            const packageDurationMs = child.packageDuration * 60 * 1000;
            if (durationMs > packageDurationMs) {
                const overtimeMs = durationMs - packageDurationMs;
                let overtimeMinutes = overtimeMs / (1000 * 60);

                // Apply rounding
                 if (policies.packageOvertimeRounding && policies.packageOvertimeRounding !== 'none') {
                    switch(policies.packageOvertimeRounding) {
                        case 'quarter-hour':
                            overtimeMinutes = Math.ceil(overtimeMinutes / 15) * 15;
                            break;
                        case 'half-hour':
                            overtimeMinutes = Math.ceil(overtimeMinutes / 30) * 30;
                            break;
                        case 'hour':
                            overtimeMinutes = Math.ceil(overtimeMinutes / 60) * 60;
                            break;
                    }
                }
                overtimeCost = overtimeMinutes * (policies.packageOvertimeRatePerMinute || 0);
            }
        }
        
        costBeforeDiscount = packageBasePrice + overtimeCost;
    } else {
        const gameDetails = games.find((g) => g.name === child.game);
        let hourlyRate = gameDetails?.hourly_rate || 0;

        if (policies?.enableWeekendPricing) {
            const today = getDayOfWeek(new Date());
            const weekendPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
            
            if (policies.weekendDays[today] && weekendPolicy?.weekendRate) {
                hourlyRate = weekendPolicy.weekendRate;
            } else if (weekendPolicy?.weekdayRate) {
                 hourlyRate = weekendPolicy.weekdayRate;
            }
        }
        
        const nonSubscribedChildrenCount = child.children.filter(c => 
            !activeSubscriptions.some(s => s.childName === c.name)
        ).length;

        const { durationCost } = calculateCost(durationMs, hourlyRate, policies, nonSubscribedChildrenCount);
        finalDurationCost = durationCost;
        costBeforeDiscount = finalDurationCost;
    }

    // Apply Entry Fee
    const entryFeePolicy = policies?.entryFeeApplication;
    if (policies && policies.entryFee > 0 && entryFeePolicy !== 'none') {
        const applyToHourly = entryFeePolicy === 'all' || entryFeePolicy === 'hourly';
        const applyToPackage = entryFeePolicy === 'all' || entryFeePolicy === 'package';

        if ((!isPackageGame && applyToHourly) || (isPackageGame && applyToPackage)) {
            finalEntryFee = policies.entryFee * numberOfChildren;
            costBeforeDiscount += finalEntryFee;
        }
    }

    finalTotalCost = costBeforeDiscount;
    const discountAmount = parseFloat(discount) || 0;
    const finalCostAfterDiscount = finalTotalCost - discountAmount > 0 ? finalTotalCost - discountAmount : 0;

    return {
        duration: formatDuration(durationMs),
        totalCost: finalCostAfterDiscount,
        costBeforeDiscount: costBeforeDiscount,
        durationCost: finalDurationCost,
        entryFee: finalEntryFee,
        discount: discountAmount,
        overtimeCost,
    }

  }, [child, games, policies, discount, activeSubscriptions, isPackageGame]);

  // Check for subscription when dialog opens
  useEffect(() => {
    if (child) {
        const now = new Date();
        const foundSubscriptions = subscriptions.filter(sub => 
            sub.customerName === child.parentName &&
            child.children.some(c => c.name === sub.childName) &&
            sub.status === 'Active' &&
            now >= new Date(sub.startDate) &&
            now <= new Date(sub.endDate)
        );
        setActiveSubscriptions(foundSubscriptions);
    } else {
        setActiveSubscriptions([]);
    }
  }, [child, subscriptions]);

  useEffect(() => {
    if (open) {
        setAmountReceived('');
        setDiscount('');
        setTimeout(() => {
            amountReceivedInputRef.current?.focus();
        }, 100);
    }
  }, [open]);

  const handleConfirm = async () => {
    if(!child || !checkoutData) return;
    
    const cashier = employees.find(e => e.username === user?.username);
    const cashierName = user?.username === 'admin' 
        ? 'Admin' 
        : cashier?.name || user?.username || 'N/A';
        
    const finalCost = checkoutData.totalCost;
    const isFullySubscribed = child.children.every(c => activeSubscriptions.some(s => s.childName === c.name));
    
    const branch = branches.find(b => b.name === child.branchName);
    const branchId = branch?.id;

    let receiptNumber = 0;
    if (branchId) {
        const counterRef = ref(db, `branches/${branchId}/nextReceiptNumber`);
        const { committed, snapshot } = await runTransaction(counterRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });
        if (committed) {
            receiptNumber = snapshot.val();
        }
    }


    const receiptDetails: PosReceiptProps = {
        receiptId: `${branch?.name.substring(0,3).toUpperCase() || 'DEF'}-${receiptNumber}`,
        settings: receiptSettings,
        appName: policies?.appName || 'FunTrack',
        branchName: child.branchName,
        children: child.children,
        parentName: child.parentName,
        gameName: child.game,
        checkInTime: new Date(child.checkInTime),
        checkOutTime: new Date(),
        duration: checkoutData.duration,
        totalCost: finalCost,
        durationCost: checkoutData.durationCost,
        entryFee: checkoutData.entryFee,
        discount: checkoutData.discount,
        cashierName: cashierName,
        isSubscription: isFullySubscribed,
        packagePrice: child.packagePrice,
        overtimeCost: checkoutData.overtimeCost,
    };
    
    if (receiptSettings) {
        printReceipt(<PosReceipt {...receiptDetails} />);
    }
    onConfirm(child, receiptDetails, checkoutData.costBeforeDiscount);
  }

  if (!child || !checkoutData) return null;


  const change = Number(amountReceived) - checkoutData.totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسوية حساب: {child.children.map(c=>c.name).join(', ')}</DialogTitle>
          <DialogDescription>
            مدة اللعب: {checkoutData.duration}. قم بتأكيد المبلغ المستلم لإتمام العملية.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {isPackageGame && (
                <Alert className="bg-blue-50 border-blue-200">
                    <PackageCheck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">لعبة باقة وقت</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      تكلفة الباقة الأساسية: {`ج.م ${child.packagePrice?.toFixed(2)}`}.
                      {checkoutData.overtimeCost > 0 && ` + تكلفة الوقت الإضافي: ج.م ${checkoutData.overtimeCost.toFixed(2)}`}
                    </AlertDescription>
                </Alert>
            )}

            {activeSubscriptions.length > 0 && (
                <Alert className="bg-green-50 border-green-200">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">لديهم اشتراك فعال</AlertTitle>
                    <AlertDescription className="text-green-700">
                       الأطفال: {activeSubscriptions.map(s => s.childName).join(', ')}. سيتم خصم تكلفتهم من الإجمالي.
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="flex justify-between items-center text-lg p-3 bg-muted rounded-md">
                <span className="font-medium">التكلفة الإجمالية:</span>
                <span className="font-bold text-primary">{`ج.م ${checkoutData.totalCost.toFixed(2)}`}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="discount">الخصم (ج.م)</Label>
                    <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="أدخل الخصم"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount-received">المبلغ المستلم</Label>
                    <Input
                    id="amount-received"
                    ref={amountReceivedInputRef}
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="أدخل المبلغ المستلم"
                    />
                </div>
            </div>
            {amountReceived && (
                <div className={`flex justify-between items-center text-lg p-3 rounded-md ${change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <span className="font-medium">الباقي:</span>
                    <span className="font-bold">{`ج.م ${change.toFixed(2)}`}</span>
                </div>
            )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
            <Button 
              onClick={handleConfirm} 
              disabled={checkoutData.totalCost > 0 && (Number(amountReceived) < checkoutData.totalCost || !amountReceived)}
            >
                حفظ و طباعة
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


function CheckInDialog({
    open,
    onOpenChange,
    selectedGame,
    onConfirm
} : {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    selectedGame: Game | null,
    onConfirm: (childData: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>) => void
}) {
    const { customers } = useCustomers();
    const { subscriptions, subscriptionPlans } = useFirebase();
    const { toast } = useToast();

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<CustomerChild[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<SubscriptionPlan | null>(null);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
    
    useEffect(() => {
        if (!open) {
            setSelectedCustomer(null);
            setSelectedChildren([]);
            setSelectedPackage(null);
            setOpenCombobox(false);
        } else {
             // If it's a package game with only one package, pre-select it
            if(selectedGame?.gameType === 'package' && subscriptionPlans?.length === 1) {
                setSelectedPackage(subscriptionPlans[0]);
            }
        }
    }, [open, selectedGame, subscriptionPlans]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedChildren([]); // Reset selected children when customer changes
        setOpenCombobox(false);
    }
    
    const handleChildSelect = (child: CustomerChild, checked: boolean) => {
        setSelectedChildren(prev => 
            checked ? [...prev, child] : prev.filter(c => c.id !== child.id)
        );
    }

    const handleConfirm = () => {
        if (!selectedCustomer || selectedChildren.length === 0 || !selectedGame) return;
        
        const childData: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'> = {
            children: selectedChildren,
            game: selectedGame.name,
            branchName: selectedGame.branch,
            parentName: selectedCustomer.parentName,
            phoneNumbers: selectedCustomer.phoneNumbers,
        };

        if (selectedGame.gameType === 'package') {
            if (!selectedPackage) {
                toast({ title: "يرجى اختيار باقة وقت", variant: "destructive" });
                return;
            }
            childData.packageDuration = selectedPackage.duration;
            childData.packagePrice = selectedPackage.price;
        }

        onConfirm(childData);
        onOpenChange(false);
    }
    
    const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt'>) => {
      try {
          const existingCustomer = customers.find(c => (c.phoneNumbers || []).some(p => newCustomerData.phoneNumbers.includes(p)));
          if (existingCustomer) {
                toast({ title: "خطأ", description: "هذا الرقم مسجل لعميل آخر.", variant: 'destructive' });
                return;
          }
          const customersRef = ref(db, 'customers');
          const newCustomerRef = push(customersRef);
          const finalData = { ...newCustomerData, createdAt: new Date().toISOString() };
          await set(newCustomerRef, finalData);
      } catch(e) {
          console.error(e);
      }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تسجيل دخول: {selectedGame?.name}</DialogTitle>
                        <DialogDescription>
                            اختر العميل والأطفال لبدء جلسة اللعب.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>ابحث عن عميل حالي</Label>
                                <div className="flex items-center gap-2">
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-full justify-between"
                                        >
                                        {selectedCustomer
                                            ? `${selectedCustomer.parentName} (${(selectedCustomer.phoneNumbers || []).join(', ')})`
                                            : "اختر ولي الأمر..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="ابحث بالرقم أو الاسم..." />
                                            <CommandList>
                                                <CommandEmpty>لم يتم العثور على عميل.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((customer) => (
                                                    <CommandItem
                                                        key={customer.id}
                                                        value={`${customer.parentName} ${(customer.phoneNumbers || []).join(' ')}`}
                                                        onSelect={() => handleCustomerSelect(customer)}
                                                    >
                                                        <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                        />
                                                        {customer.parentName} ({(customer.phoneNumbers || []).join(', ')})
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerFormOpen(true)}>
                                    <PlusCircle className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        {selectedCustomer && (
                             <div className="space-y-2">
                                <Label>اختر الأطفال</Label>
                                <div className="space-y-2 rounded-md border p-2 max-h-40 overflow-y-auto">
                                    {(selectedCustomer.children || []).map((child, index) => (
                                        <div key={child.id || index} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`child-${child.id || index}`}
                                                onCheckedChange={(checked) => handleChildSelect(child, !!checked)}
                                                checked={selectedChildren.some(c => c.id === child.id)}
                                            />
                                            <Label htmlFor={`child-${child.id || index}`} className="font-normal">
                                                {child.name} (عمر: {child.age})
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedGame?.gameType === 'package' && (
                             <div className="space-y-2">
                                <Label>اختر باقة الوقت</Label>
                                <Select onValueChange={(value) => {
                                    const pkg = subscriptionPlans?.find(p => p.id === value);
                                    setSelectedPackage(pkg || null);
                                }} defaultValue={selectedPackage?.id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر باقة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subscriptionPlans?.map(pkg => (
                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                {pkg.name} ({pkg.duration} دقيقة / {pkg.price} ج.م)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <Button onClick={handleConfirm} disabled={selectedChildren.length === 0 || !selectedCustomer || (selectedGame?.gameType === 'package' && !selectedPackage)}>
                            بدء اللعب
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <CustomerFormDialog 
                open={isCustomerFormOpen} 
                onOpenChange={setCustomerFormOpen} 
                onSubmit={handleAddCustomer}
                isEditMode={false}
                initialData={null}
            />
        </>
    )
}

// Cart state type
type CartItem = InventoryItem & { cartQuantity: number };

function PosTrackingContent() {
  const { activeChildren: firebaseActiveChildren, completedSessions: firebaseCompletedSessions, subscriptions, games, policies: allPolicies, openShifts, employees, branches, gameCategories, products, inventory, productCategories, receiptSettings, loading: firebaseLoading } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const { printReceipt } = usePosPrint();

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  
  const [isCheckInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  const [isCheckoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);

  const [activeSearch, setActiveSearch] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSaleCheckoutOpen, setSaleCheckoutOpen] = useState(false);

  const notificationIntervals = useRef<Map<number, NodeJS.Timeout>>(new Map()).current;


  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);

  const policies = useMemo(() => {
    const branchName = currentUser?.branch === 'كل الفروع' ? selectedBranchFilter : currentUser?.branch;
    const branch = branches.find(b => b.name === branchName);
    const branchPolicy = allPolicies.find(p => p.id === branch?.id);
    const defaultPolicy = allPolicies.find(p => p.id === 'default');

    if (branchPolicy) {
        return { ...(defaultPolicy || {}), ...branchPolicy };
    }
    return defaultPolicy || null;
}, [currentUser, selectedBranchFilter, allPolicies, branches]);


    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setSelectedBranchFilter(currentUser.branch);
        }
    }, [currentUser]);

  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);

  const activeChildren = useMemo(() => {
    if (selectedBranchFilter === 'all') return firebaseActiveChildren;
    return firebaseActiveChildren.filter(child => child.branchName === selectedBranchFilter);
  }, [firebaseActiveChildren, selectedBranchFilter]);

  const searchedActiveChildren = useMemo(() => {
    if (!activeSearch) return activeChildren;
    return activeChildren.filter(child => 
        child.parentName.toLowerCase().includes(activeSearch.toLowerCase()) ||
        child.children.some(c => c.name.toLowerCase().includes(activeSearch.toLowerCase())) ||
        (child.phoneNumbers || []).some(p => p.includes(activeSearch))
    );
  }, [activeChildren, activeSearch]);

  const branchInventory = useMemo(() => {
      if (selectedBranchFilter === 'all') return [];
      const branchDetails = branches.find(b => b.name === selectedBranchFilter);
      if (!branchDetails) return [];
      return inventory.filter(item => item.branchId === branchDetails.id);
  }, [inventory, selectedBranchFilter, branches]);

  const allProductCategories = useMemo(() => [{id: 'all', name: 'الكل'}, ...productCategories], [productCategories]);
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const filteredProductsForDisplay = useMemo(() => {
    return branchInventory.filter(item => {
        const quantityMatch = item.quantity > 0;
        const categoryMatch = selectedProductCategory === 'all' || item.categoryId === selectedProductCategory;
        const searchMatch = productSearch === '' || item.productName.toLowerCase().includes(productSearch.toLowerCase());
        return quantityMatch && categoryMatch && searchMatch;
    });
  }, [branchInventory, selectedProductCategory, productSearch]);

    const todaysCompletedSessions = useMemo(() => {
        if (!user || !user.username) return [];

        const todayStart = startOfDay(new Date());
        const openShift = openShifts.find(s => s.cashierUsername === user.username);
        const filterStartTime = openShift ? new Date(openShift.startTime) : todayStart;

        return firebaseCompletedSessions.filter(s => {
            const cashierMatch = s.cashierUsername === user.username;
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            const timeMatch = new Date(s.checkOutTime) >= filterStartTime;
            return cashierMatch && branchMatch && timeMatch;
        }).slice(0, 5); // Show last 5
  }, [firebaseCompletedSessions, selectedBranchFilter, user, openShifts]);

    const dailyStats = useMemo(() => {
        const activeCount = activeChildren.length;
        
        const todaysSessions = firebaseCompletedSessions.filter(s => {
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            return branchMatch && isToday(new Date(s.checkOutTime));
        });

        const visitorsToday = todaysSessions.reduce((sum, s) => sum + (s.children?.length || 1), 0);
        const sessionsToday = todaysSessions.length;

        return { activeCount, visitorsToday, sessionsToday };

    }, [activeChildren, firebaseCompletedSessions, selectedBranchFilter]);

  const openCheckInDialog = (game: Game) => {
    setSelectedGame(game);
    setCheckInDialogOpen(true);
  }
  
  const openCheckOutDialog = (child: Child) => {
    setChildToCheckout(child);
    setCheckoutDialogOpen(true);
  }
  
  const handleCheckOut = async (child: Child, receiptDetails: PosReceiptProps, costBeforeDiscount: number) => {
    setCheckoutDialogOpen(false);
    
    // Clear any running notification intervals for this child
    if (notificationIntervals.has(child.id)) {
        clearInterval(notificationIntervals.get(child.id));
        notificationIntervals.delete(child.id);
    }

    const activeSubs = subscriptions.filter(sub => 
        sub.customerName === child.parentName &&
        child.children.some(c => c.name === sub.childName) &&
        sub.status === 'Active'
    );

    const baseSession: Omit<CompletedSession, 'id' | 'subscriptionId'> = {
        ...child,
        checkOutTime: receiptDetails.checkOutTime.getTime(),
        durationMs: receiptDetails.checkOutTime.getTime() - child.checkInTime,
        cost: receiptDetails.totalCost,
        costBeforeDiscount: costBeforeDiscount,
        durationCost: receiptDetails.durationCost,
        entryFee: receiptDetails.entryFee,
        discount: receiptDetails.discount,
        overtimeCost: receiptDetails.overtimeCost,
        receiptNumber: Number(receiptDetails.receiptId?.split('-')[1]) || 0,
    };
    
    let completedSession: Partial<CompletedSession> = { ...baseSession };
    if (activeSubs.length > 0) {
        completedSession.subscriptionId = activeSubs.map(s => s.id).join(',');
    }

    try {
        if (completedSession.subscriptionId === undefined) {
            delete completedSession.subscriptionId;
        }
        await set(ref(db, `sessions/completed/${child.id}`), completedSession);
        await set(ref(db, `sessions/active/${child.id}`), null);
        
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الخروج', variant: 'destructive'})
    }

  };


  const handleCheckIn = async (data: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>) => {
    const { children } = data;
    
    if (policies && policies.maxCapacity && (firebaseActiveChildren.length + children.length) > policies.maxCapacity) {
        toast({
            title: 'تم الوصول للحد الأقصى',
            description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${policies.maxCapacity} طفل.`,
            variant: 'destructive',
        });
        return;
    }

    // Check if any of the selected children are already in an active session
    const activeChildIds = firebaseActiveChildren.flatMap(ac => ac.children.map(c => c.id));
    const alreadyActiveChildren = children.filter(c => c.id && activeChildIds.includes(c.id));

    if (alreadyActiveChildren.length > 0) {
        toast({
            title: 'طفل نشط بالفعل',
            description: `الطفل "${alreadyActiveChildren[0].name}" موجود بالفعل في جلسة نشطة.`,
            variant: 'destructive'
        });
        return;
    }

    if (!user || !user.username) {
        toast({
            title: 'خطأ',
            description: 'لا يمكن تسجيل الدخول. لم يتم تحديد الكاشير الحالي.',
            variant: 'destructive',
        });
        return;
    }
    
    const childId = Date.now();
    const newSession: Child = {
      ...data,
      id: childId,
      branchName: data.branchName === 'كل الفروع' ? currentUser!.branch : data.branchName,
      checkInTime: Date.now(),
      cashierUsername: user.username,
    };

    try {
        await set(ref(db, `sessions/active/${childId}`), newSession);
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `تم تسجيل دخول الأطفال: ${children.map(c=>c.name).join(', ')}.`,
        });
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الدخول', variant: 'destructive'})
    }
  };
  
  const handleAddToCart = (item: InventoryItem) => {
      setCart(prevCart => {
          const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
          if (existingItem) {
              if (existingItem.cartQuantity < item.quantity) {
                  return prevCart.map(cartItem => 
                      cartItem.id === item.id 
                          ? { ...cartItem, cartQuantity: cartItem.cartQuantity + 1 } 
                          : cartItem
                  );
              } else {
                  toast({ title: "الكمية غير كافية", description: `لا توجد كمية إضافية متاحة من ${item.productName}.`, variant: "destructive" });
                  return prevCart;
              }
          } else {
               if (item.quantity > 0) {
                   return [...prevCart, { ...item, cartQuantity: 1 }];
               } else {
                   toast({ title: "نفدت الكمية", description: `لم يعد ${item.productName} متوفرًا في المخزون.`, variant: "destructive" });
                   return prevCart;
               }
          }
      });
  };

  const handleRemoveFromCart = (itemId: string) => {
      setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === itemId) {
              if (newQuantity > 0 && newQuantity <= item.quantity) {
                  return { ...item, cartQuantity: newQuantity };
              } else if (newQuantity > item.quantity) {
                  toast({ title: "الكمية غير كافية", description: `الكمية المتاحة هي ${item.quantity} فقط.`, variant: 'destructive' });
                  return { ...item, cartQuantity: item.quantity };
              }
          }
          return item;
      }).filter(item => item.cartQuantity > 0));
  };
  
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart]);

  const handleConfirmSale = async () => {
    if (!user?.username || !currentUser) return;

    const itemsToSave = cart.map(({ quantity, ...item}) => item);
    
    const branch = branches.find(b => b.name === currentUser.branch);
    if (!branch) {
        toast({ title: "خطأ", description: "لم يتم العثور على الفرع الحالي.", variant: "destructive"});
        return;
    }

    const counterRef = ref(db, `branches/${branch.id}/nextReceiptNumber`);
    const { committed, snapshot } = await runTransaction(counterRef, (currentValue) => {
        return (currentValue || 0) + 1;
    });
    const receiptNumber = (committed && snapshot.val()) ? snapshot.val() : 0;

    const saleRecord: ProductSale = {
        id: push(ref(db, 'productSales')).key!,
        receiptNumber: receiptNumber,
        items: itemsToSave,
        totalAmount: cartTotal,
        branchName: currentUser.branch,
        cashierUsername: user.username,
        cashierName: currentUser.name,
        createdAt: new Date().toISOString()
    }

    try {
        // 1. Record the sale
        await set(ref(db, `productSales/${saleRecord.id}`), saleRecord);

        // 2. Update inventory quantities
        const updates: { [key: string]: any } = {};
        for (const item of cart) {
            updates[`/inventory/${item.id}/quantity`] = item.quantity - item.cartQuantity;
        }
        await update(ref(db), updates);

        // 3. Print receipt
        const receiptProps: ProductReceiptProps = {
            receiptId: `${branch.name.substring(0,3).toUpperCase() || 'DEF'}-${receiptNumber}`,
            settings: receiptSettings,
            appName: policies?.appName || 'FunTrack',
            branchName: currentUser.branch,
            cashierName: currentUser.name,
            items: cart.map(item => ({ name: item.productName, quantity: item.cartQuantity, price: item.price })),
            totalAmount: cartTotal,
        }
        printReceipt(<ProductReceipt {...receiptProps} />);

        toast({ title: "تم البيع بنجاح", description: "تم تسجيل عملية البيع وتحديث المخزون." });
        setCart([]);
        setSaleCheckoutOpen(false);

    } catch (error) {
        console.error("Sale confirmation error:", error);
        toast({ title: "خطأ", description: "فشل تسجيل عملية البيع.", variant: "destructive"});
    }
  };

  const handleTimeEnd = (session: Child) => {
    const showToast = () => {
        toast({
            title: "🔔 انتهى الوقت!",
            description: `انتهى وقت اللعب للطفل/الأطفال: ${session.children.map(c=>c.name).join(', ')}.`,
            variant: "destructive",
            duration: (policies?.toastDuration || 5) * 1000,
        });
    };
    
    showToast(); // Show immediate toast

    const intervalSeconds = policies?.packageOvertimeNotificationInterval || 60;
    const intervalId = setInterval(showToast, intervalSeconds * 1000);
    notificationIntervals.set(session.id, intervalId);
  };

  const hasTimeExpired = (session: Child) => {
    if (!session.packageDuration) return false;
    const elapsedMs = Date.now() - session.checkInTime;
    const totalDurationMs = session.packageDuration * 60 * 1000;
    return elapsedMs >= totalDurationMs;
  }

  const selectedBranchName = selectedBranchFilter === 'all' ? 'كل الفروع' : selectedBranchFilter;
  const [currentTab, setCurrentTab] = useState('products-tab');

  const gameCategoriesForBranch = useMemo(() => {
      if (selectedBranchFilter === 'all') {
          return gameCategories;
      }
      const branchGameNames = new Set(games.filter(g => g.branch === selectedBranchFilter || g.branch === 'كل الفروع').map(g => g.name));
      const branchCategoryIds = new Set(games.filter(g => branchGameNames.has(g.name)).map(g => g.categoryId));
      return gameCategories.filter(c => branchCategoryIds.has(c.id));
  }, [gameCategories, games, selectedBranchFilter]);

    useEffect(() => {
        if(currentTab === 'products-tab') return;

        const isCurrentTabVisible = gameCategoriesForBranch.some(c => c.id === currentTab);
        if(!isCurrentTabVisible && gameCategoriesForBranch.length > 0) {
            setCurrentTab(gameCategoriesForBranch[0].id);
        } else if (gameCategoriesForBranch.length === 0) {
            setCurrentTab('products-tab');
        }
  }, [gameCategoriesForBranch, currentTab]);


  const gamesForSelectedCategory = useMemo(() => {
    if (currentTab === 'products-tab') return [];
    return games.filter(g => 
        g.categoryId === currentTab && 
        g.status === 'Available' &&
        (selectedBranchFilter === 'all' || g.branch === selectedBranchFilter || g.branch === 'كل الفروع')
    );
  }, [games, currentTab, selectedBranchFilter]);


  const categoryColor = useMemo(() => {
      return gameCategories.find(c => c.id === currentTab)?.color || '#ffffff';
  }, [gameCategories, currentTab])


  return (
    <div className="relative h-full grid lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Overlay for no active shift */}
            {!hasActiveShift && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 z-50">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>لا توجد وردية مفتوحة</AlertTitle>
                        <AlertDescription>
                            لا يمكنك استخدام نقاط البيع لأنه لا توجد وردية مفتوحة لحسابك.
                            {user?.username !== 'admin' && " يرجى الطلب من المدير فتح وردية لك."}
                        </AlertDescription>
                    </Alert>
                    {user?.username === 'admin' && (
                        <Link href="/shift-closing" className='mt-6'>
                            <Button>
                                <Briefcase className="me-2 h-4 w-4" />
                                الانتقال إلى إدارة الورديات
                            </Button>
                        </Link>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 z-10">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">يلا نلعب</h1>
                    <span className="text-lg text-muted-foreground font-semibold">({selectedBranchName})</span>
                </div>
                <div className="ms-auto w-full sm:w-auto">
                    <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter} disabled={currentUser?.branch !== 'كل الفروع'}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="اختر الفرع" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الفروع</SelectItem>
                            {branches.map(branch => (
                                <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        
            {policies?.showPosStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10">
                    <StatCard
                        title="الأطفال النشطون حاليًا"
                        value={`${dailyStats.activeCount}`}
                        icon={Users}
                        description={selectedBranchName === 'كل الفروع' ? `في كل الفروع` : `في ${selectedBranchName}`}
                    />
                    <StatCard
                        title="زوار اليوم"
                        value={`${dailyStats.visitorsToday}`}
                        icon={UserCheck}
                        description="إجمالي عدد الأطفال الذين خرجوا اليوم"
                    />
                    <StatCard
                        title="جلسات اليوم المنتهية"
                        value={`${dailyStats.sessionsToday}`}
                        icon={Clock}
                        description="إجمالي عدد الجلسات المنتهية اليوم"
                    />
                </div>
            )}
        
            <div className="flex-grow flex flex-col gap-4 z-10">
                {/* Games Section */}
                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="flex flex-wrap h-auto">
                    {gameCategoriesForBranch.map(category => (
                        <TabsTrigger 
                            key={category.id} 
                            value={category.id} 
                            className="transition-all"
                            style={{
                                backgroundColor: currentTab === category.id ? category.color : '',
                                color: currentTab === category.id ? 'white' : '',
                                borderColor: category.color
                            }}
                        >
                            {category.name}
                        </TabsTrigger>
                    ))}
                    <TabsTrigger value="products-tab" className="transition-all">
                        <ShoppingCart className="me-2 h-4 w-4" />
                        المنتجات
                    </TabsTrigger>
                    </TabsList>
                    
                    {/* Game Categories Content */}
                     {gameCategoriesForBranch.map(category => (
                        <TabsContent key={category.id} value={category.id}>
                            <Card className="min-h-[150px] mt-4">
                                <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-6">
                                    {gamesForSelectedCategory.map(game => (
                                        <button 
                                            key={game.id} 
                                            onClick={() => openCheckInDialog(game)} 
                                            disabled={!hasActiveShift}
                                            className="aspect-video border rounded-lg flex flex-col items-center justify-center p-2 gap-2 text-center hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                            style={{ backgroundColor: `${categoryColor}33` }} // 33 for ~20% opacity
                                        >
                                            <p className="font-semibold text-sm">{game.name}</p>
                                            <p className="text-xs text-muted-foreground">{game.gameType === 'hourly' && game.hourly_rate ? `ج.م ${game.hourly_rate}/ساعة` : 'باقات وقت'}</p>
                                        </button>
                                    ))}
                                    {gamesForSelectedCategory.length === 0 && (
                                        <div className="col-span-full text-center text-muted-foreground py-16">
                                            لا توجد ألعاب متاحة في هذا التصنيف لهذا الفرع.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}


                    {/* Products Content */}
                    <TabsContent value="products-tab">
                        <Card className="min-h-[150px] mt-4">
                            <CardHeader>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="w-full md:w-1/3">
                                        <Select value={selectedProductCategory} onValueChange={setSelectedProductCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر فئة المنتج" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allProductCategories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="w-full md:w-1/3">
                                        <Input 
                                            placeholder="ابحث عن منتج بالاسم..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                        />
                                     </div>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pt-6">
                                {filteredProductsForDisplay.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleAddToCart(item)}
                                        disabled={!hasActiveShift || item.quantity <= 0}
                                        className="aspect-square border rounded-lg flex flex-col items-center justify-center p-2 gap-1 text-center hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none relative"
                                    >
                                        {item.quantity <= 0 && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-bold">نفدت</div>}
                                        <p className="font-semibold text-xs text-center">{item.productName}</p>
                                        <p className="text-xs text-primary font-bold">{`ج.م ${item.price.toFixed(2)}`}</p>
                                    </button>
                                ))}
                                {filteredProductsForDisplay.length === 0 && (
                                    <div className="col-span-full text-center text-muted-foreground py-16">
                                        لا توجد منتجات تطابق بحثك.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Active Children Section */}
                <Card>
                    <CardHeader>
                        <div className='flex justify-between items-center'>
                            <CardTitle>{policies?.posLabels?.activeSessionsTitle || 'الأطفال النشطون حاليًا'}</CardTitle>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث بالطفل أو ولي الأمر أو الرقم..."
                                value={activeSearch}
                                onChange={(e) => setActiveSearch(e.target.value)}
                                className="w-full pl-8"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">{policies?.posLabels?.childColumnTitle || 'الطفل'}</TableHead>
                                    <TableHead className="text-right">{policies?.posLabels?.parentColumnTitle || 'ولي الأمر'}</TableHead>
                                    <TableHead className="text-right">اللعبة</TableHead>
                                    <TableHead className="text-center">الوقت</TableHead>
                                    <TableHead className="text-center">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {searchedActiveChildren.length > 0 ? (
                                searchedActiveChildren.map((session) => (
                                    <TableRow key={session.id} className={cn(hasTimeExpired(session) && "bg-red-100 dark:bg-red-900/30")}>
                                    <TableCell className="font-medium text-right">{session.children.map(c => c.name).join(', ')}</TableCell>
                                    <TableCell className="text-right">{session.parentName}</TableCell>
                                    <TableCell className="text-right">{session.game}</TableCell>
                                    <TableCell className="text-center">
                                        <TimeCounter 
                                            startTime={session.checkInTime} 
                                            packageDuration={session.packageDuration}
                                            onTimeEnd={() => handleTimeEnd(session)} 
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => openCheckOutDialog(session)}
                                        disabled={!hasActiveShift}
                                        >
                                        <Square className="me-2 h-4 w-4" />
                                        خروج
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                    لا يوجد أطفال نشطون حاليًا يطابقون بحثك.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>


                {/* Completed Sessions Section */}
                {policies?.showCompletedSessions && (
                    <Collapsible>
                        <Card>
                            <CardHeader>
                                <CollapsibleTrigger asChild>
                                    <button className="flex justify-between items-center w-full">
                                        <CardTitle>أحدث الجلسات المنتهية (في ورديتك)</CardTitle>
                                        <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                                    </button>
                                </CollapsibleTrigger>
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right">الطفل</TableHead>
                                                <TableHead className="text-right">ولي الأمر</TableHead>
                                                <TableHead className="text-center">وقت الخروج</TableHead>
                                                <TableHead className="text-center">قبل الخصم</TableHead>
                                                <TableHead className="text-center">الخصم</TableHead>
                                                <TableHead className="text-center">بعد الخصم</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {todaysCompletedSessions.length > 0 ? (
                                                todaysCompletedSessions.map((session) => {
                                                    const costBeforeDiscount = session.costBeforeDiscount > 0
                                                        ? session.costBeforeDiscount
                                                        : session.cost + (session.discount || 0);

                                                    return (
                                                    <TableRow key={session.id}>
                                                        <TableCell className="font-medium text-right">{session.children?.map(c => c.name).join(', ') ?? 'N/A'}</TableCell>
                                                        <TableCell className="text-right">{session.parentName}</TableCell>
                                                        <TableCell className="text-center">{new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}</TableCell>
                                                        <TableCell className="text-center">{`ج.م ${costBeforeDiscount.toFixed(2)}`}</TableCell>
                                                        <TableCell className="text-center text-red-600">{`ج.م ${(session.discount || 0).toFixed(2)}`}</TableCell>
                                                        <TableCell className="font-bold text-center">
                                                            {session.subscriptionId ? (
                                                                <span className="flex items-center justify-center gap-1 text-green-600"><Star className="h-4 w-4"/> اشتراك</span>
                                                            ) : session.packagePrice ? (
                                                                <span className="flex items-center justify-center gap-1 text-blue-600"><PackageCheck className="h-4 w-4"/> باقة</span>
                                                            ) : `ج.م ${session.cost.toFixed(2)}`}
                                                        </TableCell>
                                                    </TableRow>
                                                )})
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
                                                        لم تكتمل أي جلسات في ورديتك بعد.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                )}
            </div>
        
            <CheckInDialog
                open={isCheckInDialogOpen}
                onOpenChange={setCheckInDialogOpen}
                selectedGame={selectedGame}
                onConfirm={handleCheckIn}
            />
            <CheckOutDialog 
                open={isCheckoutDialogOpen}
                onOpenChange={setCheckoutDialogOpen}
                child={childToCheckout}
                onConfirm={handleCheckOut}
            />
        </div>
        {/* Cart Section */}
        <div className="lg:col-span-1">
            <Card className="sticky top-4">
                <CardHeader>
                    <CardTitle>سلة التسوق</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cart.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">سلة التسوق فارغة.</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">{`ج.م ${item.price.toFixed(2)}`}</p>
                                    </div>
                                    <Input 
                                        type="number" 
                                        className="w-16 h-8"
                                        value={item.cartQuantity}
                                        onChange={(e) => handleUpdateCartQuantity(item.id, parseInt(e.target.value))}
                                        min={1}
                                        max={item.quantity}
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFromCart(item.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>الإجمالي:</span>
                        <span>{`ج.م ${cartTotal.toFixed(2)}`}</span>
                    </div>
                    <Button className="w-full" disabled={cart.length === 0 || !hasActiveShift} onClick={handleConfirmSale}>
                        إتمام الدفع
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}


export default function PosTrackingPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <PosTrackingContent />
            </main>
            </div>
        </SidebarProvider>
    );
}




'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { PlayCircle, Square, AlertTriangle, ChevronsUpDown, Check, PlusCircle, Star, Clock, Users, UserCheck, Briefcase, Search, ChevronDown, PackageCheck, Phone, ShoppingCart, Trash2, UserPlus, StarIcon, Minus, History, KeyRound, ReceiptIcon } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, Game, Employee, Customer, Subscription, GameCategory, CustomerChild, CompletedSession, Policies, DayOfWeek, ReceiptSettings, Branch, InventoryItem, ProductSale, Product, ProductCategory, SubscriptionPlan, PrepaidGameCartItem, PosReceiptProps, ExtendSessionCartItem, ProductSaleItem, InventoryMovement } from '@/lib/types';
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
import SubscriptionFormDialog from '../subscriptions/_components/SubscriptionFormDialog';
import Link from 'next/link';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { startOfDay, isToday } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PosReceipt } from '@/components/Receipt';
import { usePosPrint } from '@/hooks/use-pos-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/StatCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ProductReceipt, type ProductReceiptProps } from '@/components/ProductReceipt';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';


const TimeCounter = ({ startTime, packageDuration, gracePeriodInMinutes = 0, onTimeEnd }: { startTime: number, packageDuration?: number, gracePeriodInMinutes?: number, onTimeEnd?: () => void }) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState<'playing' | 'grace_period' | 'overtime'>('playing');
  const timeEnded = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const updateTimer = () => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        setElapsed(elapsedMs);

        if (packageDuration) {
            const totalDurationMs = packageDuration * 60 * 1000;
            const gracePeriodMs = gracePeriodInMinutes * 60 * 1000;
            const newRemaining = Math.max(0, totalDurationMs - elapsedMs);
            setRemaining(newRemaining);
            
            if (elapsedMs > totalDurationMs + gracePeriodMs) {
                setStatus('overtime');
            } else if (elapsedMs > totalDurationMs) {
                setStatus('grace_period');
            } else {
                setStatus('playing');
            }
            
            if (newRemaining === 0 && !timeEnded.current) {
                timeEnded.current = true;
                onTimeEnd?.();
            }
        }
    };
    
    updateTimer(); // Run once immediately
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, packageDuration, gracePeriodInMinutes, onTimeEnd]);
  
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
  
  const getOvertime = () => {
      if (!packageDuration || !elapsed) return 0;
      const packageDurationMs = packageDuration * 60 * 1000;
      const gracePeriodMs = gracePeriodInMinutes * 60 * 1000;
      return Math.max(0, elapsed - packageDurationMs - gracePeriodMs);
  };

  if (packageDuration) {
      if (remaining === null) return <span>...</span>;

      let displayText = formatTime(remaining);
      let textColor = "";

      switch (status) {
          case 'grace_period':
              textColor = "text-orange-500";
              displayText = `00:00:00`;
              break;
          case 'overtime':
              textColor = "text-red-500 animate-pulse";
              displayText = `+${formatTime(getOvertime())}`;
              break;
          default:
              if (remaining <= 5 * 60 * 1000) {
                  textColor = "text-orange-500";
              }
              break;
      }
      
      return (
        <span 
          className={cn("font-mono font-bold", textColor)}
          dir="ltr"
        >
          {displayText}
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
    let durationHours = durationMs / (1000 * 60 * 60);
    const durationMinutes = durationMs / (1000 * 60);

    // New promotion logic
    const freeMinutes = policies?.buyOneHourGetXFreeMinutes || 0;
    if (freeMinutes > 0 && durationMinutes > 60 && durationMinutes <= 60 + freeMinutes) {
        durationHours = 1; // Charge for exactly 1 hour
    } else {
        // Apply rounding policy only if the promotion doesn't apply or is exceeded
        if (policies?.roundingPolicy && policies.roundingPolicy !== 'none') {
            const minutes = durationHours * 60;
            let roundingMinutes: number;
            switch(policies.roundingPolicy) {
                case 'quarter-hour': roundingMinutes = 15; break;
                case 'half-hour': roundingMinutes = 30; break;
                case 'hour': roundingMinutes = 60; break;
                default: roundingMinutes = 1;
            }
             // We only round up if the time is not exactly on the hour/half-hour etc.
             if (minutes > 0) {
                 durationHours = Math.ceil(minutes / roundingMinutes) * roundingMinutes / 60;
             }
        }
    }
    
    // Cost is per child
    const durationCost = (durationHours * hourlyRate) * numberOfChildren;

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
  canApplyDiscount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
  onConfirm: (child: Child, receiptDetails: PosReceiptProps) => void;
  canApplyDiscount: boolean;
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
    let costBeforeDiscount: number = 0;
    let durationCost: number = 0;
    let entryFee: number = 0;
    let overtimeCost: number = 0;

    if (isPackageGame) {
        costBeforeDiscount = child.packagePrice || 0;
        if (policies?.enablePackageOvertime && child.packageDuration) {
            const packageDurationMs = child.packageDuration * 60 * 1000;
            const gracePeriodMs = (policies.packageOvertimeGracePeriod || 0) * 60 * 1000;
            const chargeableOvertimeMs = Math.max(0, durationMs - packageDurationMs - gracePeriodMs);

            if (chargeableOvertimeMs > 0) {
                let overtimeMinutes = chargeableOvertimeMs / (1000 * 60);

                if (policies.packageOvertimeRounding && policies.packageOvertimeRounding !== 'none') {
                    let roundingMinutes = 1;
                    switch(policies.packageOvertimeRounding) {
                        case 'quarter-hour': roundingMinutes = 15; break;
                        case 'half-hour': roundingMinutes = 30; break;
                        case 'hour': roundingMinutes = 60; break;
                    }
                     if (overtimeMinutes > 0) {
                        overtimeMinutes = Math.ceil(overtimeMinutes / roundingMinutes) * roundingMinutes;
                    }
                }
                overtimeCost = overtimeMinutes * (policies.packageOvertimeRatePerMinute || 0);
            }
        }
        costBeforeDiscount += overtimeCost;
    } else {
        const gameDetails = games.find((g) => g.name === child.game);
        let hourlyRate = gameDetails?.price || 0;

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

        const { durationCost: calculatedDurationCost } = calculateCost(durationMs, hourlyRate, policies, nonSubscribedChildrenCount);
        durationCost = calculatedDurationCost;
        costBeforeDiscount = durationCost;
    }

    const entryFeePolicy = policies?.entryFeeApplication;
    if (policies && policies.entryFee > 0 && ((entryFeePolicy === 'all') || (entryFeePolicy === 'hourly' && !isPackageGame) || (entryFeePolicy === 'package' && isPackageGame))) {
        entryFee = policies.entryFee * numberOfChildren;
        costBeforeDiscount += entryFee;
    }

    const discountAmount = parseFloat(discount) || 0;
    const finalTotalCost = Math.max(0, costBeforeDiscount - discountAmount);

    return {
        duration: formatDuration(durationMs),
        totalCost: finalTotalCost,
        costBeforeDiscount: costBeforeDiscount,
        durationCost: durationCost,
        entryFee: entryFee,
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
    
    const receiptDetails: PosReceiptProps = {
        settings: receiptSettings,
        appName: policies?.appName || 'FunTrack',
        branchName: child.branchName,
        children: child.children,
        parentName: child.parentName,
        phoneNumbers: child.phoneNumbers,
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
        packageName: child.packageName,
        packageDuration: child.packageDuration,
        overtimeCost: checkoutData.overtimeCost,
    };
    
    onConfirm(child, receiptDetails);
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
                    <AlertTitle className="text-blue-800">جلسة مدفوعة مسبقاً</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      هذه الجلسة مدفوعة مسبقاً. سيتم فقط احتساب الوقت الإضافي إن وجد.
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
                    disabled={!canApplyDiscount}
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

type SelectedPackageType = {
    duration: number;
    price: number;
    label: string;
};

type SelectedPackagesMap = { [label: string]: { package: SelectedPackageType; quantity: number } };

function CheckInDialog({
    open,
    onOpenChange,
    selectedGame,
    onConfirmPostpaid,
    onConfirmPrepaid,
    policies,
} : {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    selectedGame: Game | null,
    onConfirmPostpaid: (childData: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>) => void,
    onConfirmPrepaid: (cartItem: PrepaidGameCartItem) => void,
    policies: Policies | null,
}) {
    const { customers } = useCustomers();
    const { toast } = useToast();

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<CustomerChild[]>([]);
    const [guestChildren, setGuestChildren] = useState<CustomerChild[]>([]);
    const [selectedPackages, setSelectedPackages] = useState<SelectedPackagesMap>({});
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
    
    useEffect(() => {
        if (!open) {
            setSelectedCustomer(null);
            setSelectedChildren([]);
            setGuestChildren([]);
            setSelectedPackages({});
            setOpenCombobox(false);
        }
    }, [open]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedChildren([]); // Reset selected children when customer changes
        setGuestChildren([]); // Reset guest children
        setOpenCombobox(false);
    }
    
    const handleChildSelect = (child: CustomerChild, checked: boolean) => {
        setSelectedChildren(prev => 
            checked ? [...prev, child] : prev.filter(c => c.id !== child.id)
        );
    }

    const addGuestChild = () => {
        setGuestChildren(prev => [...prev, { id: `guest-${Date.now()}`, name: '', age: 1, isGuest: true }]);
    }
    
    const updateGuestChild = (id: string, field: 'name' | 'age', value: string) => {
        setGuestChildren(prev => prev.map(child => {
            if (child.id === id) {
                return { ...child, [field]: field === 'age' ? parseInt(value, 10) || 1 : value };
            }
            return child;
        }));
    }

    const removeGuestChild = (id: string) => {
        setGuestChildren(prev => prev.filter(child => child.id !== id));
    }
    
    const handlePackageQuantityChange = (pkg: SelectedPackageType, change: 1 | -1) => {
        setSelectedPackages(prev => {
            const newPackages = { ...prev };
            const existing = newPackages[pkg.label];

            if (existing) {
                if (change === 1) {
                    existing.quantity += 1;
                } else {
                    existing.quantity -= 1;
                    if (existing.quantity <= 0) {
                        delete newPackages[pkg.label];
                    }
                }
            } else if (change === 1) {
                newPackages[pkg.label] = { package: pkg, quantity: 1 };
            }
            return newPackages;
        });
    };
    
    const togglePackageSelection = (pkg: SelectedPackageType) => {
        setSelectedPackages(prev => {
            const newPackages = { ...prev };
            if (newPackages[pkg.label]) {
                delete newPackages[pkg.label];
            } else {
                newPackages[pkg.label] = { package: pkg, quantity: 1 };
            }
            return newPackages;
        });
    };
    
    const { totalDuration, totalPrice } = useMemo(() => {
        let duration = 0;
        let price = 0;
        for (const key in selectedPackages) {
            const item = selectedPackages[key];
            duration += item.package.duration * item.quantity;
            price += item.package.price * item.quantity;
        }
        return { totalDuration: duration, totalPrice: price };
    }, [selectedPackages]);


    const handleConfirm = () => {
        const allChildren = [...selectedChildren, ...guestChildren.filter(g => g.name)];
        if (!selectedCustomer || allChildren.length === 0 || !selectedGame) return;
        
        const isPrepaid = selectedGame.paymentModel === 'prepaid';
        
        if (isPrepaid) {
            if (Object.keys(selectedPackages).length === 0) {
                toast({ title: "يرجى اختيار باقة وقت واحدة على الأقل", variant: "destructive" });
                return;
            }
            
            const totalPackagePrice = Object.values(selectedPackages).reduce((sum, {package: pkg, quantity}) => sum + (pkg.price * quantity), 0);
            const totalPackageDuration = Object.values(selectedPackages).reduce((sum, {package: pkg, quantity}) => sum + (pkg.duration * quantity), 0);
            let cartQuantity = Object.values(selectedPackages).reduce((sum, { quantity }) => sum + quantity, 0);

            let finalPrice = totalPackagePrice;
            if (policies?.packagePricingModel === 'per_child') {
                finalPrice = totalPackagePrice * allChildren.length;
                cartQuantity = allChildren.length;
            }
            
             // Apply entry fee to prepaid if applicable
            if (policies && policies.entryFee > 0 && (policies.entryFeeApplication === 'all' || policies.entryFeeApplication === 'package')) {
                finalPrice += policies.entryFee * allChildren.length;
            }

            const cartItem: PrepaidGameCartItem = {
                type: 'prepaid-game',
                id: `prepaid-${selectedGame.id}-${selectedCustomer.id}-${Date.now()}`,
                sessionDetails: {
                    children: allChildren,
                    game: selectedGame.name,
                    branchName: selectedGame.branch,
                    parentName: selectedCustomer.parentName,
                    phoneNumbers: selectedCustomer.phoneNumbers,
                    packageDuration: totalPackageDuration,
                    packagePrice: finalPrice, // Store the final total price here
                    packageName: Object.values(selectedPackages).map(item => `${item.quantity}x ${item.package.label}`).join(', '),
                },
                price: finalPrice,
                cartQuantity: cartQuantity,
            };
            onConfirmPrepaid(cartItem);

        } else {
            const sessionDetails: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'> = {
                children: allChildren,
                game: selectedGame.name,
                branchName: selectedGame.branch,
                parentName: selectedCustomer.parentName,
                phoneNumbers: selectedCustomer.phoneNumbers,
            };
            onConfirmPostpaid(sessionDetails);
        }

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
          toast({
                title: "تمت الإضافة بنجاح",
                description: `تمت إضافة العميل "${newCustomerData.parentName}".`,
          });
          setCustomerFormOpen(false); // Close dialog on success
      } catch(e) {
          console.error(e);
      }
    };
    
    const totalChildren = selectedChildren.length + guestChildren.filter(g => g.name).length;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>تسجيل دخول: {selectedGame?.name}</DialogTitle>
                        <DialogDescription>
                            {selectedGame?.paymentModel === 'prepaid' 
                                ? "اختر العميل والأطفال والباقة لإضافة الجلسة إلى سلة التسوق."
                                : "اختر العميل والأطفال لبدء جلسة اللعب."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
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
                            <>
                                <div className="space-y-2">
                                    <Label>اختر الأطفال المسجلين</Label>
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
                                <div className="space-y-2">
                                    <Label>إضافة أطفال ضيوف (لحساب التكلفة فقط)</Label>
                                    <div className="space-y-2">
                                        {guestChildren.map((guest, index) => (
                                            <div key={guest.id} className="grid grid-cols-12 gap-2 items-center">
                                                <Input 
                                                    className="col-span-6" 
                                                    placeholder={`اسم الطفل الضيف ${index + 1}`} 
                                                    value={guest.name} 
                                                    onChange={(e) => updateGuestChild(guest.id, 'name', e.target.value)}
                                                />
                                                <Input 
                                                    className="col-span-4" 
                                                    type="number"
                                                    placeholder="العمر" 
                                                    value={guest.age} 
                                                    onChange={(e) => updateGuestChild(guest.id, 'age', e.target.value)}
                                                />
                                                <Button className="col-span-2" variant="destructive" size="icon" onClick={() => removeGuestChild(guest.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={addGuestChild}>
                                        <PlusCircle className="me-2 h-4 w-4"/>
                                        إضافة طفل ضيف
                                    </Button>
                                </div>
                            </>
                        )}
                        {selectedGame?.paymentModel === 'prepaid' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اختر باقة (يمكن اختيار أكثر من باقة)</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedGame?.fixedTimePackages?.map(pkg => (
                                            <button
                                                key={pkg.label}
                                                onClick={() => togglePackageSelection(pkg)}
                                                className={cn(
                                                    "border p-2 rounded-md text-center hover:bg-muted transition-colors h-auto flex flex-col items-center justify-center",
                                                     selectedPackages[pkg.label] ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent"
                                                )}
                                            >
                                                <p className="font-semibold">{pkg.label}</p>
                                                <p className="text-sm">{pkg.duration} دقيقة</p>
                                                <p className="text-xs font-bold">{pkg.price} ج.م</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {Object.keys(selectedPackages).length > 0 && (
                                     <div className="space-y-2 rounded-md border p-4">
                                         <h4 className="font-medium text-center mb-2">الباقات المحددة</h4>
                                         {Object.values(selectedPackages).map(({package: pkg, quantity}) => (
                                              <div key={pkg.label} className="flex justify-between items-center">
                                                  <div>
                                                      <p className="font-medium">{pkg.label}</p>
                                                      <p className="text-xs text-muted-foreground">{pkg.price} ج.م</p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePackageQuantityChange(pkg, -1)}><Minus className="h-4 w-4" /></Button>
                                                      <span className="font-bold">{quantity}</span>
                                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePackageQuantityChange(pkg, 1)}><PlusCircle className="h-4 w-4" /></Button>
                                                  </div>
                                              </div>
                                         ))}
                                         <Separator className="my-2" />
                                          <div className="flex justify-between items-center font-bold">
                                              <span>الإجمالي:</span>
                                              <span>{totalDuration} دقيقة / {totalPrice.toFixed(2)} ج.م</span>
                                          </div>
                                     </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <Button onClick={handleConfirm} disabled={totalChildren === 0 || !selectedCustomer || (selectedGame?.paymentModel === 'prepaid' && Object.keys(selectedPackages).length === 0)}>
                           {selectedGame?.paymentModel === 'prepaid' ? 'إضافة للسلة' : 'بدء اللعب'}
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

type CartItem = (InventoryItem | PrepaidGameCartItem | ExtendSessionCartItem) & { cartQuantity: number };

function EarlyCheckoutDialog({
  open,
  onOpenChange,
  session,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Child | null;
  onConfirm: (discount: number) => void;
}) {
  const [discount, setDiscount] = useState('');

  useEffect(() => {
    if (open) {
      setDiscount('');
    }
  }, [open]);

  if (!session) return null;

  const handleConfirm = () => {
    onConfirm(parseFloat(discount) || 0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>خصم الخروج المبكر</DialogTitle>
          <DialogDescription>
            الطفل يغادر مبكراً. يمكنك تسجيل خصم أو استرداد نقدي للوقت المتبقي.
            التكلفة الأصلية للباقة كانت {session.packagePrice?.toFixed(2) || '0.00'} ج.م.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="early-discount">قيمة الخصم/الاسترداد (ج.م)</Label>
          <Input
            id="early-discount"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </DialogClose>
          <Button onClick={handleConfirm}>تأكيد الخصم والخروج</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendSessionDialog({
  open,
  onOpenChange,
  session,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Child | null;
  onConfirm: (item: ExtendSessionCartItem) => void;
}) {
    const { games } = useFirebase();
    const { toast } = useToast();
    const [selectedPackage, setSelectedPackage] = useState<SelectedPackageType | null>(null);

    useEffect(() => {
        if (!open) {
            setSelectedPackage(null);
        }
    }, [open]);

    const game = useMemo(() => {
        if (!session) return null;
        return games.find(g => g.name === session.game);
    }, [session, games]);

    const handleConfirm = () => {
        if (!session || !game || !selectedPackage) {
            toast({ title: 'يرجى اختيار باقة للتمديد', variant: 'destructive' });
            return;
        }

        const cartItem: ExtendSessionCartItem = {
            type: 'extend-session',
            id: `extend-${session.id}-${Date.now()}`,
            activeSessionId: session.id,
            childName: session.children.map(c => c.name).join(', '),
            gameName: session.game,
            packageName: selectedPackage.label,
            packageDuration: selectedPackage.duration,
            price: selectedPackage.price,
            cartQuantity: 1,
        };

        onConfirm(cartItem);
        onOpenChange(false);
    };

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تمديد وقت: {session.children.map(c => c.name).join(', ')}</DialogTitle>
                    <DialogDescription>
                        اختر باقة وقت إضافية لإضافتها إلى سلة التسوق. سيتم تحديث وقت الجلسة بعد الدفع.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Label>اختر باقة التمديد</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {game?.fixedTimePackages?.map(pkg => (
                            <button
                                key={pkg.label}
                                onClick={() => setSelectedPackage(pkg)}
                                className={cn(
                                    "border p-2 rounded-md text-center hover:bg-muted transition-colors h-auto flex flex-col items-center justify-center",
                                    selectedPackage?.label === pkg.label ? "ring-2 ring-primary" : ""
                                )}
                            >
                                <p className="font-semibold">{pkg.label}</p>
                                <p className="text-sm">{pkg.duration} دقيقة</p>
                                <p className="text-xs font-bold">{pkg.price} ج.م</p>
                            </button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={!selectedPackage}>إضافة للسلة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PosTrackingContent() {
  const { activeChildren: firebaseActiveChildren, completedSessions: firebaseCompletedSessions, subscriptions, games, policies: allPolicies, openShifts, employees, branches, gameCategories, products, inventory, productCategories, receiptSettings, loading: firebaseLoading } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const { printReceipt } = usePosPrint();
  const { customers } = useCustomers();
  const { activeChildren, setActiveChildren } = useSession();


  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  
  const [isCheckInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  const [isCheckoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [isZeroCostCheckoutOpen, setZeroCostCheckoutOpen] = useState(false);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);
  
  const [isExtendDialogOpen, setExtendDialogOpen] = useState(false);
  const [childToExtend, setChildToExtend] = useState<Child | null>(null);
  
  const [isEarlyCheckoutDiscountOpen, setEarlyCheckoutDiscountOpen] = useState(false);

  const [activeSearch, setActiveSearch] = useState('');
  
  // Dialog control
  const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
  const [isSubscriptionFormOpen, setSubscriptionFormOpen] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotes, setCartNotes] = useState('');
  const [isSaleCheckoutOpen, setSaleCheckoutOpen] = useState(false);
  
  const [currentTime, setCurrentTime] = useState<string>('');

  const notificationIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map()).current;


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
    
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit'}));
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);
  
  const canApplyDiscount = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.canApplyDiscount === true;
  }, [currentUser]);

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

  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState(productCategories.length > 0 ? productCategories[0].id : '');

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
  
  const openExtendDialog = (session: Child) => {
    setChildToExtend(session);
    setExtendDialogOpen(true);
  }

  const stopNotificationForSession = useCallback((sessionId: string) => {
    if (notificationIntervals.has(sessionId)) {
        clearInterval(notificationIntervals.get(sessionId)!);
        notificationIntervals.delete(sessionId);
    }
  }, [notificationIntervals]);
  
  const handleCheckoutClick = (session: Child) => {
    setChildToCheckout(session);
    
    stopNotificationForSession(session.id); // Stop notifications as soon as checkout starts
    
    const isPackageGame = session?.packageDuration && session.packageDuration > 0;
    if (isPackageGame) {
        
        const remainingTimeMs = (session.checkInTime + session.packageDuration * 60 * 1000) - Date.now();
        
        // If they leave early and the cashier can apply a discount
        if (remainingTimeMs > 5 * 60 * 1000 && canApplyDiscount) {
            setEarlyCheckoutDiscountOpen(true);
            return;
        }

        const gracePeriodMs = (policies?.packageOvertimeGracePeriod || 0) * 60 * 1000;
        const elapsedMs = Date.now() - session.checkInTime;
        const packageDurationMs = session.packageDuration * 60 * 1000;
        const chargeableOvertimeMs = Math.max(0, elapsedMs - packageDurationMs - gracePeriodMs);

        // If there's no chargeable overtime, checkout is free.
        if (chargeableOvertimeMs <= 0) {
            setZeroCostCheckoutOpen(true);
            return;
        }
    }
    
    setCheckoutDialogOpen(true);
  };
  
    const handleEarlyCheckoutConfirm = (discount: number) => {
        if (!childToCheckout) return;
        
        const cashier = employees.find(e => e.username === user?.username);
        const cashierName = user?.username === 'admin' 
            ? 'Admin' 
            : cashier?.name || user?.username || 'N/A';
        
        const originalPrice = childToCheckout.packagePrice || 0;
        const finalCost = Math.max(0, originalPrice - discount);

        const receiptDetails: PosReceiptProps = {
            settings: receiptSettings,
            appName: policies?.appName || 'FunTrack',
            branchName: childToCheckout.branchName,
            children: childToCheckout.children,
            parentName: childToCheckout.parentName,
            phoneNumbers: childToCheckout.phoneNumbers,
            gameName: childToCheckout.game,
            checkInTime: new Date(childToCheckout.checkInTime),
            checkOutTime: new Date(),
            duration: formatDuration(Date.now() - childToCheckout.checkInTime),
            totalCost: finalCost,
            discount: discount,
            cashierName: cashierName,
            isSubscription: false,
            packagePrice: childToCheckout.packagePrice,
            packageName: childToCheckout.packageName,
            packageDuration: childToCheckout.packageDuration,
            overtimeCost: 0, // No overtime on early checkout
            notes: `خروج مبكر - خصم ${discount.toFixed(2)}`,
        };
        
        handleCheckOut(childToCheckout, receiptDetails);
        setEarlyCheckoutDiscountOpen(false);
  };


  const handleCheckOut = async (child: Child, receiptDetails: PosReceiptProps) => {
    stopNotificationForSession(child.id);
    setCheckoutDialogOpen(false);
    setZeroCostCheckoutOpen(false);

    if (!child) return;
    
    const branch = branches.find(b => b.name === child.branchName);
    let finalReceiptNumber = child.receiptNumber || 0;
    
    if (branch?.id && !child.prepaidSessionId) {
        const counterRef = ref(db, `branches/${branch.id}/nextReceiptNumber`);
        const { committed, snapshot } = await runTransaction(counterRef, (currentValue) => (currentValue || 0) + 1);
        if (committed) {
          finalReceiptNumber = snapshot.val();
        }
    }
    
    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - child.checkInTime;

    const sessionToSave: Omit<CompletedSession, 'id'> = {
        ...child,
        checkOutTime: checkOutTime.getTime(),
        durationMs: durationMs,
        cost: receiptDetails.totalCost,
        costBeforeDiscount: (receiptDetails.totalCost) + (receiptDetails.discount || 0),
        durationCost: receiptDetails.durationCost,
        entryFee: receiptDetails.entryFee,
        discount: receiptDetails.discount,
        receiptNumber: finalReceiptNumber,
        overtimeCost: receiptDetails.overtimeCost,
        notes: receiptDetails.notes || '',
    };
    
    if (receiptSettings) {
        printReceipt(<PosReceipt {...receiptDetails} receiptId={`${sessionToSave.branchName.substring(0,3).toUpperCase()}-${finalReceiptNumber}`} />);
    }

    try {
        if (child.prepaidSessionId) {
            // This is a prepaid session, update the original completed session record
            const completedSessionRef = ref(db, `sessions/completed/${child.prepaidSessionId}`);
            // We only update the checkout time, duration, and any new costs (overtime/discount)
            await update(completedSessionRef, {
                checkOutTime: sessionToSave.checkOutTime,
                durationMs: sessionToSave.durationMs,
                // Add new costs to the original cost.
                cost: (child.packagePrice || 0) + (sessionToSave.overtimeCost || 0) - (sessionToSave.discount || 0),
                discount: (receiptDetails.discount || 0),
                overtimeCost: (receiptDetails.overtimeCost || 0),
                notes: receiptDetails.notes || '',
            });
        } else {
             // This is a regular postpaid session, create a new completed session
             await set(ref(db, `sessions/completed/${child.id}`), sessionToSave);
        }
        // Always remove the active session
        await remove(ref(db, `sessions/active/${child.id}`));
        setActiveChildren(prev => prev.filter(c => c.id !== child.id));


    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الخروج', variant: 'destructive'})
    }
  };

  const handleStartSession = async (data: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>, prepaidSessionId?: string, receiptNumber?: number) => {
    const { children } = data;
    
    if (policies && policies.maxCapacity && (firebaseActiveChildren.length + children.length) > policies.maxCapacity) {
        toast({
            title: 'تم الوصول للحد الأقصى',
            description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${policies.maxCapacity} طفل.`,
            variant: 'destructive',
        });
        return;
    }

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
        toast({ title: 'خطأ', description: 'لم يتم تحديد الكاشير الحالي.', variant: 'destructive' });
        return;
    }
    
    const newSessionRef = push(ref(db, 'sessions/active'));
    const newSessionId = newSessionRef.key!;

    const newSession: Child = {
      ...data,
      id: newSessionId,
      branchName: data.branchName === 'كل الفروع' ? currentUser!.branch : data.branchName,
      checkInTime: Date.now(),
      cashierUsername: user.username,
      prepaidSessionId: prepaidSessionId || null,
      receiptNumber: receiptNumber || undefined,
    };

    try {
        await set(newSessionRef, newSession);
        toast({ title: 'تم تسجيل الدخول بنجاح', description: `تم تسجيل دخول الأطفال: ${children.map(c=>c.name).join(', ')}.` });
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الدخول', variant: 'destructive'})
    }
  };

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
          toast({
                title: "تمت الإضافة بنجاح",
                description: `تمت إضافة العميل "${newCustomerData.parentName}".`,
          });
          setCustomerFormOpen(false); // Close dialog on success
      } catch(e) {
          console.error(e);
      }
    };
  
    const handleAddToCart = (item: InventoryItem) => {
        setCart(prevCart => {
            const itemWithDefaults = { ...item, type: 'product' as const };
            const existingItem = prevCart.find(cartItem => cartItem.id === itemWithDefaults.id);
            if (existingItem) {
                if ('quantity' in item && existingItem.cartQuantity >= item.quantity) {
                    toast({ title: "الكمية غير كافية", variant: "destructive" });
                    return prevCart;
                }
                return prevCart.map(cartItem => 
                    cartItem.id === itemWithDefaults.id 
                        ? { ...cartItem, cartQuantity: cartItem.cartQuantity + 1 } 
                        : cartItem
                );
            } else {
                 if ('quantity' in item && item.quantity <= 0) {
                    toast({ title: "نفدت الكمية", variant: "destructive" });
                    return prevCart;
                }
                return [...prevCart, { ...itemWithDefaults, cartQuantity: 1 }];
            }
        });
    };
  
    const handleConfirmPrepaid = (cartItem: PrepaidGameCartItem) => {
        let finalCartQuantity = 1;
        if (policies?.packagePricingModel === 'per_child') {
            finalCartQuantity = cartItem.sessionDetails.children.length;
        }
        
        const updatedCartItem = {
            ...cartItem,
            price: cartItem.price,
            cartQuantity: finalCartQuantity
        };
        setCart(prev => [...prev, updatedCartItem]);
    };

  const handleRemoveFromCart = (itemId: string) => {
      setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === itemId) {
              if (newQuantity <= 0) return null;
               if (item.type === 'product' && 'quantity' in item && newQuantity > item.quantity) {
                  toast({ title: "الكمية غير كافية", description: `الكمية المتاحة هي ${item.quantity} فقط.`, variant: 'destructive' });
                  return { ...item, cartQuantity: item.quantity };
              }
              
              if (item.type === 'prepaid-game' && policies?.packagePricingModel === 'per_child') {
                   const basePricePerItem = item.price / item.cartQuantity;
                   return {...item, cartQuantity: newQuantity, price: basePricePerItem * newQuantity};
              }

              return { ...item, cartQuantity: newQuantity };
          }
          return item;
      }).filter(Boolean) as CartItem[]);
  };
  
  const cartTotal = useMemo(() => cart.reduce((sum, item) => {
    let price = 0;
    if (item.type === 'prepaid-game') {
      price = item.price; // This price is already the total for the game session
      return sum + price;
    } else if (item.type === 'extend-session') {
      price = item.price;
    } else if (item.type === 'product') {
      price = item.price;
    }
    return sum + (price * item.cartQuantity);
  }, 0), [cart]);

  const handleConfirmSale = async () => {
    if (!user?.username || !currentUser || cart.length === 0) return;

    const branch = branches.find(b => b.name === currentUser.branch);
    if (!branch) {
        toast({ title: "خطأ", description: "لم يتم العثور على الفرع الحالي.", variant: "destructive"});
        return;
    }
    
    const productItemsInCart = cart.filter((item): item is InventoryItem & { cartQuantity: number } => item.type === 'product');
    const gameItems = cart.filter((item): item is PrepaidGameCartItem & { cartQuantity: number } => item.type === 'prepaid-game');
    const extendItems = cart.filter((item): item is ExtendSessionCartItem & { cartQuantity: number } => item.type === 'extend-session');
    
    const counterRef = ref(db, `branches/${branch.id}/nextReceiptNumber`);
    const { committed, snapshot } = await runTransaction(counterRef, (currentValue) => (currentValue || 0) + 1);
    const receiptNumber = (committed && snapshot.val()) ? snapshot.val() : 0;

    let sessionInfoForReceipt: ProductReceiptProps['sessionInfo'] | undefined;
    
    try {
        // Handle Product Sales
        if (productItemsInCart.length > 0) {
            const saleRecordRef = push(ref(db, 'productSales'));
            const saleId = saleRecordRef.key!;
            const saleRecordItems: ProductSaleItem[] = productItemsInCart.map(item => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                price: item.price,
                cartQuantity: item.cartQuantity,
            }));
            const saleRecord: ProductSale = { 
                id: saleId, 
                receiptNumber, 
                items: saleRecordItems, 
                totalAmount: productItemsInCart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), 
                branchName: currentUser.branch, 
                cashierUsername: user.username, 
                cashierName: currentUser.name, 
                createdAt: new Date().toISOString(), 
                notes: cartNotes 
            };
            await set(saleRecordRef, saleRecord);

            for (const item of productItemsInCart) {
                const inventoryItemRef = ref(db, `inventory/${item.id}/quantity`);
                await runTransaction(inventoryItemRef, (currentQuantity) => (currentQuantity || 0) - item.cartQuantity);
                
                const movementRef = push(ref(db, 'inventoryMovements'));
                const movement: Omit<InventoryMovement, 'id'> = {
                    date: new Date().toISOString(),
                    productId: item.productId,
                    productName: item.productName,
                    branchId: item.branchId,
                    branchName: item.branchName,
                    type: 'Sale',
                    change: -item.cartQuantity,
                    quantityBefore: item.quantity,
                    quantityAfter: item.quantity - item.cartQuantity,
                    recordedBy: user.username,
                    referenceId: saleId,
                }
                await set(movementRef, movement);
            }
        }
        
        // Handle Prepaid Game Sales
        for (const gameItem of gameItems) {
            const completedSessionRef = push(ref(db, `sessions/completed`));
            const completedSessionId = completedSessionRef.key!;
            const checkInTime = Date.now();

            const completedSession: CompletedSession = {
                ...gameItem.sessionDetails,
                id: completedSessionId,
                receiptNumber,
                checkInTime: checkInTime,
                checkOutTime: checkInTime,
                durationMs: 0,
                cost: gameItem.price,
                costBeforeDiscount: gameItem.price,
                cashierUsername: user.username,
                notes: cartNotes,
            };
            await set(completedSessionRef, completedSession);
            await handleStartSession(gameItem.sessionDetails, completedSessionId, receiptNumber);

            const checkInDate = new Date(checkInTime);
            const expectedCheckOutTime = new Date(checkInDate.getTime() + (gameItem.sessionDetails.packageDuration || 0) * 60 * 1000);
            sessionInfoForReceipt = { children: gameItem.sessionDetails.children, checkInTime: checkInDate, expectedCheckOutTime };
        }
        
        // Handle Extend Session Sales
        for (const extendItem of extendItems) {
             await runTransaction(ref(db, `sessions/active/${extendItem.activeSessionId}`), (currentSession: Child) => {
                if (currentSession && currentSession.packageDuration) {
                    const now = Date.now();
                    const elapsedMsSinceCheckIn = now - currentSession.checkInTime;
                    const originalDurationMs = currentSession.packageDuration * 60 * 1000;
                    const addedDurationMs = (extendItem.packageDuration * extendItem.cartQuantity) * 60 * 1000;
                    const remainingOriginalMs = Math.max(0, originalDurationMs - elapsedMsSinceCheckIn);
                    currentSession.packageDuration = (remainingOriginalMs + addedDurationMs) / (60 * 1000);
                    currentSession.checkInTime = now;
                }
                return currentSession;
             });

             const extendRecordRef = push(ref(db, 'sessions/completed'));
             const originalSession = firebaseActiveChildren.find(s => s.id === extendItem.activeSessionId);
             if (originalSession) {
                const extendRecordData: Partial<CompletedSession> = { ...originalSession, id: extendRecordRef.key!, checkOutTime: Date.now(), durationMs: 0, cost: extendItem.price * extendItem.cartQuantity, costBeforeDiscount: extendItem.price * extendItem.cartQuantity, receiptNumber, packageName: `تمديد: ${extendItem.packageName}`, notes: cartNotes };
                delete extendRecordData.prepaidSessionId;
                await set(extendRecordRef, extendRecordData);
             }
        }
        
        // Print one combined receipt
        const receiptProps: ProductReceiptProps = { 
            receiptId: `${branch.name.substring(0,3).toUpperCase() || 'DEF'}-${receiptNumber}`, 
            settings: receiptSettings, 
            appName: policies?.appName || 'FunTrack', 
            branchName: currentUser.branch, 
            cashierName: currentUser.name, 
            items: cart.map(item => {
                let name = '';
                let price = 0;
                if (item.type === 'product') {
                    name = item.productName;
                    price = item.price;
                } else if (item.type === 'prepaid-game') {
                    name = `باقة: ${item.sessionDetails.game} (${item.sessionDetails.children.map(c => c.name).join(', ')})`;
                    price = item.cartQuantity > 0 ? item.price / item.cartQuantity : 0; // price per unit
                } else if (item.type === 'extend-session') {
                    name = `تمديد: ${item.gameName} (${item.childName})`;
                    price = item.price;
                }
                return { name, quantity: item.cartQuantity, price };
            }), 
            totalAmount: cartTotal, 
            sessionInfo: sessionInfoForReceipt, 
            notes: cartNotes 
        };
        printReceipt(<ProductReceipt {...receiptProps} />);
        
        toast({ title: "تمت عملية البيع بنجاح", description: "تم تسجيل الفاتورة وتحديث البيانات." });
        setCart([]);
        setCartNotes('');
        setSaleCheckoutOpen(false);

    } catch (error) {
        console.error("Sale confirmation error:", error);
        toast({ title: "خطأ", description: "فشل تسجيل عملية البيع.", variant: "destructive"});
    }
  };


    const handleTimeEnd = useCallback((session: Child) => {
        const showToast = () => {
            toast({
                title: "🔔 انتهى الوقت!",
                description: `انتهى وقت اللعب للطفل/الأطفال: ${session.children.map(c => c.name).join(', ')}.`,
                variant: "destructive",
                duration: (policies?.toastDuration || 5) * 1000,
            });
        };

        showToast(); // Show immediate toast

        const intervalSeconds = policies?.packageOvertimeNotificationInterval || 60;
        const intervalId = setInterval(showToast, intervalSeconds * 1000);
        notificationIntervals.set(session.id, intervalId);
    }, [policies, toast, notificationIntervals]);

  const hasTimeExpired = (session: Child) => {
    if (!session.packageDuration) return false;
    const elapsedMs = Date.now() - session.checkInTime;
    const totalDurationMs = session.packageDuration * 60 * 1000;
    return elapsedMs >= totalDurationMs;
  }

  const selectedBranchName = selectedBranchFilter === 'all' ? 'كل الفروع' : selectedBranchFilter;
  const [mainTab, setMainTab] = useState('games-tab');

  const gameCategoriesForBranch = useMemo(() => {
      if (selectedBranchFilter === 'all') {
          return gameCategories;
      }
      const branchGameNames = new Set(games.filter(g => g.branch === selectedBranchFilter || g.branch === 'كل الفروع').map(g => g.name));
      const branchCategoryIds = new Set(games.filter(g => branchGameNames.has(g.name)).map(g => g.categoryId));
      return gameCategories.filter(c => branchCategoryIds.has(c.id));
  }, [gameCategories, games, selectedBranchFilter]);

    useEffect(() => {
        if(mainTab === 'products-tab') return;

        const isCurrentTabVisible = gameCategoriesForBranch.some(c => c.id === mainTab);
        if(!isCurrentTabVisible && gameCategoriesForBranch.length > 0) {
            setMainTab(gameCategoriesForBranch[0].id);
        } else if (gameCategoriesForBranch.length === 0) {
            setMainTab('products-tab');
        }
  }, [gameCategoriesForBranch, mainTab]);


  const gamesForSelectedCategory = useMemo(() => {
    if (mainTab === 'products-tab') return [];
    return games.filter(g => 
        g.categoryId === mainTab && 
        g.status === 'Available' &&
        (selectedBranchFilter === 'all' || g.branch === selectedBranchFilter || g.branch === 'كل الفروع')
    );
  }, [games, mainTab, selectedBranchFilter]);


  const categoryColor = useMemo(() => {
      return gameCategories.find(c => c.id === mainTab)?.color || '#ffffff';
  }, [gameCategories, mainTab])

  useEffect(() => {
    if (productCategories.length > 0 && selectedProductCategory === '') {
        setSelectedProductCategory(productCategories[0].id);
    }
  }, [productCategories, selectedProductCategory]);


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
                    <h1 className="text-2xl font-bold">{policies?.posLabels?.screenTitle || 'يلا نلعب'}</h1>
                    <span className="text-lg text-muted-foreground font-semibold">({selectedBranchName})</span>
                </div>
                 <div className="hidden sm:flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Clock className="h-5 w-5" />
                    <span className="font-mono font-bold text-lg" suppressHydrationWarning>{currentTime}</span>
                </div>
                <div className="ms-auto flex items-center gap-2">
                     <Button size="sm" variant="outline" onClick={() => setCustomerFormOpen(true)}>
                        <UserPlus className="me-2 h-4 w-4" />
                        إضافة عميل
                    </Button>
                     <Button size="sm" variant="outline" onClick={() => setSubscriptionFormOpen(true)}>
                       <StarIcon className="me-2 h-4 w-4" />
                       إضافة اشتراك
                    </Button>
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
                <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                    <TabsList className="flex flex-wrap h-auto">
                    {gameCategoriesForBranch.map(category => (
                        <TabsTrigger 
                            key={category.id} 
                            value={category.id} 
                            className="transition-all"
                            style={{
                                backgroundColor: mainTab === category.id ? category.color : '',
                                color: mainTab === category.id ? 'white' : '',
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
                                            <p className="text-xs text-muted-foreground">{game.paymentModel === 'postpaid' ? `ج.م ${game.price}/ساعة` : 'دفع مسبق'}</p>
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
                         <Tabs defaultValue={selectedProductCategory} onValueChange={setSelectedProductCategory} className="w-full mt-4">
                            <div className='flex items-center gap-4'>
                                <TabsList className="flex flex-wrap h-auto">
                                    {productCategories.map(cat => (
                                        <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                                    ))}
                                </TabsList>
                                <div className="flex-grow">
                                     <Input 
                                        placeholder="ابحث عن منتج بالاسم..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {productCategories.map(cat => (
                                <TabsContent key={cat.id} value={cat.id}>
                                     <Card className="min-h-[150px] mt-2">
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pt-6">
                                            {filteredProductsForDisplay.filter(p => p.categoryId === cat.id).map(item => (
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
                                            {filteredProductsForDisplay.filter(p => p.categoryId === cat.id).length === 0 && (
                                                <div className="col-span-full text-center text-muted-foreground py-16">
                                                    لا توجد منتجات في هذه الفئة.
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            ))}
                         </Tabs>
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
                                    <TableHead className="text-center">رقم الهاتف</TableHead>
                                    <TableHead className="text-center">رقم الإيصال</TableHead>
                                    <TableHead className="text-right">اللعبة</TableHead>
                                    <TableHead className="text-center">الوقت</TableHead>
                                    <TableHead className="text-center">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {searchedActiveChildren.length > 0 ? (
                                searchedActiveChildren.map((session) => (
                                    <TableRow key={session.id} className={cn(hasTimeExpired(session) && "bg-orange-100 dark:bg-orange-900/30")}>
                                    <TableCell className="font-medium text-right">{session.children.map(c=>c.name).join(', ')}</TableCell>
                                    <TableCell className="text-right">{session.parentName}</TableCell>
                                    <TableCell className="text-center">{(session.phoneNumbers || []).join(' / ')}</TableCell>
                                    <TableCell className="text-center font-mono">
                                        {session.receiptNumber ? (
                                            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                <ReceiptIcon className="h-3 w-3" />
                                                {session.receiptNumber}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">{session.game}</TableCell>
                                    <TableCell className="text-center">
                                        <TimeCounter 
                                            startTime={session.checkInTime} 
                                            packageDuration={session.packageDuration}
                                            gracePeriodInMinutes={policies?.packageOvertimeGracePeriod}
                                            onTimeEnd={() => handleTimeEnd(session)} 
                                        />
                                    </TableCell>
                                    <TableCell className="text-center flex gap-2 justify-center">
                                        {session.packageDuration && (
                                             <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openExtendDialog(session)}
                                                disabled={!hasActiveShift}
                                                >
                                                <History className="me-2 h-4 w-4" />
                                                إضافة وقت
                                            </Button>
                                        )}
                                        <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleCheckoutClick(session)}
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
                                                <TableHead className="text-center">الهاتف</TableHead>
                                                <TableHead className="text-center">وقت الخروج</TableHead>
                                                <TableHead className="text-center">التكلفة</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {todaysCompletedSessions.length > 0 ? (
                                                todaysCompletedSessions.map((session) => (
                                                    <TableRow key={session.id}>
                                                        <TableCell className="font-medium text-right">{session.children?.map(c => c.name).join(', ') ?? 'N/A'}</TableCell>
                                                        <TableCell className="text-right">{session.parentName}</TableCell>
                                                        <TableCell className="text-center">{session.phoneNumbers?.join(' / ')}</TableCell>
                                                        <TableCell className="text-center">{new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}</TableCell>
                                                        <TableCell className="font-bold text-center">
                                                            <div className='flex items-center justify-center gap-2 whitespace-nowrap'>
                                                                {session.discount ? (
                                                                    <>
                                                                        <span className="line-through text-muted-foreground">{`ج.م ${session.costBeforeDiscount.toFixed(2)}`}</span>
                                                                        <span className='text-primary'>{`ج.م ${session.cost.toFixed(2)}`}</span>
                                                                    </>
                                                                ) : (
                                                                    <span>{`ج.م ${session.cost.toFixed(2)}`}</span>
                                                                )}

                                                                {session.subscriptionId && <Star className="h-4 w-4 text-yellow-500" />}
                                                                {(session.packagePrice !== undefined || session.packageName) && <PackageCheck className="h-4 w-4 text-blue-500" />}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24">
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
                onConfirmPostpaid={handleStartSession}
                onConfirmPrepaid={handleConfirmPrepaid}
                policies={policies}
            />
            <CheckOutDialog 
                open={isCheckoutDialogOpen}
                onOpenChange={setCheckoutDialogOpen}
                child={childToCheckout}
                onConfirm={handleCheckOut}
                canApplyDiscount={canApplyDiscount}
            />
            <ExtendSessionDialog
                open={isExtendDialogOpen}
                onOpenChange={setExtendDialogOpen}
                session={childToExtend}
                onConfirm={handleAddToCart}
            />
            <EarlyCheckoutDialog
                open={isEarlyCheckoutDiscountOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen && childToCheckout) {
                        // If dialog is cancelled, stop notifications
                        stopNotificationForSession(childToCheckout.id);
                    }
                    setEarlyCheckoutDiscountOpen(isOpen);
                }}
                session={childToCheckout}
                onConfirm={handleEarlyCheckoutConfirm}
            />
             <AlertDialog open={isZeroCostCheckoutOpen} onOpenChange={setZeroCostCheckoutOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الخروج</AlertDialogTitle>
                        <AlertDialogDescription>
                            لا توجد تكلفة إضافية. هل أنت متأكد من تسجيل خروج {childToCheckout?.children.map(c => c.name).join(', ')}؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCheckOut(childToCheckout!, { totalCost: 0 } as PosReceiptProps)}>تأكيد الخروج</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <CustomerFormDialog 
                open={isCustomerFormOpen} 
                onOpenChange={setCustomerFormOpen} 
                onSubmit={handleAddCustomer}
                isEditMode={false}
                initialData={null}
            />
             <SubscriptionFormDialog
                open={isSubscriptionFormOpen}
                onOpenChange={setSubscriptionFormOpen}
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
                            {cart.map(item => {
                                const renderItemDetails = () => {
                                    switch (item.type) {
                                        case 'product':
                                            return { name: item.productName, price: item.price.toFixed(2) };
                                        case 'prepaid-game':
                                            const pricePerUnit = item.cartQuantity > 0 ? item.price / item.cartQuantity : 0;
                                            return { name: `باقة: ${item.sessionDetails.game} (${item.sessionDetails.children.map(c => c.name).join(', ')})`, price: pricePerUnit.toFixed(2) };
                                        case 'extend-session':
                                             return { name: `تمديد: ${item.gameName} (${item.childName})`, price: item.price.toFixed(2) };
                                        default:
                                            return { name: 'صنف غير معروف', price: '0.00' };
                                    }
                                };
                                const details = renderItemDetails();

                                return (
                                <div key={item.id} className="flex items-center gap-2 p-2 border-b">
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium">
                                            {details.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                           {`ج.م ${details.price}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateCartQuantity(item.id, item.cartQuantity + 1)}>
                                            <PlusCircle className="h-3 w-3" />
                                        </Button>
                                        <span className="w-6 text-center font-mono text-sm">{item.cartQuantity}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateCartQuantity(item.id, item.cartQuantity - 1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                    <Separator />
                     <div className="space-y-2">
                        <Label htmlFor="cart-notes">ملاحظات الفاتورة</Label>
                        <Textarea 
                            id="cart-notes"
                            placeholder="أضف ملاحظات (اختياري)..."
                            value={cartNotes}
                            onChange={(e) => setCartNotes(e.target.value)}
                        />
                    </div>
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

















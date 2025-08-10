

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
import { PlayCircle, Square, AlertTriangle, ChevronsUpDown, Check, PlusCircle, Star, Clock, Users, UserCheck, Briefcase, Search, ChevronDown, PackageCheck, Phone, ShoppingCart } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, Game, Employee, Customer, Subscription, GameCategory, CustomerChild, CompletedSession, Policies, DayOfWeek, ReceiptSettings, Branch, GamePackage, Product } from '@/lib/types';
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

const TimeCounter = ({ startTime, packageDuration }: { startTime: number, packageDuration?: number }) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        setElapsed(elapsedMs);

        if (packageDuration) {
            const totalDurationMs = packageDuration * 60 * 1000;
            setRemaining(Math.max(0, totalDurationMs - elapsedMs));
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, packageDuration]);
  
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

    const entryFee = (policies?.entryFee || 0) * numberOfChildren;
    const totalCost = durationCost + entryFee;

    return { totalCost, durationCost, entryFee };
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
  const { games, policies, employees, receiptSettings, subscriptions, branches } = useFirebase();
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const { user } = useAuth();
  const { printReceipt } = usePosPrint();
  const amountReceivedInputRef = useRef<HTMLInputElement>(null);
  
  const isPackageGame = child?.packageDuration && child.packageDuration > 0;

  const checkoutData = useMemo(() => {
    if (!child) return null;
    
    // For package games, the cost is already paid.
    if (isPackageGame) {
        return {
            duration: formatDuration(Date.now() - child.checkInTime),
            totalCost: 0,
            costBeforeDiscount: child.packagePrice || 0,
            durationCost: child.packagePrice || 0,
            entryFee: 0,
            discount: 0,
        }
    }

    const durationMs = Date.now() - child.checkInTime;

    const gameDetails = games.find((g) => g.name === child.game);
    let hourlyRate = gameDetails?.hourly_rate || 0;

    if (policies?.enableWeekendPricing) {
        const today = getDayOfWeek(new Date());
        if (policies.weekendDays[today]) {
            const weekendPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
            if(weekendPolicy) hourlyRate = weekendPolicy.weekendRate;
        } else {
             const weekdayPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
             if(weekdayPolicy) hourlyRate = weekdayPolicy.weekendRate;
        }
    }
    
    const nonSubscribedChildrenCount = child.children.filter(c => 
        !activeSubscriptions.some(s => s.childName === c.name)
    ).length;

    const { totalCost, durationCost, entryFee } = calculateCost(durationMs, hourlyRate, policies, nonSubscribedChildrenCount);
    
    const discountAmount = parseFloat(discount) || 0;
    const finalCost = totalCost - discountAmount > 0 ? totalCost - discountAmount : 0;

    return {
        duration: formatDuration(durationMs),
        totalCost: finalCost,
        costBeforeDiscount: totalCost,
        durationCost,
        entryFee,
        discount: discountAmount,
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
        if (!isPackageGame) {
            setTimeout(() => {
                amountReceivedInputRef.current?.focus();
            }, 100);
        }
    }
  }, [open, isPackageGame]);

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
                      هذه الجلسة مدفوعة مسبقًا. لا توجد تكلفة إضافية عند الخروج.
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
            
            {!isPackageGame && (
                <>
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
                </>
            )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
            <Button 
              onClick={handleConfirm} 
              disabled={!isPackageGame && checkoutData.totalCost > 0 && (Number(amountReceived) < checkoutData.totalCost || !amountReceived)}
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
    const { subscriptions } = useFirebase();

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<CustomerChild[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<GamePackage | null>(null);
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
            if(selectedGame?.gameType === 'package' && selectedGame.packages?.length === 1) {
                setSelectedPackage(selectedGame.packages[0]);
            }
        }
    }, [open, selectedGame]);

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
                // toast({ title: "يرجى اختيار باقة وقت", variant: "destructive" });
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
                // toast({ title: "خطأ", description: "هذا الرقم مسجل لعميل آخر.", variant: 'destructive' });
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
                                    const pkg = selectedGame.packages?.find(p => p.id === value);
                                    setSelectedPackage(pkg || null);
                                }} defaultValue={selectedPackage?.id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر باقة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedGame.packages?.map(pkg => (
                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                {pkg.duration} دقيقة / {pkg.price} ج.م
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


function PosTrackingContent() {
  const { activeChildren: firebaseActiveChildren, completedSessions: firebaseCompletedSessions, subscriptions, games, policies, openShifts, employees, branches, gameCategories, products, productCategories, loading: firebaseLoading } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState<string>('');
  
  const [isCheckInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  
  const [isCheckoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);

  const [activeSearch, setActiveSearch] = useState('');

  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);


    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع') {
            setSelectedBranchFilter(currentUser.branch);
        }
        if (gameCategories.length > 0 && !selectedTab) {
            setSelectedTab(gameCategories[0].id);
        }
    }, [currentUser, gameCategories, selectedTab]);

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
        child.children.some(c => c.name.toLowerCase().includes(activeSearch.toLowerCase()))
    );
  }, [activeChildren, activeSearch]);


  const gamesForSelectedCategory = useMemo(() => {
    if (!selectedTab) return [];
    return games.filter(g => 
        g.categoryId === selectedTab && 
        g.status === 'Available' &&
        (selectedBranchFilter === 'all' || g.branch === selectedBranchFilter || g.branch === 'كل الفروع')
    );
  }, [games, selectedTab, selectedBranchFilter]);
  
  const productsForSelectedCategory = useMemo(() => {
    if (!selectedTab) return [];
    return products.filter(p => p.categoryId === selectedTab);
  }, [products, selectedTab]);

  const categoryColor = useMemo(() => {
      return gameCategories.find(c => c.id === selectedTab)?.color || '#ffffff';
  }, [gameCategories, selectedTab])

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
  
  const selectedBranchName = selectedBranchFilter === 'all' ? 'كل الفروع' : selectedBranchFilter;

  const allProductCategories = useMemo(() => [{id: 'all', name: 'الكل'}, ...productCategories], [productCategories]);
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    if (selectedProductCategory === 'all') return products;
    return products.filter(p => p.categoryId === selectedProductCategory);
  }, [products, selectedProductCategory]);

  return (
    <div className="relative h-full">
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

        <div className="flex flex-col gap-4">
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
          
            <div className="space-y-4 z-10">
                {/* Games Section */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="flex flex-wrap h-auto">
                    {gameCategories.map(category => (
                        <TabsTrigger 
                            key={category.id} 
                            value={category.id} 
                            className="transition-all"
                            style={{
                                backgroundColor: selectedTab === category.id ? category.color : '',
                                color: selectedTab === category.id ? 'white' : '',
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
                    {gameCategories.map(category => (
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
                                            <p className="text-xs text-muted-foreground">{game.gameType === 'hourly' ? `ج.م ${game.hourly_rate}/ساعة` : 'باقات وقت'}</p>
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
                             </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-6">
                                {filteredProducts.map(product => (
                                    <button 
                                        key={product.id} 
                                        onClick={() => { /* TODO: Implement product selling logic */ }} 
                                        disabled={!hasActiveShift}
                                        className="aspect-square border rounded-lg flex flex-col items-center justify-center p-2 gap-2 text-center hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <Image src={product.image} alt={product.name} width={48} height={48} className="rounded-md" data-ai-hint="product image" />
                                        <p className="font-semibold text-sm">{product.name}</p>
                                        {/* TODO: Add price from inventory */}
                                    </button>
                                ))}
                                {filteredProducts.length === 0 && (
                                     <div className="col-span-full text-center text-muted-foreground py-16">
                                        لا توجد منتجات في هذه الفئة.
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
                            <CardTitle>الأطفال النشطون حاليًا</CardTitle>
                            <span className='text-sm text-muted-foreground'>الفرع</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث بالطفل أو ولي الأمر..."
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
                                    <TableHead className="text-right">الطفل</TableHead>
                                    <TableHead className="text-right">ولي الأمر</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">اللعبة</TableHead>
                                    <TableHead className="text-right">الفرع</TableHead>
                                    <TableHead className="text-center">الوقت</TableHead>
                                    <TableHead className="text-center">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {searchedActiveChildren.length > 0 ? (
                                searchedActiveChildren.map((session) => (
                                    <TableRow key={session.id}>
                                    <TableCell className="font-medium text-right">{session.children.map(c => c.name).join(', ')}</TableCell>
                                    <TableCell className="text-right">{session.parentName}</TableCell>
                                    <TableCell className="text-right">{(session.phoneNumbers || []).join(', ')}</TableCell>
                                    <TableCell className="text-right">{session.game}</TableCell>
                                    <TableCell className="text-right">{session.branchName}</TableCell>
                                    <TableCell className="text-center">
                                        <TimeCounter startTime={session.checkInTime} packageDuration={session.packageDuration} />
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

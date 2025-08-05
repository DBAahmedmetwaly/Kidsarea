
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { PlayCircle, Square, Printer, Users, Activity, AlertTriangle, History, Search, ChevronsUpDown, Check, PlusCircle, Star } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, CompletedSession, Policies, DayOfWeek, Game, Employee, Customer, Subscription } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { StatCard } from '@/components/StatCard';
import { ref, set, onValue, get, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Receipt, type ReceiptProps } from '@/components/Receipt';
import ReactToPrint from 'react-to-print';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/context/CustomerContext';
import { CustomerFormDialog } from '../customers/page';
import { startOfDay } from 'date-fns';


const TimeCounter = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const calculateElapsed = () => Date.now() - startTime;
    setElapsed(calculateElapsed());

    const timer = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  if (elapsed === null) {
    return <span>...</span>;
  }

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span>
      {`${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </span>
  );
};

function formatDuration(durationMs: number) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ساعة و ${minutes} دقيقة`;
}

function calculateCost(durationMs: number, hourlyRate: number, policies: Policies | null) {
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
    
    // This is a simplified logic. A more complex one might check if duration is less than 30mins etc.
    // For now we assume fractional_rate is not used with rounding policies.
    const durationCost = roundedHours * hourlyRate;

    const entryFee = policies?.entryFee || 0;
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
  onConfirm: (child: Child) => void;
}) {
  const { games, policies } = useFirebase();
  const [amountReceived, setAmountReceived] = useState('');
  const [isSubscription, setIsSubscription] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);


  const checkoutData = useMemo(() => {
    if (!child) return null;

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
             if(weekdayPolicy) hourlyRate = weekdayPolicy.weekdayRate;
        }
    }
    
    const { totalCost, durationCost, entryFee } = calculateCost(durationMs, hourlyRate, policies);
    
    return {
        duration: formatDuration(durationMs),
        totalCost,
        durationCost,
        entryFee
    }

  }, [child, games, policies]);

  // Check for subscription when dialog opens
  useEffect(() => {
    if (child) {
        const subscriptionsRef = ref(db, 'subscriptions');
        onValue(subscriptionsRef, (snapshot) => {
            const allSubscriptions = snapshot.val();
            if (allSubscriptions) {
                const customerSubscriptions: Subscription[] = Object.values(allSubscriptions);
                const now = new Date();
                const foundSubscription = customerSubscriptions.find(sub => 
                    sub.customerName === child.parentName &&
                    sub.childName === child.name &&
                    sub.status === 'Active' &&
                    now >= new Date(sub.startDate) &&
                    now <= new Date(sub.endDate)
                );
                setIsSubscription(!!foundSubscription);
            } else {
                setIsSubscription(false);
            }
        }, { onlyOnce: true });
    } else {
        setIsSubscription(false);
    }
  }, [child]);


  useEffect(() => {
    // Reset amount received when a new child is selected for checkout
    setAmountReceived('');
  }, [child]);

  if (!child || !checkoutData) return null;

  const change = Number(amountReceived) - (isSubscription ? 0 : checkoutData.totalCost);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسوية حساب: {child.name}</DialogTitle>
          <DialogDescription>
            مدة اللعب: {checkoutData.duration}. قم بتأكيد المبلغ المستلم لإتمام العملية.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {isSubscription ? (
                <Alert className="bg-green-50 border-green-200">
                    <Star className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">مشترك فعال</AlertTitle>
                    <AlertDescription className="text-green-700">
                        هذه الجلسة مغطاة باشتراك. التكلفة النهائية هي صفر.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <div className="flex justify-between items-center text-lg p-3 bg-muted rounded-md">
                        <span className="font-medium">التكلفة الإجمالية:</span>
                        <span className="font-bold text-primary">{`ج.م ${checkoutData.totalCost.toFixed(2)}`}</span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount-received">المبلغ المستلم من العميل</Label>
                        <Input
                        id="amount-received"
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="أدخل المبلغ المستلم"
                        />
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
            <ReactToPrint
                trigger={() => (
                     <Button disabled={!isSubscription && !amountReceived}>
                        حفظ وطباعة
                    </Button>
                )}
                content={() => receiptRef.current}
                onAfterPrint={() => onConfirm(child)}
            />
        </DialogFooter>
         <div className="print-container">
            {child && checkoutData && (
                <Receipt 
                    ref={receiptRef}
                    childName={child.name}
                    parentName={child.parentName}
                    gameName={child.game}
                    checkInTime={new Date(child.checkInTime)}
                    checkOutTime={new Date()}
                    duration={checkoutData.duration}
                    totalCost={isSubscription ? 0 : checkoutData.totalCost}
                    durationCost={isSubscription ? 0 : checkoutData.durationCost}
                    entryFee={isSubscription ? 0 : checkoutData.entryFee}
                    cashierName={child.cashierUsername}
                    isSubscription={isSubscription}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


function TrackingContent() {
  const { activeChildren, setActiveChildren } = useSession();
  const { customers, setCustomers } = useCustomers();
  
  // Existing Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedChild, setSelectedChild] = useState<{name: string, age: number} | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  
  // Common State
  const [selectedGame, setSelectedGame] = useState('');
  const [checkInBranch, setCheckInBranch] = useState('');
  
  const { toast } = useToast();
  const { games, policies, openShifts, employees, branches } = useFirebase();
  const { user } = useAuth();
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
  
  const [myCompletedSessions, setMyCompletedSessions] = useState<CompletedSession[]>([]);

  // Checkout Dialog State
  const [isCheckoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);


  useEffect(() => {
    if (currentUser && currentUser.branch !== 'كل الفروع') {
      setCheckInBranch(currentUser.branch);
      setSelectedBranchFilter(currentUser.branch);
    }
  }, [currentUser]);

  // Check for active subscription when a child is selected
  useEffect(() => {
    if (selectedCustomer && selectedChild) {
        const subscriptionsRef = ref(db, 'subscriptions');
        onValue(subscriptionsRef, (snapshot) => {
            const allSubscriptions = snapshot.val();
            if (allSubscriptions) {
                const customerSubscriptions: Subscription[] = Object.values(allSubscriptions);
                const now = new Date();
                const foundSubscription = customerSubscriptions.find(sub => 
                    sub.customerId === selectedCustomer.id &&
                    sub.childName === selectedChild.name &&
                    sub.status === 'Active' &&
                    now >= new Date(sub.startDate) &&
                    now <= new Date(sub.endDate)
                );
                setActiveSubscription(foundSubscription || null);
            } else {
                setActiveSubscription(null);
            }
        }, { onlyOnce: true }); // Query only once
    } else {
        setActiveSubscription(null);
    }
  }, [selectedCustomer, selectedChild]);


  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    if (user.username === 'admin') return true;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);

  const filteredActiveChildren = useMemo(() => {
    if (selectedBranchFilter === 'all') return activeChildren;
    return activeChildren.filter(child => child.branchName === selectedBranchFilter);
  }, [activeChildren, selectedBranchFilter]);

  const gamesInSelectedBranch = useMemo(() => {
    if (!checkInBranch) return [];
    return games.filter(g => (g.branch === checkInBranch || g.branch === 'كل الفروع') && g.status === 'Available');
  }, [games, checkInBranch]);


  const totalVisitorsToday = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();

    const todaysActiveChildren = activeChildren.filter(s => {
        const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
        return branchMatch && s.checkInTime >= todayStart;
    });

    const todaysSessions = myCompletedSessions.filter(s => {
        const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
        return branchMatch && s.checkOutTime >= todayStart;
    });

    const uniqueIds = new Set([
        ...todaysActiveChildren.map(c => c.id),
        ...todaysSessions.map(c => c.id),
    ]);
    
    return uniqueIds.size;
  }, [activeChildren, myCompletedSessions, selectedBranchFilter]);


  const todaysCompletedSessions = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    return myCompletedSessions.filter(s => {
        const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
        return branchMatch && s.checkOutTime >= today;
    });
  }, [myCompletedSessions, selectedBranchFilter]);


  // Sync with Firebase for active children
  useEffect(() => {
      const activeRef = ref(db, 'sessions/active');
      const unsubscribeActive = onValue(activeRef, (snapshot) => {
          const data = snapshot.val();
          setActiveChildren(data ? Object.values(data) : []);
      });

      return () => unsubscribeActive();
  }, [setActiveChildren]);


    const resetExistingCustomerForm = () => {
        setSelectedCustomer(null);
        setSelectedChild(null);
        setActiveSubscription(null);
    }
  
    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        if (customer.children.length === 1) {
            setSelectedChild(customer.children[0]);
        } else {
            setSelectedChild(null);
        }
        setOpenCombobox(false);
    }


  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const childName = selectedChild?.name;
    const childAge = selectedChild?.age;
    const parentName = selectedCustomer?.parentName;
    const phoneNumber = selectedCustomer?.phoneNumber;
    
    if (!childName || !childAge || !selectedGame || !parentName || !phoneNumber || !checkInBranch) {
      toast({
        title: 'خطأ',
        description: 'الرجاء تعبئة جميع الحقول لتسجيل الدخول.',
        variant: 'destructive',
      });
      return;
    }

    const gameDetails = games.find((g) => g.name === selectedGame);
    if (!gameDetails) {
         toast({ title: 'اللعبة المختارة غير موجودة!', variant: 'destructive'});
         return;
    }

    if (policies && policies.maxCapacity && activeChildren.length >= policies.maxCapacity) {
        toast({
            title: 'تم الوصول للحد الأقصى',
            description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${policies.maxCapacity} طفل.`,
            variant: 'destructive',
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
    const newChild: Child = {
      id: childId,
      name: childName,
      age: parseInt(childAge.toString()),
      parentName: parentName,
      phoneNumber: phoneNumber,
      game: selectedGame,
      branchName: gameDetails.branch,
      checkInTime: Date.now(),
      cashierUsername: user.username,
    };

    try {
        await set(ref(db, `sessions/active/${childId}`), newChild);
        
        // Reset forms
        resetExistingCustomerForm();
        setSelectedGame('');

        if (currentUser?.branch === 'كل الفروع') {
            setCheckInBranch('');
        }
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `تم تسجيل دخول الطفل ${newChild.name}.`,
        });
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الدخول', variant: 'destructive'})
    }
  };

  const openCheckOutDialog = (child: Child) => {
    setChildToCheckout(child);
    setCheckoutDialogOpen(true);
  }

  const handleCheckOut = async (child: Child) => {
    setCheckoutDialogOpen(false);
    const checkOutTime = Date.now();
    const durationMs = checkOutTime - child.checkInTime;

    const subscriptionsRef = ref(db, 'subscriptions');
    const subsSnapshot = await get(subscriptionsRef);
    const allSubscriptions = subsSnapshot.val();
    let finalCost = 0;
    let finalDurationCost = 0;
    let finalEntryFee = 0;
    let subscriptionId: string | undefined = undefined;

    if (allSubscriptions) {
        const customerSubscriptions: Subscription[] = Object.values(allSubscriptions);
        const now = new Date();
        const foundSubscription = customerSubscriptions.find(sub => 
            sub.customerName === child.parentName &&
            sub.childName === child.name &&
            sub.status === 'Active' &&
            now >= new Date(sub.startDate) &&
            now <= new Date(sub.endDate)
        );
        if (foundSubscription) {
          subscriptionId = foundSubscription.id;
        }
    }

    if (!subscriptionId) {
        const gameDetails = games.find((g) => g.name === child.game);
        let hourlyRate = gameDetails?.hourly_rate || 0;

        if (policies?.enableWeekendPricing) {
            const today = getDayOfWeek(new Date(checkOutTime));
            if (policies.weekendDays[today]) {
                const weekendPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
                if(weekendPolicy) {
                    hourlyRate = weekendPolicy.weekendRate;
                }
            } else {
                 const weekdayPolicy = policies.pricingPolicies.find(p => p.gameId === gameDetails?.id);
                 if(weekdayPolicy) {
                    hourlyRate = weekdayPolicy.weekdayRate;
                 }
            }
        }
        
        const { totalCost, durationCost, entryFee } = calculateCost(durationMs, hourlyRate, policies);
        finalCost = totalCost;
        finalDurationCost = durationCost;
        finalEntryFee = entryFee;
    }

    const completedSession: Omit<CompletedSession, 'id'> = {
        ...child,
        checkOutTime,
        durationMs,
        cost: finalCost,
        durationCost: finalDurationCost,
        entryFee: finalEntryFee,
    };
    
    if (subscriptionId) {
        (completedSession as CompletedSession).subscriptionId = subscriptionId;
    }

    try {
        await set(ref(db, `sessions/completed/${child.id}`), completedSession);
        await set(ref(db, `sessions/active/${child.id}`), null);
        
        // Add to local state immediately
        setMyCompletedSessions(prev => [{ id: child.id, ...completedSession } as CompletedSession, ...prev]);
        
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الخروج', variant: 'destructive'})
    }

  };
  
  const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt'>) => {
      try {
          const existingCustomer = customers.find(c => c.phoneNumber === newCustomerData.phoneNumber);
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
      } catch(e) {
          console.error(e);
          toast({ title: "خطأ", description: "لم يتم إضافة العميل", variant: 'destructive' })
      }
  };

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-2xl font-bold">تتبع الأطفال</h1>
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
       <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="الأطفال النشطون حاليًا"
          value={filteredActiveChildren.length.toString()}
          icon={Activity}
          description={selectedBranchFilter === 'all' ? `في كل الفروع` : `في ${selectedBranchFilter}`}
        />
        <StatCard
          title="إجمالي زوار اليوم"
          value={totalVisitorsToday.toString()}
          icon={Users}
          description={selectedBranchFilter === 'all' ? `في كل الفروع` : `في ${selectedBranchFilter}`}
        />
      </div>
      <div className="grid gap-8 md:grid-cols-5 items-start">
        <div className="md:col-span-2 space-y-6">
            {!hasActiveShift && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>لا توجد وردية مفتوحة</AlertTitle>
                    <AlertDescription>
                       لا يمكنك تسجيل دخول الأطفال لأنه لا توجد وردية مفتوحة لحسابك. يرجى الذهاب إلى
                       <Link href="/shift-closing" className="font-bold underline px-1">إدارة الورديات</Link>
                       لبدء وردية جديدة.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>تسجيل دخول</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCheckIn} className="space-y-4">
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
                                        disabled={!hasActiveShift}
                                        >
                                        {selectedCustomer
                                            ? `${selectedCustomer.parentName} (${selectedCustomer.phoneNumber})`
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
                                                        value={`${customer.parentName} ${customer.phoneNumber}`}
                                                        onSelect={() => handleCustomerSelect(customer)}
                                                    >
                                                        <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                        />
                                                        {customer.parentName} ({customer.phoneNumber})
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerFormOpen(true)} disabled={!hasActiveShift}>
                                    <PlusCircle className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        {selectedCustomer && (
                             <div className="space-y-2">
                                <Label htmlFor="child-select">اختر الطفل</Label>
                                <Select value={selectedChild?.name} onValueChange={(childName) => {
                                    const child = selectedCustomer.children.find(c => c.name === childName);
                                    setSelectedChild(child || null);
                                }} disabled={!hasActiveShift}>
                                    <SelectTrigger id="child-select">
                                        <SelectValue placeholder="اختر طفل..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedCustomer.children.map((child, index) => (
                                            <SelectItem key={index} value={child.name}>
                                                {child.name} (عمر: {child.age})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {activeSubscription && (
                            <Alert className="bg-green-50 border-green-200">
                                <Star className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">اشتراك فعال</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    هذا الطفل لديه اشتراك سارٍ حتى {new Date(activeSubscription.endDate).toLocaleDateString('ar-EG')}.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="branch-select-existing">اختر الفرع</Label>
                            <Select value={checkInBranch} onValueChange={(value) => { setCheckInBranch(value); setSelectedGame(''); }} disabled={!hasActiveShift || currentUser?.branch !== 'كل الفروع'}>
                                <SelectTrigger id="branch-select-existing">
                                    <SelectValue placeholder="اختر فرع..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.name}>
                                        {branch.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="game-select-existing">اختر اللعبة</Label>
                            <Select value={selectedGame} onValueChange={setSelectedGame} disabled={!hasActiveShift || !checkInBranch}>
                                <SelectTrigger id="game-select-existing">
                                    <SelectValue placeholder="اختر لعبة..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {gamesInSelectedBranch.map((game) => (
                                        <SelectItem key={game.id} value={game.name}>
                                            {game.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <Button type="submit" className="w-full" disabled={!hasActiveShift || !selectedChild}>
                            <PlayCircle className="me-2 h-4 w-4" />
                            بدء اللعب
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-3 space-y-8">
            <Card>
            <CardHeader>
                <CardTitle>الأطفال النشطون حاليًا</CardTitle>
                <CardDescription>
                قائمة بالأطفال الذين يلعبون حاليًا في الفرع المحدد.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">اسم الطفل</TableHead>
                        <TableHead className="text-right">اللعبة</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-center">مدة اللعب</TableHead>
                        <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredActiveChildren.length > 0 ? (
                    filteredActiveChildren.map((child) => (
                        <TableRow key={child.id}>
                        <TableCell className="font-medium text-right">{child.name}</TableCell>
                        <TableCell className="text-right">{child.game}</TableCell>
                        <TableCell className="text-right">{child.branchName}</TableCell>
                        <TableCell className="text-center">
                            <TimeCounter startTime={child.checkInTime} />
                        </TableCell>
                        <TableCell className="text-center">
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openCheckOutDialog(child)}
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
                        <TableCell colSpan={5} className="h-24 text-center">
                        لا يوجد أطفال نشطون حاليًا.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>الجلسات المكتملة اليوم</CardTitle>
                    <CardDescription>
                        قائمة بالجلسات التي تم إنهائها اليوم في الفرع المحدد.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">اسم الطفل</TableHead>
                                <TableHead className="text-right">اللعبة</TableHead>
                                <TableHead className="text-center">التكلفة</TableHead>
                                <TableHead className="text-center">وقت الخروج</TableHead>
                                <TableHead className="text-center">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {todaysCompletedSessions.length > 0 ? (
                                todaysCompletedSessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium text-right">{session.name}</TableCell>
                                        <TableCell className="text-right">{session.game}</TableCell>
                                        <TableCell className="font-bold text-center">
                                            {session.subscriptionId ? (
                                                <span className="flex items-center justify-center gap-1 text-green-600"><Star className="h-4 w-4"/> اشتراك</span>
                                            ) : `ج.م ${session.cost.toFixed(2)}`}
                                        </TableCell>
                                        <TableCell className="text-center">{new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}</TableCell>
                                        <TableCell className="text-center">
                                            {/* We can re-enable this if needed with a robust solution */}
                                            {/* <Button
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Printer className="me-2 h-4 w-4" />
                                                طباعة
                                            </Button> */}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        لم تكتمل أي جلسات اليوم بعد.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
       
      <CheckOutDialog 
        open={isCheckoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        child={childToCheckout}
        onConfirm={handleCheckOut}
      />

        <CustomerFormDialog 
            open={isCustomerFormOpen} 
            onOpenChange={setCustomerFormOpen} 
            onSubmit={handleAddCustomer}
            isEditMode={false}
        />
    </div>
  );
}


export default function TrackingPage() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <TrackingContent />
            </main>
            </div>
        </SidebarProvider>
    );
}



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
import type { Child, CompletedSession, Policies, DayOfWeek, Game, Employee, Customer, Subscription, ReceiptSettings, CustomerChild } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { StatCard } from '@/components/StatCard';
import { ref, set, onValue, get, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { PosReceipt, type PosReceiptProps } from '@/components/Receipt';
import { usePosPrint } from '@/hooks/use-pos-print';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/context/CustomerContext';
import { CustomerFormDialog } from '../customers/page';
import { startOfDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';


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
  onConfirm: (child: Child, receiptDetails: PosReceiptProps) => void;
}) {
  const { games, policies, employees, receiptSettings, subscriptions } = useFirebase();
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const { user } = useAuth();
  const { printReceipt } = usePosPrint();
  

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
    
    const nonSubscribedChildrenCount = child.children.filter(c => 
        !activeSubscriptions.some(s => s.childName === c.name)
    ).length;

    const { totalCost, durationCost, entryFee } = calculateCost(durationMs, hourlyRate, policies, nonSubscribedChildrenCount);
    
    const discountAmount = parseFloat(discount) || 0;
    const finalCost = totalCost - discountAmount > 0 ? totalCost - discountAmount : 0;

    return {
        duration: formatDuration(durationMs),
        totalCost: finalCost,
        durationCost,
        entryFee,
        discount: discountAmount,
    }

  }, [child, games, policies, discount, activeSubscriptions]);

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
    // Reset amount received when a new child is selected for checkout
    setAmountReceived('');
    setDiscount('');
  }, [child]);

  const handleConfirm = () => {
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
    };
    
    if (receiptSettings) {
        printReceipt(<PosReceipt {...receiptDetails} />);
    }
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
            <Button onClick={handleConfirm} disabled={!amountReceived && checkoutData.totalCost > 0}>
                حفظ و طباعة
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


function TrackingContent() {
  const { activeChildren, setActiveChildren, completedSessions, setCompletedSessions } = useSession();
  const { customers } = useCustomers();
  
  // Existing Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<CustomerChild[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  
  // Common State
  const [selectedGame, setSelectedGame] = useState('');
  const [checkInBranch, setCheckInBranch] = useState('');
  
  const { toast } = useToast();
  const { games, policies, openShifts, employees, branches, subscriptions } = useFirebase();
  const { user } = useAuth();
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
  
  // Checkout Dialog State
  const [isCheckoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return employees.find(e => e.username === user.username);
  }, [user, employees]);


    useEffect(() => {
        if (currentUser && currentUser.branch !== 'كل الفروع' && !checkInBranch) {
            setCheckInBranch(currentUser.branch);
            setSelectedBranchFilter(currentUser.branch);
        }
    }, [currentUser, checkInBranch]);


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
    
    const todaysActiveCount = activeChildren
        .filter(s => {
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            return branchMatch && s.checkInTime >= todayStart;
        })
        .reduce((sum, s) => sum + (s.children?.length || 0), 0);

    const todaysCompletedCount = completedSessions
        .filter(s => {
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            return branchMatch && s.checkOutTime >= todayStart;
        })
        .reduce((sum, s) => sum + (s.children?.length || 0), 0);
    
    // This isn't perfect as it double counts if a child checks in and out today
    // A more accurate way would be to count unique parent+child combinations
    return todaysActiveCount + todaysCompletedCount;
  }, [activeChildren, completedSessions, selectedBranchFilter]);


  const todaysCompletedSessions = useMemo(() => {
    if (!user || !user.username) return [];

    const todayStart = startOfDay(new Date());
    const openShift = openShifts.find(s => s.cashierUsername === user.username);
    // If there's an open shift, filter from shift start time. Otherwise, from beginning of today.
    const filterStartTime = openShift ? new Date(openShift.startTime) : todayStart;

    return completedSessions.filter(s => {
        const cashierMatch = s.cashierUsername === user.username;
        const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
        const timeMatch = new Date(s.checkOutTime) >= filterStartTime;
        return cashierMatch && branchMatch && timeMatch;
    });
  }, [completedSessions, selectedBranchFilter, user, openShifts]);


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
        setSelectedChildren([]);
    }
  
    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedChildren([]);
        setOpenCombobox(false);
    }
    
    const handleChildSelect = (child: CustomerChild, checked: boolean) => {
        setSelectedChildren(prev => 
            checked ? [...prev, child] : prev.filter(c => c.name !== child.name)
        );
    }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const parentName = selectedCustomer?.parentName;
    const phoneNumber = selectedCustomer?.phoneNumber;
    
    if (selectedChildren.length === 0 || !selectedGame || !parentName || !phoneNumber || !checkInBranch) {
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

    if (policies && policies.maxCapacity && (activeChildren.length + selectedChildren.length) > policies.maxCapacity) {
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
    
    const sessionId = Date.now();
    const newSession: Child = {
      id: sessionId,
      children: selectedChildren,
      parentName: parentName,
      phoneNumber: phoneNumber,
      game: selectedGame,
      branchName: gameDetails.branch,
      checkInTime: Date.now(),
      cashierUsername: user.username,
    };

    try {
        await set(ref(db, `sessions/active/${sessionId}`), newSession);
        
        // Reset forms
        resetExistingCustomerForm();
        setSelectedGame('');

        if (currentUser?.branch === 'كل الفروع') {
            setCheckInBranch('');
        }
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `تم تسجيل دخول الأطفال: ${newSession.children.map(c => c.name).join(', ')}.`,
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

  const handleCheckOut = async (child: Child, receiptDetails: PosReceiptProps) => {
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
        durationCost: receiptDetails.durationCost,
        entryFee: receiptDetails.entryFee,
        discount: receiptDetails.discount,
    };

    const completedSession: Omit<CompletedSession, 'id'> = {
        ...baseSession,
        ...(activeSubs.length > 0 && { subscriptionId: activeSubs.map(s => s.id).join(',') }),
    };


    try {
        await set(ref(db, `sessions/completed/${child.id}`), completedSession);
        await set(ref(db, `sessions/active/${child.id}`), null);
        
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
          value={filteredActiveChildren.reduce((sum, s) => sum + s.children.length, 0).toString()}
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
                       <span className="font-bold underline px-1">إدارة الورديات</span>
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
                                <Label>اختر الأطفال</Label>
                                <div className="space-y-2 rounded-md border p-2 max-h-40 overflow-y-auto">
                                    {selectedCustomer.children.map((child, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`track-child-${index}`}
                                                onCheckedChange={(checked) => handleChildSelect(child, !!checked)}
                                                checked={selectedChildren.some(c => c.name === child.name)}
                                            />
                                            <Label htmlFor={`track-child-${index}`} className="font-normal">
                                                {child.name} (عمر: {child.age})
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                         <Button type="submit" className="w-full" disabled={!hasActiveShift || selectedChildren.length === 0}>
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
                        <TableCell className="font-medium text-right">{child.children.map(c => c.name).join(', ')}</TableCell>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {todaysCompletedSessions.length > 0 ? (
                                todaysCompletedSessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium text-right">{session.children.map(c=>c.name).join(', ')}</TableCell>
                                        <TableCell className="text-right">{session.game}</TableCell>
                                        <TableCell className="font-bold text-center">
                                            {session.subscriptionId ? (
                                                <span className="flex items-center justify-center gap-1 text-green-600"><Star className="h-4 w-4"/> اشتراك</span>
                                            ) : `ج.م ${session.cost.toFixed(2)}`}
                                        </TableCell>
                                        <TableCell className="text-center">{new Date(session.checkOutTime).toLocaleTimeString('ar-EG')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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

    
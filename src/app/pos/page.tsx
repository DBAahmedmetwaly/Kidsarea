

'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { PlayCircle, Square, AlertTriangle, ChevronsUpDown, Check, PlusCircle, Star, Clock, Users, UserCheck, Briefcase, Search } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, Game, Employee, Customer, Subscription, GameCategory, CustomerChild, CompletedSession, Policies, DayOfWeek, ReceiptSettings } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, set, onValue, push } from 'firebase/database';
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
    <span className="font-mono" dir="ltr">
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
    onConfirm: (childData: { customer: Customer, children: CustomerChild[], game: Game, branch: string }) => void
}) {
    const { customers } = useCustomers();
    const { subscriptions } = useFirebase();

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<CustomerChild[]>([]);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
    
    useEffect(() => {
        if (!open) {
            setSelectedCustomer(null);
            setSelectedChildren([]);
            setOpenCombobox(false);
        }
    }, [open]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedChildren([]); // Reset selected children when customer changes
        setOpenCombobox(false);
    }
    
    const handleChildSelect = (child: CustomerChild, checked: boolean) => {
        setSelectedChildren(prev => 
            checked ? [...prev, child] : prev.filter(c => c.name !== child.name)
        );
    }

    const handleConfirm = () => {
        if (!selectedCustomer || selectedChildren.length === 0 || !selectedGame) return;
        onConfirm({ customer: selectedCustomer, children: selectedChildren, game: selectedGame, branch: selectedGame.branch });
        onOpenChange(false);
    }
    
    const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt'>) => {
      try {
          const existingCustomer = customers.find(c => c.phoneNumber === newCustomerData.phoneNumber);
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
                                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerFormOpen(true)}>
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
                                                id={`child-${index}`}
                                                onCheckedChange={(checked) => handleChildSelect(child, !!checked)}
                                                checked={selectedChildren.some(c => c.name === child.name)}
                                            />
                                            <Label htmlFor={`child-${index}`} className="font-normal">
                                                {child.name} (عمر: {child.age})
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <Button onClick={handleConfirm} disabled={selectedChildren.length === 0 || !selectedCustomer}>
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
            />
        </>
    )
}


function PosTrackingContent() {
  const { activeChildren, completedSessions, subscriptions } = useFirebase();
  const { games, policies, openShifts, employees, branches, gameCategories } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
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
        // Select the first category by default
        if (gameCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(gameCategories[0].id);
        }

    }, [currentUser, gameCategories, selectedCategory]);

  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    if (user.username === 'admin') return true;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);

  const activeChildrenByBranch = useMemo(() => {
    if (selectedBranchFilter === 'all') return activeChildren;
    return activeChildren.filter(child => child.branchName === selectedBranchFilter);
  }, [activeChildren, selectedBranchFilter]);

  const searchedActiveChildren = useMemo(() => {
    if (!activeSearch) return activeChildrenByBranch;
    return activeChildrenByBranch.filter(child => 
        child.parentName.toLowerCase().includes(activeSearch.toLowerCase()) ||
        child.children.some(c => c.name.toLowerCase().includes(activeSearch.toLowerCase()))
    );
  }, [activeChildrenByBranch, activeSearch]);


  const gamesForSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return games.filter(g => 
        g.categoryId === selectedCategory && 
        g.status === 'Available' &&
        (selectedBranchFilter === 'all' || g.branch === selectedBranchFilter || g.branch === 'كل الفروع')
    );
  }, [games, selectedCategory, selectedBranchFilter]);

    const todaysCompletedSessions = useMemo(() => {
        if (!user || !user.username) return [];

        const todayStart = startOfDay(new Date());
        const openShift = openShifts.find(s => s.cashierUsername === user.username);
        const filterStartTime = openShift ? new Date(openShift.startTime) : todayStart;

        return completedSessions.filter(s => {
            const cashierMatch = s.cashierUsername === user.username;
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            const timeMatch = new Date(s.checkOutTime) >= filterStartTime;
            return cashierMatch && branchMatch && timeMatch;
        }).slice(0, 5); // Show last 5
  }, [completedSessions, selectedBranchFilter, user, openShifts]);

    const dailyStats = useMemo(() => {
        const activeCount = activeChildrenByBranch.length;
        
        const todaysSessions = completedSessions.filter(s => {
            const branchMatch = selectedBranchFilter === 'all' || s.branchName === selectedBranchFilter;
            return branchMatch && isToday(new Date(s.checkOutTime));
        });

        const visitorsToday = todaysSessions.reduce((sum, s) => sum + (s.children?.length || 1), 0);
        const sessionsToday = todaysSessions.length;

        return { activeCount, visitorsToday, sessionsToday };

    }, [activeChildrenByBranch, completedSessions, selectedBranchFilter]);

  const openCheckInDialog = (game: Game) => {
    setSelectedGame(game);
    setCheckInDialogOpen(true);
  }
  
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


  const handleCheckIn = async (data: { customer: Customer, children: CustomerChild[], game: Game, branch: string }) => {
    const { customer, children, game, branch } = data;
    
    if (policies && policies.maxCapacity && (activeChildren.length + children.length) > policies.maxCapacity) {
        toast({
            title: 'تم الوصول للحد الأقصى',
            description: `لا يمكن إضافة المزيد من الأطفال. السعة القصوى هي ${policies.maxCapacity} طفل.`,
            variant: 'destructive',
        });
        return;
    }

    // Check if any of the selected children are already in an active session
    const activeChildNames = activeChildren.flatMap(ac => ac.children.map(c => c.name));
    const alreadyActiveChildren = children.filter(c => activeChildNames.includes(c.name));

    if (alreadyActiveChildren.length > 0) {
        toast({
            title: 'طفل نشط بالفعل',
            description: `الطفل "${alreadyActiveChildren[0].name}" موجود بالفعل في جلسة نشطة.`,
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
    const newSession: Child = {
      id: childId,
      children: children,
      parentName: customer.parentName,
      phoneNumber: customer.phoneNumber,
      game: game.name,
      branchName: branch,
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

  return (
    <div className="relative h-full">
        {/* Overlay for no active shift */}
        {!hasActiveShift && (
             <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 z-50">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>لا توجد وردية مفتوحة</AlertTitle>
                    <AlertDescription>
                        لا يمكنك استخدام نقاط البيع لأنه لا توجد وردية مفتوحة لحسابك. يرجى الذهاب إلى شاشة إدارة الورديات لبدء وردية جديدة.
                    </AlertDescription>
                </Alert>
                <Link href="/shift-closing" className='mt-6'>
                    <Button>
                        <Briefcase className="me-2 h-4 w-4" />
                        الانتقال إلى إدارة الورديات
                    </Button>
                </Link>
             </div>
        )}

        <div className="flex flex-col gap-8">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-repeat bg-center opacity-5 pointer-events-none"
                style={{backgroundImage: 'url(https://placehold.co/300x300.png)', backgroundSize: '300px'}}
                data-ai-hint="game pattern"
            ></div>

            <div className="flex flex-col sm:flex-row items-center gap-4 z-10">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">نقاط البيع</h1>
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
          
            <div className="space-y-8 z-10">
                {/* Games Section */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {gameCategories.map(category => (
                        <TabsTrigger 
                            key={category.id} 
                            value={category.id} 
                            className="transition-all"
                            style={{
                                backgroundColor: selectedCategory === category.id ? category.color : '',
                                color: selectedCategory === category.id ? 'white' : '',
                                borderColor: category.color
                            }}
                        >
                            {category.name}
                        </TabsTrigger>
                    ))}
                    </TabsList>
                     <Card className="min-h-[200px] mt-4">
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-6">
                            {gamesForSelectedCategory.map(game => (
                                <button 
                                    key={game.id} 
                                    onClick={() => openCheckInDialog(game)} 
                                    disabled={!hasActiveShift}
                                    className="aspect-video border rounded-lg flex flex-col items-center justify-center p-2 gap-2 text-center hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <p className="font-semibold text-sm">{game.name}</p>
                                    <p className="text-xs text-muted-foreground">{`ج.م ${game.hourly_rate}/ساعة`}</p>
                                </button>
                            ))}
                            {gamesForSelectedCategory.length === 0 && (
                                <div className="col-span-full text-center text-muted-foreground py-16">
                                    لا توجد ألعاب متاحة في هذا التصنيف لهذا الفرع.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Tabs>

                {/* Active Children Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>الأطفال النشطون حاليًا</CardTitle>
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
                                    <TableHead className="text-right">اللعبة</TableHead>
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
                                    <TableCell className="text-right">{session.game}</TableCell>
                                    <TableCell className="text-center">
                                        <TimeCounter startTime={session.checkInTime} />
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
                                    <TableCell colSpan={5} className="h-24 text-center">
                                    لا يوجد أطفال نشطون حاليًا يطابقون بحثك.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 {/* Completed Sessions Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>أحدث الجلسات المنتهية (في ورديتك)</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الطفل</TableHead>
                                    <TableHead className="text-right">ولي الأمر</TableHead>
                                    <TableHead className="text-center">التكلفة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {todaysCompletedSessions.length > 0 ? (
                                    todaysCompletedSessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium text-right">{session.children?.map(c => c.name).join(', ') ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right">{session.parentName}</TableCell>
                                            <TableCell className="font-bold text-center">
                                                {session.subscriptionId ? (
                                                    <span className="flex items-center justify-center gap-1 text-green-600"><Star className="h-4 w-4"/> اشتراك</span>
                                                ) : `ج.م ${session.cost.toFixed(2)}`}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            لم تكتمل أي جلسات في ورديتك بعد.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
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

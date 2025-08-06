
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { PlayCircle, Square, AlertTriangle, ChevronsUpDown, Check, PlusCircle, Star } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { Child, Game, Employee, Customer, Subscription, GameCategory } from '@/lib/types';
import { useSession } from '@/context/SessionContext';
import { useFirebase } from '@/context/FirebaseContext';
import { ref, set, onValue } from 'firebase/database';
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

function CheckInDialog({
    open,
    onOpenChange,
    selectedGame,
    onConfirm
} : {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    selectedGame: Game | null,
    onConfirm: (childData: { customer: Customer, child: {name: string, age: number}, game: Game, branch: string }) => void
}) {
    const { customers } = useCustomers();
    const { subscriptions } = useFirebase();

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedChild, setSelectedChild] = useState<{name: string, age: number} | null>(null);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isCustomerFormOpen, setCustomerFormOpen] = useState(false);
    const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);

    useEffect(() => {
        if (!open) {
            setSelectedCustomer(null);
            setSelectedChild(null);
            setOpenCombobox(false);
            setActiveSubscription(null);
        }
    }, [open]);

      // Check for active subscription when a child is selected
    useEffect(() => {
        if (selectedCustomer && selectedChild) {
            onValue(ref(db, 'subscriptions'), (snapshot) => {
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
            }, { onlyOnce: true });
        } else {
            setActiveSubscription(null);
        }
    }, [selectedCustomer, selectedChild]);


    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        if (customer.children.length === 1) {
            setSelectedChild(customer.children[0]);
        } else {
            setSelectedChild(null);
        }
        setOpenCombobox(false);
    }

    const handleConfirm = () => {
        if (!selectedCustomer || !selectedChild || !selectedGame) return;
        onConfirm({ customer: selectedCustomer, child: selectedChild, game: selectedGame, branch: selectedGame.branch });
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
                            اختر العميل والطفل لبدء جلسة اللعب.
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
                                <Label htmlFor="child-select">اختر الطفل</Label>
                                <Select value={selectedChild?.name} onValueChange={(childName) => {
                                    const child = selectedCustomer.children.find(c => c.name === childName);
                                    setSelectedChild(child || null);
                                }}>
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
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">إلغاء</Button>
                        </DialogClose>
                        <Button onClick={handleConfirm} disabled={!selectedChild || !selectedCustomer}>
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
  const { activeChildren } = useSession();
  const { games, policies, openShifts, employees, branches, gameCategories } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(null);
  
  const [isCheckInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

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
            setSelectedCategory(gameCategories[0]);
        }

    }, [currentUser, gameCategories, selectedCategory]);

  const hasActiveShift = useMemo(() => {
    if (!user || !user.username) return false;
    if (user.username === 'admin') return true;
    return openShifts.some(shift => shift.cashierUsername === user.username);
  }, [user, openShifts]);

  const filteredActiveChildren = useMemo(() => {
    if (selectedBranchFilter === 'all') return activeChildren;
    return activeChildren.filter(child => child.branchName === selectedBranchFilter);
  }, [activeChildren, selectedBranchFilter]);

  const gamesForSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return games.filter(g => 
        g.categoryId === selectedCategory.id && 
        g.status === 'Available' &&
        (selectedBranchFilter === 'all' || g.branch === selectedBranchFilter || g.branch === 'كل الفروع')
    );
  }, [games, selectedCategory, selectedBranchFilter]);

  const openCheckInDialog = (game: Game) => {
    setSelectedGame(game);
    setCheckInDialogOpen(true);
  }

  const handleCheckIn = async (data: { customer: Customer, child: {name: string, age: number}, game: Game, branch: string }) => {
    const { customer, child, game, branch } = data;
    
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
      name: child.name,
      age: parseInt(child.age.toString()),
      parentName: customer.parentName,
      phoneNumber: customer.phoneNumber,
      game: game.name,
      branchName: branch,
      checkInTime: Date.now(),
      cashierUsername: user.username,
    };

    try {
        await set(ref(db, `sessions/active/${childId}`), newChild);
        toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: `تم تسجيل دخول الطفل ${newChild.name}.`,
        });
    } catch(err) {
        console.error(err);
        toast({ title: 'خطأ في تسجيل الدخول', variant: 'destructive'})
    }
  };

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
             <div className="md:hidden">
                <SidebarTrigger />
            </div>
            <h1 className="text-2xl font-bold">نقاط البيع</h1>
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
      
      <div className="grid gap-8 md:grid-cols-12 items-start">
        {/* Categories */}
        <div className="md:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>التصنيفات</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    {gameCategories.map(category => (
                         <Button 
                            key={category.id} 
                            variant={selectedCategory?.id === category.id ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(category)}
                            className="w-full justify-start text-base py-6"
                         >
                            {category.name}
                         </Button>
                    ))}
                </CardContent>
            </Card>
        </div>

        {/* Games */}
        <div className="md:col-span-9">
            <Card className="min-h-[400px]">
                <CardHeader>
                    <CardTitle>{selectedCategory?.name || 'الألعاب'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {gamesForSelectedCategory.map(game => (
                         <button 
                            key={game.id} 
                            onClick={() => openCheckInDialog(game)} 
                            disabled={!hasActiveShift}
                            className="aspect-square border rounded-lg flex flex-col items-center justify-center p-2 gap-2 text-center hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                         >
                            <Image src={game.image} alt={game.name} width={64} height={64} className="rounded-md object-cover" />
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
        </div>
      </div>
       
      <CheckInDialog
        open={isCheckInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        selectedGame={selectedGame}
        onConfirm={handleCheckIn}
      />
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


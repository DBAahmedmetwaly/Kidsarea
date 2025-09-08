

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Game, Employee, Branch, Safe, Policies, OpenShift, SafeTransaction, Subscription, SubscriptionPlan, GameCategory, ReceiptSettings, Child, CompletedSession, ShiftRecord, Expense, ExpenseType, Product, ProductCategory, InventoryItem, ProductSale, InventoryMovement } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface FirebaseContextType {
  games: Game[];
  employees: Employee[];
  branches: Branch[];
  safes: Safe[];
  policies: Policies[];
  receiptSettings: ReceiptSettings | null;
  openShifts: OpenShift[];
  transactions: SafeTransaction[];
  subscriptions: Subscription[];
  subscriptionPlans: SubscriptionPlan[];
  gameCategories: GameCategory[];
  products: Product[];
  productCategories: ProductCategory[];
  inventory: InventoryItem[];
  productSales: ProductSale[];
  shiftRecords: ShiftRecord[];
  expenses: Expense[];
  expenseTypes: ExpenseType[];
  loading: boolean;
  isInitialLoad: boolean; // To track the very first load
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [policies, setPolicies] = useState<Policies[]>([]);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [gameCategories, setGameCategories] = useState<GameCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [shiftRecords, setShiftRecords] = useState<ShiftRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth(); // Use auth status to delay fetch

  useEffect(() => {
    // Only subscribe if the user is authenticated
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const dataRefs = [
      { key: 'games', setter: setGames, isArray: true },
      { key: 'employees', setter: setEmployees, isArray: true },
      { key: 'branches', setter: setBranches, isArray: true },
      { key: 'safes', setter: setSafes, isArray: true },
      { key: 'policies', setter: setPolicies, isArray: true }, // Changed to true
      { key: 'receiptSettings', setter: setReceiptSettings, isArray: false },
      { key: 'openShifts', setter: setOpenShifts, isArray: true },
      { key: 'safeTransactions', setter: setTransactions, isArray: true },
      { key: 'subscriptions', setter: setSubscriptions, isArray: true },
      { key: 'subscriptionPlans', setter: setSubscriptionPlans, isArray: true },
      { key: 'gameCategories', setter: setGameCategories, isArray: true },
      { key: 'products', setter: setProducts, isArray: true },
      { key: 'productCategories', setter: setProductCategories, isArray: true },
      { key: 'inventory', setter: setInventory, isArray: true },
      { key: 'productSales', setter: setProductSales, isArray: true },
      { key: 'shiftRecords', setter: setShiftRecords, isArray: true, sort: (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { key: 'expenses', setter: setExpenses, isArray: true, sort: (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { key: 'expenseTypes', setter: setExpenseTypes, isArray: true },
    ];

    let isMounted = true;
    let loadedCount = 0;
    const totalListeners = dataRefs.length;

    const handleLoad = () => {
      loadedCount++;
      if (loadedCount >= totalListeners && isMounted) {
        setLoading(false);
        if (isInitialLoad) {
            setIsInitialLoad(false);
        }
      }
    };

    const createUnsubscribe = (dbRefKey: string, setter: Dispatch<SetStateAction<any>>, isArray: boolean, sortFunc?: (a: any, b: any) => number) => {
      const dbRef = ref(db, dbRefKey);
      return onValue(
        dbRef,
        (snapshot) => {
          const data = snapshot.val();
          let processedData: any;
           if (isArray) {
                processedData = data ? Object.entries(data).map(([id, value]) => ({ id, ...(value as object) })) : [];
                if (sortFunc) {
                    processedData.sort(sortFunc);
                }
            } else {
                processedData = data || null;
            }

          if (isMounted) setter(processedData);
          handleLoad();
        },
        (err) => {
          console.error(`Firebase ${dbRefKey} error:`, err);
          if (isMounted) setError(err as Error);
          handleLoad();
        }
      );
    };

    const unsubscribes = dataRefs.map(({ key, setter, isArray, sort }) =>
      createUnsubscribe(key, setter, isArray, sort)
    );

    return () => {
      isMounted = false;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isInitialLoad, isAuthenticated]);

  const value = {
    games,
    employees,
    branches,
    safes,
    policies,
    receiptSettings,
    openShifts,
    transactions,
    subscriptions,
    subscriptionPlans,
    gameCategories,
    products,
    productCategories,
    inventory,
    productSales,
    shiftRecords,
    expenses,
    expenseTypes,
    loading,
    isInitialLoad,
    error,
  };


  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

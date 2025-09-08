

export interface CustomerChild {
    id: string; // Unique identifier for the child
    name: string;
    age: number;
    birthdate?: string; // YYYY-MM-DD format
    isGuest?: boolean;
}

export interface Child {
  id: string;
  children: CustomerChild[];
  parentName: string;
  phoneNumbers: string[];
  game: string;
  branchName: string;
  checkInTime: number;
  cashierUsername: string; // Added to track who checked the child in
  notes?: string;
  // For package based games
  packageName?: string;
  packageDuration?: number; // in minutes
  packagePrice?: number;
  prepaidSessionId?: string | null; // Links active session to the completed session that paid for it
  receiptNumber?: number;
}

export interface CompletedSession extends Child {
    receiptNumber: number;
    checkOutTime: number; // For prepaid, this might initially be the check-in time
    durationMs: number;
    cost: number; // Total cost
    costBeforeDiscount: number;
    durationCost?: number;
    entryFee?: number;
    discount?: number;
    subscriptionId?: string; // To link to a subscription if applicable
    overtimeCost?: number;
}

export interface Game {
    id: string;
    name: string;
    branch: string;
    status: 'Available' | 'Maintenance';
    categoryId: string;
    categoryName: string;
    paymentModel: 'prepaid' | 'postpaid'; // prepaid (cart), postpaid (play then pay)
    price?: number; // hourly rate for postpaid
    fixedTimePackages?: { duration: number; price: number; label: string }[];
}

export interface Employee {
    id:string;
    name: string;
    role: 'مشرف' | 'كاشير' | 'مدير فرع';
    branch: string | 'كل الفروع';
    status: 'Active' | 'On Leave' | 'Disabled';
    username?: string;
    password?: string;
    baseSalary?: number;
    canApplyDiscount?: boolean;
}

export interface Branch {
    id: string;
    name: string;
    manager: string;
    status: 'Active' | 'Inactive';
    nextReceiptNumber?: number;
}

export interface ShiftRecord {
  id: string;
  cashierName: string;
  cashierUsername: string;
  branchName: string;
  expectedRevenue: number;
  actualRevenue: number;
  notes?: string;
  date: string;
  difference: number;
  safeId: string;
  status: 'Open' | 'Closed' | 'Settled';
  settlementId?: string;
  sessionsRevenue?: number;
  subscriptionsRevenue?: number;
  productRevenue?: number;
}

export interface OpenShift {
    id: string;
    cashierUsername: string;
    cashierName: string;
    branchName: string;
    startTime: string;
}

export interface Safe {
    id: string;
    name: string;
    branchName: string;
    balance: number;
}

export interface SafeTransaction {
    id: string;
    safeId: string;
    shiftRecordId?: string; // Optional link to shift record
    settlementId?: string;
    branchName: string; // Denormalized for easier filtering
    safeName: string; // Denormalized for easier filtering
    amount: number;
    type: 'deposit' | 'withdrawal';
    date: string;
    cashierName: string;
    notes?: string;
}

export interface PricingPolicy {
    gameId: string;
    weekdayRate: number;
    weekendRate: number;
}

export type DayOfWeek = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface Policies {
    id?: string; // 'default' or branch ID
    appName?: string;
    maxCapacity: number;
    enableWeekendPricing: boolean;
    pricingPolicies: PricingPolicy[];
    roundingPolicy: 'hour' | 'half-hour' | 'quarter-hour' | 'none';
    entryFee: number;
    weekendDays: Record<DayOfWeek, boolean>;
    showPosStats: boolean;
    showCompletedSessions: boolean;
    posLabels?: {
        screenTitle?: string;
        activeSessionsTitle?: string;
        childColumnTitle?: string;
        parentColumnTitle?: string;
    };
    enablePackageOvertime: boolean;
    packageOvertimeRatePerMinute: number;
    packageOvertimeRounding: 'hour' | 'half-hour' | 'quarter-hour' | 'none';
    packageOvertimeNotificationInterval: number; // in seconds
    packageOvertimeGracePeriod: number; // in minutes
    entryFeeApplication: 'all' | 'hourly' | 'package' | 'none';
    packagePricingModel: 'per_session' | 'per_child';
    toastDuration: number;
    buyOneHourGetXFreeMinutes: number; // 0 for disabled, or 15, 30, 60 etc.
}

export interface Customer {
    id: string;
    parentName: string;
    phoneNumbers: string[];
    children: CustomerChild[];
    createdAt: string;
}

export interface Subscription {
    id: string;
    customerId: string;
    customerName: string;
    childName: string;
    planId: string;
    planName: string;
    planDescription?: string;
    startDate: string;
    endDate: string;
    price: number;
    status: 'Active' | 'Expired';
    createdAt: string;
    cashierUsername: string;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    duration: number; // in days
    description?: string;
}

export interface GameCategory {
    id: string;
    name: string;
    color: string;
}

export interface ReceiptSettings {
    showLogo: boolean;
    showAppName: boolean;
    showAddress: boolean;
    address?: string;
    showPhone: boolean;
    phone?: string;
    showCustomTitle: boolean;
    customTitle?: string;
    showReceiptId: boolean;
    showCashierName: boolean;
    showCheckInTime: boolean;
    showCheckOutTime: boolean;
    showParentName: boolean;
    showChildName: boolean;
    showCustomerPhone?: boolean;
    showGameName: boolean;
    showDuration: boolean;
    showDurationCost: boolean;
    showEntryFee: boolean;
    showDiscount: boolean;
    showTotalCost: boolean;
    showThankYouMessage: boolean;
    thankYouMessage?: string;
    customFooter?: string;
    layout?: 'one-column' | 'two-columns';
    receiptWidth?: number;
    showTimestamp?: boolean;
}

export interface PosReceiptProps {
  receiptId?: string;
  settings: ReceiptSettings | null;
  appName: string;
  branchName: string;
  children: CustomerChild[];
  parentName: string;
  phoneNumbers: string[];
  gameName: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: string;
  totalCost: number;
  amountReceived?: number;
  costBeforeDiscount: number;
  durationCost?: number;
  entryFee?: number;
  discount?: number;
  cashierName: string;
  isSubscription?: boolean;
  packagePrice?: number;
  packageName?: string;
  packageDuration?: number;
  overtimeCost?: number;
  notes?: string;
}

export interface ProductReceiptProps {
  receiptId?: string;
  settings: ReceiptSettings | null;
  appName: string;
  branchName: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  cashierName: string;
  sessionInfo?: {
    children: CustomerChild[];
    checkInTime: Date;
    expectedCheckOutTime: Date;
  }
  notes?: string;
}


export interface ExpenseType {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    date: string;
    typeId: string;
    branchName: string;
    amount: number;
    safeId: string;
    gameId?: string;
    gameName?: string;
    notes?: string;
}

export interface PayrollTransaction {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'advance' | 'bonus' | 'penalty';
    amount: number;
    date: string; // ISO string
    recordedBy: string; // username or name of admin/manager
    notes?: string;
}

export interface ProductCategory {
    id: string;
    name: string;
}

// Represents a product in the global catalog
export interface Product {
    id: string;
    type: 'product';
    name: string;
    categoryId: string;
    categoryName: string;
}

// Represents an item in a specific branch's inventory
export interface InventoryItem {
    id: string; // The ID of this specific inventory entry
    type: 'product'; // To distinguish from game items in cart
    productId: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    branchId: string;
    branchName: string;
    quantity: number;
    price: number;
}

export interface ProductSaleItem {
    id: string; // This will be the InventoryItem ID
    productId: string; // This will be the Product ID
    productName: string;
    categoryId: string;
    categoryName: string;
    price: number;
    cartQuantity: number;
}

export interface ProductSale {
    id: string;
    receiptNumber: number;
    items: ProductSaleItem[];
    totalAmount: number;
    branchName: string;
    cashierName: string;
    cashierUsername: string;
    createdAt: string; // ISO String
    notes?: string;
}

export interface InventoryMovement {
    id: string;
    date: string; // ISO string
    productId: string;
    productName: string;
    branchId: string;
    branchName: string;
    type: 'Sale' | 'Manual Adjustment' | 'Initial Stock';
    change: number; // e.g., -5 for sale, +10 for manual increase
    quantityBefore: number;
    quantityAfter: number;
    recordedBy: string;
    referenceId?: string; // e.g., productSaleId
}


// Represents a prepaid game session ready to be added to the cart
export interface PrepaidGameCartItem {
    type: 'prepaid-game';
    id: string; // Unique ID for the cart item, e.g., combining game, customer, child, and package
    sessionDetails: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>;
    price: number;
    cartQuantity: number;
}

export interface ExtendSessionCartItem {
    type: 'extend-session';
    id: string; // Unique cart item ID
    activeSessionId: string;
    originalSessionId: string; // ID of the initial completedSession
    childName: string;
    gameName: string;
    packageName: string;
    packageDuration: number;
    price: number;
    cartQuantity: number;
}

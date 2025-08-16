

export interface CustomerChild {
    id: string; // Unique identifier for the child
    name: string;
    age: number;
    birthdate?: string; // YYYY-MM-DD format
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
  // For package based games
  packageDuration?: number; // in minutes
  packagePrice?: number;
  prepaidSessionId?: string; // Links active session to the completed session that paid for it
}

export interface CompletedSession extends Child {
    receiptNumber?: number;
    checkOutTime: number;
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
    price: number; // hourly rate for postpaid, base price for prepaid packages
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
        activeSessionsTitle?: string;
        childColumnTitle?: string;
        parentColumnTitle?: string;
    };
    enablePackageOvertime: boolean;
    packageOvertimeRatePerMinute: number;
    packageOvertimeRounding: 'hour' | 'half-hour' | 'quarter-hour' | 'none';
    packageOvertimeNotificationInterval?: number; // in seconds
    entryFeeApplication: 'all' | 'hourly' | 'package' | 'none';
    packagePricingModel: 'per_session' | 'per_child';
    toastDuration?: number;
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
    duration: number; // in minutes
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
    showThankYouMessage: boolean;
    thankYouMessage?: string;
    showChildName: boolean;
    showParentName: boolean;
    showGameName: boolean;
    showCheckInTime: boolean;
    showCheckOutTime: boolean;
    showDuration: boolean;
    showDurationCost: boolean;
    showEntryFee: boolean;
    showDiscount: boolean;
    showTotalCost: boolean;
    showCashierName: boolean;
    showReceiptId: boolean;
    showTimestamp: boolean;
    customFooter?: string;
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
    name: string;
    categoryId: string;
    categoryName: string;
}

// Represents an item in a specific branch's inventory
export interface InventoryItem {
    id: string; // The ID of this specific inventory entry
    productId: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    branchId: string;
    branchName: string;
    quantity: number;
    price: number;
}

export interface ProductSale {
    id: string;
    receiptNumber?: number;
    items: (Omit<InventoryItem, 'quantity'> & { cartQuantity: number })[];
    totalAmount: number;
    branchName: string;
    cashierName: string;
    cashierUsername: string;
    createdAt: string; // ISO String
}

// Represents a prepaid game session ready to be added to the cart
export interface PrepaidGameCartItem {
    type: 'prepaid-game';
    id: string; // Unique ID for the cart item
    sessionDetails: Omit<Child, 'id' | 'checkInTime' | 'cashierUsername'>;
    price: number;
}

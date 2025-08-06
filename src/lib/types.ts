

export interface CustomerChild {
    name: string;
    age: number;
}

export interface Child {
  id: number;
  children: CustomerChild[];
  parentName: string;
  phoneNumber: string;
  game: string;
  branchName: string;
  checkInTime: number;
  cashierUsername: string; // Added to track who checked the child in
}

export interface CompletedSession extends Child {
    checkOutTime: number;
    durationMs: number;
    cost: number; // Total cost
    durationCost?: number;
    entryFee?: number;
    discount?: number;
    subscriptionId?: string; // To link to a subscription if applicable
}

export interface Game {
    id: string;
    name: string;
    hourly_rate: number;
    branch: string;
    image: string;
    status: 'Available' | 'Maintenance';
    categoryId: string;
    categoryName: string;
}

export interface Employee {
    id: string;
    name: string;
    role: 'مشرف' | 'كاشير' | 'مدير فرع';
    branch: string | 'كل الفروع';
    status: 'Active' | 'On Leave' | 'Disabled';
    avatarUrl: string;
    username?: string;
    password?: string;
}

export interface Branch {
    id: string;
    name: string;
    manager: string;
    status: 'Active' | 'Inactive';
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
    appName?: string;
    maxCapacity: number;
    enableWeekendPricing: boolean;
    pricingPolicies: PricingPolicy[];
    roundingPolicy: 'hour' | 'half-hour' | 'quarter-hour' | 'none';
    entryFee: number;
    weekendDays: Record<DayOfWeek, boolean>;
}

export interface Customer {
    id: string;
    parentName: string;
    phoneNumber: string;
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

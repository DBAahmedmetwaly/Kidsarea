

export interface Child {
  id: number;
  name: string;
  age: number;
  parentName: string;
  phoneNumber: string;
  game: string;
  checkInTime: number;
  cashierUsername: string; // Added to track who checked the child in
}

export interface CompletedSession extends Child {
    checkOutTime: number;
    durationMs: number;
    cost: number;
}

export interface Game {
    id: string;
    name: string;
    hourly_rate: number;
    fractional_rate?: number;
    branch: string;
    image: string;
    status: 'Available' | 'Maintenance';
}

export interface Employee {
    id: string;
    name: string;
    role: 'مشرف' | 'كاشير' | 'مدير فرع';
    branch: string;
    status: 'Active' | 'On Leave';
    avatarUrl: string;
    username?: string;
    password?: string;
}

export interface Branch {
    id: string;
    name: string;
    manager: string;
    employees: number;
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
  analysis: any; // Consider creating a specific type for analysis output
  safeId: string;
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
    shiftRecordId: string;
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

export interface Policies {
    maxCapacity: number;
    enableWeekendPricing: boolean;
    pricingPolicies: PricingPolicy[];
}

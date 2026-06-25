// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  token: string;
  fullName: string;
  email: string;
  role: string;
  unitIds: string[];
  expiresAt: string;
}

// ── Units ─────────────────────────────────────────────────────────────────────
export type UnitStatus = 'Active' | 'Inactive';

export interface Unit {
  id: string;
  name: string;
  identifier: string;
  status: UnitStatus;
  createdAt: string;
}

export interface CreateUnitRequest {
  name: string;
  identifier: string;
}

export interface UpdateUnitRequest {
  name: string;
  identifier: string;
  status: UnitStatus;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  unitIds: string[];
  createdAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
  unitIds: string[];
}

export interface UpdateUserRequest {
  fullName: string;
  role: string;
  isActive: boolean;
  unitIds: string[];
}

// ── Financial Entries ─────────────────────────────────────────────────────────
export type FinancialEntryType = 'Revenue' | 'Expense';

export interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  type: FinancialEntryType;
  date: string;
  notes?: string;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  salesChannelId?: string;
  salesChannelName?: string;
}

// ── Accounts Payable ──────────────────────────────────────────────────────────
export type AccountPayableStatus = 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: AccountPayableStatus;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
}

// ── Accounts Receivable ───────────────────────────────────────────────────────
export type AccountReceivableStatus = 'Pending' | 'Received' | 'Overdue' | 'Cancelled';

export interface AccountReceivable {
  id: string;
  description: string;
  expectedAmount: number;
  receivedAmount?: number;
  expectedDate: string;
  receivedDate?: string;
  status: AccountReceivableStatus;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export type BudgetStatus = 'Active' | 'Exceeded' | 'Closed';

export interface Budget {
  id: string;
  description: string;
  totalAmount: number;
  usedAmount: number;
  availableAmount: number;
  month: number;
  year: number;
  status: BudgetStatus;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
}

// ── Purchases ─────────────────────────────────────────────────────────────────
export type PurchaseStatus = 'Intended' | 'Confirmed' | 'Cancelled';

export interface Purchase {
  id: string;
  description: string;
  amount: number;
  dueDate?: string;
  status: PurchaseStatus;
  unitId: string;
  unitName: string;
  budgetId: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export type AlertType =
  | 'LowBudget'
  | 'UpcomingDue'
  | 'NegativeBalance'
  | 'BudgetExceeded'
  | 'OverduePayable';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  referenceId?: string;
  createdAt: string;
  unitId: string;
  unitName: string;
}

// ── Lookup tables ─────────────────────────────────────────────────────────────
export interface FinancialCategory {
  id: string;
  name: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface SalesChannel {
  id: string;
  name: string;
}

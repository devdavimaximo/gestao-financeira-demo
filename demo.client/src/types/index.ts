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

export interface CreateEntryRequest {
  description: string;
  amount: number;
  type: FinancialEntryType;
  date: string;
  notes?: string;
  unitId: string;
  categoryId: string;
  paymentMethodId: string;
  salesChannelId?: string;
}

export interface UpdateEntryRequest {
  description: string;
  amount: number;
  type: FinancialEntryType;
  date: string;
  notes?: string;
  categoryId: string;
  paymentMethodId: string;
  salesChannelId?: string;
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
  notes?: string;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
}

export interface CreatePayableRequest {
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
  unitId: string;
  categoryId: string;
  paymentMethodId?: string;
}

export interface UpdatePayableRequest {
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
  categoryId: string;
  paymentMethodId?: string;
}

export interface PayPayableRequest {
  paidAmount: number;
  paidDate: string;
  paymentMethodId: string;
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
  notes?: string;
  unitId: string;
  unitName: string;
  categoryId: string;
  categoryName: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
}

export interface CreateReceivableRequest {
  description: string;
  expectedAmount: number;
  expectedDate: string;
  notes?: string;
  unitId: string;
  categoryId: string;
  paymentMethodId?: string;
}

export interface ReceiveRequest {
  receivedAmount: number;
  receivedDate: string;
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
}

export interface CreateBudgetRequest {
  description: string;
  totalAmount: number;
  month: number;
  year: number;
  unitId: string;
}

export interface UpdateBudgetRequest {
  description: string;
  totalAmount: number;
}

// ── Purchases ─────────────────────────────────────────────────────────────────
export type PurchaseStatus = 'Intended' | 'Confirmed' | 'Cancelled';

export interface Purchase {
  id: string;
  description: string;
  amount: number;
  dueDate?: string;
  status: PurchaseStatus;
  notes?: string;
  unitId: string;
  unitName: string;
  budgetId: string;
  budgetDescription: string;
  categoryId: string;
  categoryName: string;
}

export interface CreatePurchaseRequest {
  description: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  unitId: string;
  categoryId: string;
  budgetId: string;
}

export interface UpdatePurchaseRequest {
  description: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  categoryId: string;
  status: PurchaseStatus;
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardKpi {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  pendingPayables: number;
  pendingReceivables: number;
  unreadAlerts: number;
}

export interface ChartPoint {
  label: string;
  revenue: number;
  expenses: number;
}

export interface CategorySummary {
  name: string;
  amount: number;
  count: number;
}

export interface DashboardData {
  kpis: DashboardKpi;
  monthlyChart: ChartPoint[];
  topExpenses: CategorySummary[];
  topRevenues: CategorySummary[];
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────
export interface CashFlowPoint {
  label: string;
  date: string;
  revenue: number;
  expenses: number;
  balance: number;
  runningBalance: number;
}

export interface CashFlowData {
  points: CashFlowPoint[];
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export type CalendarEventType = 'Payable' | 'Receivable' | 'Revenue' | 'Expense';

export interface CalendarEvent {
  id: string;
  title: string;
  amount: number;
  date: string;
  eventType: CalendarEventType;
  status: string;
  unitName: string;
}

// ── Channels ──────────────────────────────────────────────────────────────────
export interface ChannelSummary {
  channelName: string;
  amount: number;
  count: number;
  percentage: number;
}

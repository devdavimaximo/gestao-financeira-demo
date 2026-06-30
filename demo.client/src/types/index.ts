// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserStatus = 'Active' | 'Blocked' | 'Suspended' | 'AwaitingActivation' | 'Deactivated';

export interface UnitAccess {
  unitId: string;
  unitName: string;
  roleName: string;
  permissions: string[];
}

export interface AuthUser {
  token: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: UserStatus;
  forcePasswordChange: boolean;
  units: UnitAccess[];
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
export type RecurrenceType = 'Weekly' | 'Monthly' | 'Yearly';

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
  parentEntryId?: string;
  recurrenceFrequency?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
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
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
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
  scope?: 'single' | 'all';
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
  dueDate?: string;
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

// ── Admin — Users ─────────────────────────────────────────────────────────────
export interface AdminUserUnitRole {
  unitId: string;
  unitName: string;
  roleId: string;
  roleName: string;
}

export interface AdminUserListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  status: UserStatus;
  forcePasswordChange: boolean;
  createdAt: string;
  lastSeenAt?: string;
  units: AdminUserUnitRole[];
}

export interface AdminUserDetail {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  notes?: string;
  status: UserStatus;
  forcePasswordChange: boolean;
  isSystemUser: boolean;
  createdAt: string;
  createdByUserId?: string;
  units: AdminUserUnitRole[];
}

export interface AdminCreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  notes?: string;
  status: UserStatus;
  forcePasswordChange: boolean;
  units: { unitId: string; roleId: string }[];
}

export interface AdminUpdateUserRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface UserTimelineEvent {
  id: string;
  action: string;
  actorFullName?: string;
  entityId?: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminUserPermissions {
  unitId: string;
  unitName: string;
  roleName: string;
  rolePermissions: string[];
  overrides: {
    permissionId: string;
    code: string;
    name: string;
    isGranted: boolean;
  }[];
}

// ── Admin — Roles ─────────────────────────────────────────────────────────────
export interface AdminRoleListItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface AdminRoleDetail {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  permissionCodes: string[];
}

export interface AdminCreateRoleRequest {
  name: string;
  description?: string;
  permissionCodes: string[];
}

export interface AdminUpdateRoleRequest {
  name: string;
  description?: string;
  isActive: boolean;
  permissionCodes: string[];
}

// ── Admin — Modules / Permissions ─────────────────────────────────────────────
export interface AdminPermissionItem {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface AdminModule {
  id: string;
  code: string;
  name: string;
  icon?: string;
  displayOrder: number;
  permissions: AdminPermissionItem[];
}

// ── Admin — Audit ─────────────────────────────────────────────────────────────
export interface AdminAuditLog {
  id: string;
  actorUserId?: string;
  actorFullName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: string;
  after?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ── Admin — Sessions ──────────────────────────────────────────────────────────
export interface AdminSession {
  id: string;
  userId: string;
  userFullName: string;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
  lastSeenAt: string;
  expiresAt: string;
  createdAt: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

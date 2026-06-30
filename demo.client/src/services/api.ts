import type {
  Unit, CreateUnitRequest, UpdateUnitRequest,
  AppUser, CreateUserRequest, UpdateUserRequest,
  FinancialCategory, PaymentMethod, SalesChannel,
  FinancialEntry, CreateEntryRequest, UpdateEntryRequest,
  AccountPayable, CreatePayableRequest, UpdatePayableRequest, PayPayableRequest,
  AccountReceivable, CreateReceivableRequest, ReceiveRequest,
  Budget, CreateBudgetRequest, UpdateBudgetRequest,
  Purchase, CreatePurchaseRequest, UpdatePurchaseRequest,
  Alert, DashboardData, CashFlowData, CalendarEvent, ChannelSummary,
} from '../types';

const BASE_URL = '/api';
const STORAGE_KEY = 'gestao_financeira_user';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return (JSON.parse(stored) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Erro ${res.status}: ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') p.set(key, String(value));
  });
  const str = p.toString();
  return str ? `?${str}` : '';
}

// ── Units ─────────────────────────────────────────────────────────────────────
export const unitsApi = {
  getAll: () => request<Unit[]>('/units'),
  getById: (id: string) => request<Unit>(`/units/${id}`),
  create: (dto: CreateUnitRequest) =>
    request<Unit>('/units', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateUnitRequest) =>
    request<Unit>(`/units/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) =>
    request<void>(`/units/${id}`, { method: 'DELETE' }),
  permanentDelete: (id: string) =>
    request<void>(`/units/${id}/permanent`, { method: 'DELETE' }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => request<AppUser[]>('/users'),
  getById: (id: string) => request<AppUser>(`/users/${id}`),
  create: (dto: CreateUserRequest) =>
    request<AppUser>('/users', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateUserRequest) =>
    request<AppUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deactivate: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};

// ── Lookup ────────────────────────────────────────────────────────────────────
export const lookupApi = {
  getCategories: () => request<FinancialCategory[]>('/lookup/categories'),
  getPaymentMethods: () => request<PaymentMethod[]>('/lookup/payment-methods'),
  getSalesChannels: () => request<SalesChannel[]>('/lookup/sales-channels'),
};

// ── Financial Entries ─────────────────────────────────────────────────────────
export const entriesApi = {
  getAll: (params?: { unitId?: string | null; type?: string; categoryId?: string; from?: string; to?: string }) =>
    request<FinancialEntry[]>(`/entries${buildParams(params as Record<string, unknown>)}`),
  create: (dto: CreateEntryRequest) =>
    request<FinancialEntry>('/entries', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateEntryRequest) =>
    request<FinancialEntry>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string, scope: 'single' | 'all' = 'single') =>
    request<void>(`/entries/${id}?scope=${scope}`, { method: 'DELETE' }),
};

// ── Accounts Payable ──────────────────────────────────────────────────────────
export const payablesApi = {
  getAll: (params?: { unitId?: string | null; status?: string; from?: string; to?: string }) =>
    request<AccountPayable[]>(`/payables${buildParams(params as Record<string, unknown>)}`),
  create: (dto: CreatePayableRequest) =>
    request<AccountPayable>('/payables', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdatePayableRequest) =>
    request<AccountPayable>(`/payables/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  pay: (id: string, dto: PayPayableRequest) =>
    request<AccountPayable>(`/payables/${id}/pay`, { method: 'POST', body: JSON.stringify(dto) }),
  cancel: (id: string) =>
    request<void>(`/payables/${id}`, { method: 'DELETE' }),
};

// ── Accounts Receivable ───────────────────────────────────────────────────────
export const receivablesApi = {
  getAll: (params?: { unitId?: string | null; status?: string; from?: string; to?: string }) =>
    request<AccountReceivable[]>(`/receivables${buildParams(params as Record<string, unknown>)}`),
  create: (dto: CreateReceivableRequest) =>
    request<AccountReceivable>('/receivables', { method: 'POST', body: JSON.stringify(dto) }),
  receive: (id: string, dto: ReceiveRequest) =>
    request<AccountReceivable>(`/receivables/${id}/receive`, { method: 'POST', body: JSON.stringify(dto) }),
  cancel: (id: string) =>
    request<void>(`/receivables/${id}`, { method: 'DELETE' }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────
export const budgetsApi = {
  getAll: (params?: { unitId?: string | null; month?: number; year?: number; status?: string }) =>
    request<Budget[]>(`/budgets${buildParams(params as Record<string, unknown>)}`),
  create: (dto: CreateBudgetRequest) =>
    request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateBudgetRequest) =>
    request<Budget>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
};

// ── Purchases ─────────────────────────────────────────────────────────────────
export const purchasesApi = {
  getAll: (params?: { unitId?: string | null; budgetId?: string; status?: string }) =>
    request<Purchase[]>(`/purchases${buildParams(params as Record<string, unknown>)}`),
  create: (dto: CreatePurchaseRequest) =>
    request<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdatePurchaseRequest) =>
    request<Purchase>(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  cancel: (id: string) =>
    request<void>(`/purchases/${id}`, { method: 'DELETE' }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: (params?: { unitId?: string | null; month?: number; year?: number }) =>
    request<DashboardData>(`/dashboard${buildParams(params as Record<string, unknown>)}`),
};

// ── Cash Flow ─────────────────────────────────────────────────────────────────
export const cashFlowApi = {
  get: (params?: { unitId?: string | null; from?: string; to?: string }) =>
    request<CashFlowData>(`/cashflow${buildParams(params as Record<string, unknown>)}`),
};

// ── Calendar ──────────────────────────────────────────────────────────────────
export const calendarApi = {
  get: (params?: { unitId?: string | null; month?: number; year?: number }) =>
    request<CalendarEvent[]>(`/calendar${buildParams(params as Record<string, unknown>)}`),
};

// ── Channels ──────────────────────────────────────────────────────────────────
export const channelsApi = {
  get: (params?: { unitId?: string | null; from?: string; to?: string }) =>
    request<ChannelSummary[]>(`/channels${buildParams(params as Record<string, unknown>)}`),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertsApi = {
  getAll: (params?: { unitId?: string | null; isRead?: boolean }) =>
    request<Alert[]>(`/alerts${buildParams(params as Record<string, unknown>)}`),
  getUnreadCount: (unitId?: string | null) =>
    request<{ count: number }>(`/alerts/unread-count${buildParams({ unitId })}`),
  markRead: (id: string) =>
    request<void>(`/alerts/${id}/read`, { method: 'POST' }),
  markUnread: (id: string) =>
    request<void>(`/alerts/${id}/unread`, { method: 'POST' }),
  markAllRead: (unitId?: string | null) =>
    request<void>(`/alerts/read-all${buildParams({ unitId })}`, { method: 'POST' }),
};

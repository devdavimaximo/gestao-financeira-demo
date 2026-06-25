import type {
  Account, Budget, Category, CreateAccount, CreateBudget,
  CreateCategory, CreateTransaction, DashboardSummary, Transaction,
  TransactionType, CategoryType
} from '../types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const dashboardApi = {
  getSummary: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return request<DashboardSummary>(`/dashboard?${params}`);
  },
};

export const transactionsApi = {
  getAll: (filters?: { accountId?: number; categoryId?: number; type?: TransactionType; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.accountId) params.set('accountId', String(filters.accountId));
    if (filters?.categoryId) params.set('categoryId', String(filters.categoryId));
    if (filters?.type) params.set('type', filters.type);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return request<Transaction[]>(`/transactions?${params}`);
  },
  getById: (id: number) => request<Transaction>(`/transactions/${id}`),
  create: (dto: CreateTransaction) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: Partial<CreateTransaction>) => request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
};

export const categoriesApi = {
  getAll: (type?: CategoryType) => {
    const params = type ? `?type=${type}` : '';
    return request<Category[]>(`/categories${params}`);
  },
  getById: (id: number) => request<Category>(`/categories/${id}`),
  create: (dto: CreateCategory) => request<Category>('/categories', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: Partial<CreateCategory>) => request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

export const accountsApi = {
  getAll: (activeOnly?: boolean) => request<Account[]>(`/accounts${activeOnly ? '?activeOnly=true' : ''}`),
  getById: (id: number) => request<Account>(`/accounts/${id}`),
  create: (dto: CreateAccount) => request<Account>('/accounts', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: Partial<CreateAccount & { isActive: boolean }>) => request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) => request<void>(`/accounts/${id}`, { method: 'DELETE' }),
};

export const budgetsApi = {
  getAll: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return request<Budget[]>(`/budgets?${params}`);
  },
  getById: (id: number) => request<Budget>(`/budgets/${id}`),
  create: (dto: CreateBudget) => request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: number, dto: Partial<CreateBudget>) => request<Budget>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: number) => request<void>(`/budgets/${id}`, { method: 'DELETE' }),
};

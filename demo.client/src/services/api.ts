import type {
  Unit, CreateUnitRequest, UpdateUnitRequest,
  AppUser, CreateUserRequest, UpdateUserRequest,
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

export const unitsApi = {
  getAll: () => request<Unit[]>('/units'),
  getById: (id: string) => request<Unit>(`/units/${id}`),
  create: (dto: CreateUnitRequest) =>
    request<Unit>('/units', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateUnitRequest) =>
    request<Unit>(`/units/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) =>
    request<void>(`/units/${id}`, { method: 'DELETE' }),
};

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

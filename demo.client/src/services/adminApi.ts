import type {
  AdminUserListItem, AdminUserDetail, AdminCreateUserRequest, AdminUpdateUserRequest,
  AdminUserPermissions, UserTimelineEvent,
  AdminRoleListItem, AdminRoleDetail, AdminCreateRoleRequest, AdminUpdateRoleRequest,
  AdminModule, AdminAuditLog, AdminSession,
} from '../types';

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
  const res = await fetch(`/api/admin${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/login';
    throw new Error('Sessão expirada.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const adminUsersApi = {
  getAll: (params?: { search?: string; status?: string; unitId?: string; page?: number; pageSize?: number }) =>
    request<{ total: number; page: number; pageSize: number; data: AdminUserListItem[] }>(
      `/users${buildParams({ pageSize: 20, ...params })}`
    ),

  getById: (id: string) => request<AdminUserDetail>(`/users/${id}`),

  create: (dto: AdminCreateUserRequest) =>
    request<AdminUserDetail>('/users', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: string, dto: AdminUpdateUserRequest) =>
    request<AdminUserDetail>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),

  hardDelete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  block: (id: string, reason?: string) =>
    request<void>(`/users/${id}/block`, { method: 'POST', body: JSON.stringify({ reason }) }),

  unblock: (id: string) =>
    request<void>(`/users/${id}/unblock`, { method: 'POST' }),

  suspend: (id: string, blockedUntil: string, reason?: string) =>
    request<void>(`/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ blockedUntil, reason }) }),

  activate: (id: string) =>
    request<void>(`/users/${id}/activate`, { method: 'POST' }),

  deactivate: (id: string) =>
    request<void>(`/users/${id}/deactivate`, { method: 'POST' }),

  resetPassword: (id: string, newPassword: string) =>
    request<void>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),

  getTimeline: (id: string) =>
    request<UserTimelineEvent[]>(`/users/${id}/timeline`),

  getPermissions: (id: string, unitId: string) =>
    request<AdminUserPermissions>(`/users/${id}/permissions/${unitId}`),

  updatePermissions: (id: string, unitId: string, overrides: { permissionId: string; isGranted: boolean }[]) =>
    request<void>(`/users/${id}/permissions/${unitId}`, { method: 'PUT', body: JSON.stringify({ overrides }) }),

  updateUnits: (id: string, units: { unitId: string; roleId: string }[]) =>
    request<void>(`/users/${id}/units`, { method: 'PUT', body: JSON.stringify({ units }) }),

  getSessions: (id: string) =>
    request<AdminSession[]>(`/users/${id}/sessions`),

  revokeAllSessions: (id: string) =>
    request<void>(`/users/${id}/sessions`, { method: 'DELETE' }),
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const adminRolesApi = {
  getAll: () => request<AdminRoleListItem[]>('/roles'),

  getById: (id: string) => request<AdminRoleDetail>(`/roles/${id}`),

  create: (dto: AdminCreateRoleRequest) =>
    request<AdminRoleDetail>('/roles', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: string, dto: AdminUpdateRoleRequest) =>
    request<AdminRoleDetail>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),

  delete: (id: string) =>
    request<void>(`/roles/${id}`, { method: 'DELETE' }),

  duplicate: (id: string) =>
    request<AdminRoleDetail>(`/roles/${id}/duplicate`, { method: 'POST' }),
};

// ── Permissions / Modules ─────────────────────────────────────────────────────
export const adminPermissionsApi = {
  getModules: () => request<AdminModule[]>('/permissions/modules'),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const adminAuditApi = {
  getAll: (params?: { action?: string; entityType?: string; actorUserId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    request<{ total: number; page: number; pageSize: number; data: AdminAuditLog[] }>(
      `/audit${buildParams(params)}`
    ),

  getForUser: (userId: string) =>
    request<AdminAuditLog[]>(`/audit/user/${userId}`),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const adminSessionsApi = {
  getAll: () => request<AdminSession[]>('/sessions'),

  revoke: (id: string) =>
    request<void>(`/sessions/${id}`, { method: 'DELETE' }),

  revokeForUser: (userId: string) =>
    request<void>(`/sessions/user/${userId}`, { method: 'DELETE' }),

  revokeAll: () =>
    request<void>('/sessions/all', { method: 'DELETE' }),
};

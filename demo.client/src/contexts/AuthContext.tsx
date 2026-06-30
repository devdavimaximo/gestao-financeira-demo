import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (code: string, unitId?: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'gestao_financeira_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as AuthUser;
      if (new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const hasPermission = useCallback((code: string, unitId?: string): boolean => {
    if (!user) return false;
    if (unitId) {
      return user.units.some(u => u.unitId === unitId && u.permissions.includes(code));
    }
    return user.units.some(u => u.permissions.includes(code));
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      throw new Error((data as { message?: string }).message ?? 'Credenciais inválidas.');
    }

    const data = await res.json() as AuthUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const token = stored ? (JSON.parse(stored) as AuthUser).token : null;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('gestao_financeira_unit');
      setUser(null);
    }
  }, []);

  // isAdmin: has users:view permission in any unit
  const isAdmin = !!user?.units.some(u => u.permissions.includes('users:view'));

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

import { useAuth } from '../contexts/AuthContext';

export function usePermission(code: string, unitId?: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(code, unitId);
}

export function usePermissions(codes: string[], unitId?: string): Record<string, boolean> {
  const { hasPermission } = useAuth();
  return Object.fromEntries(codes.map(code => [code, hasPermission(code, unitId)]));
}

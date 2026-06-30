import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';

interface Props {
  permission: string;
  unitId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function PermissionGate({ permission, unitId, fallback = null, children }: Props) {
  const allowed = usePermission(permission, unitId);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

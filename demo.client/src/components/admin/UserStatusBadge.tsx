import { cn } from '../../lib/utils';
import type { UserStatus } from '../../types';

const CONFIG: Record<UserStatus, { label: string; classes: string; dot: string }> = {
  Active:             { label: 'Ativo',              classes: 'bg-emerald-500/12 text-emerald-400 ring-emerald-500/20', dot: 'bg-emerald-400' },
  Blocked:            { label: 'Bloqueado',           classes: 'bg-red-500/12 text-red-400 ring-red-500/20',            dot: 'bg-red-400' },
  Suspended:          { label: 'Suspenso',            classes: 'bg-amber-500/12 text-amber-400 ring-amber-500/20',      dot: 'bg-amber-400' },
  AwaitingActivation: { label: 'Aguard. Ativação',   classes: 'bg-blue-500/12 text-blue-400 ring-blue-500/20',         dot: 'bg-blue-400' },
  Deactivated:        { label: 'Desativado',          classes: 'bg-slate-500/12 text-slate-400 ring-slate-500/20',      dot: 'bg-slate-400' },
};

interface Props {
  status: UserStatus;
  size?: 'sm' | 'md';
}

export default function UserStatusBadge({ status, size = 'md' }: Props) {
  const { label, classes, dot } = CONFIG[status] ?? CONFIG.Deactivated;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        classes,
      )}
    >
      <span className={cn('rounded-full shrink-0', dot, size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
      {label}
    </span>
  );
}

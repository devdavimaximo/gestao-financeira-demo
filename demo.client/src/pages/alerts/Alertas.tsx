import { motion } from 'framer-motion';
import { pageVariants } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, AlertTriangle, TrendingDown, Clock, ShoppingBag,
  CheckCheck, Check, AlertCircle,
} from 'lucide-react';
import { alertsApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import type { Alert, AlertType } from '../../types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import PageHeader from '../../components/shared/PageHeader';
import EmptyState from '../../components/shared/EmptyState';

const ALERT_META: Record<AlertType, {
  label: string;
  icon: React.ElementType;
  cardClass: string;
  badgeClass: string;
  iconClass: string;
}> = {
  LowBudget: {
    label: 'Verba Baixa',
    icon: ShoppingBag,
    cardClass: 'border-amber-100 bg-amber-50/40',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconClass: 'bg-amber-100 text-amber-600',
  },
  UpcomingDue: {
    label: 'Vencimento Próximo',
    icon: Clock,
    cardClass: 'border-blue-100 bg-blue-50/30',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconClass: 'bg-blue-100 text-blue-600',
  },
  NegativeBalance: {
    label: 'Saldo Negativo',
    icon: TrendingDown,
    cardClass: 'border-red-100 bg-red-50/30',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconClass: 'bg-red-100 text-red-600',
  },
  BudgetExceeded: {
    label: 'Verba Estourada',
    icon: AlertTriangle,
    cardClass: 'border-rose-100 bg-rose-50/40',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    iconClass: 'bg-rose-100 text-rose-700',
  },
  OverduePayable: {
    label: 'Conta Vencida',
    icon: AlertCircle,
    cardClass: 'border-red-100 bg-red-50/40',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconClass: 'bg-red-100 text-red-700',
  },
};

function formatDueDate(dueDate: string): { label: string; overdue: boolean } {
  const parts = dueDate.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = d < today;
  const formatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { label: formatted, overdue };
}

function AlertCard({
  alert, onMarkRead, onMarkUnread,
}: {
  alert: Alert;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
}) {
  const meta = ALERT_META[alert.type];
  const Icon = meta.icon;
  const due = alert.dueDate ? formatDueDate(alert.dueDate) : null;

  return (
    <div className={[
      'rounded-xl border p-4 flex gap-3 transition-all',
      meta.cardClass,
      alert.isRead ? 'opacity-60' : '',
    ].join(' ')}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconClass}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 ${meta.badgeClass}`}>
              {meta.label}
            </Badge>
            {!alert.isRead && (
              <span className="w-2 h-2 rounded-full bg-brand-navy shrink-0" aria-label="Não lido" />
            )}
          </div>
          {alert.isRead ? (
            <button
              onClick={() => onMarkUnread(alert.id)}
              aria-label="Marcar como não lido"
              title="Marcar como não lido"
              className="shrink-0 w-7 h-7 rounded-md hover:bg-white/60 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
            >
              <CheckCheck size={14} />
            </button>
          ) : (
            <button
              onClick={() => onMarkRead(alert.id)}
              aria-label="Marcar como lido"
              title="Marcar como lido"
              className="shrink-0 w-7 h-7 rounded-md hover:bg-white/60 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Check size={14} />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-800 leading-snug">{alert.message}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{alert.unitName}</span>
          {due && (
            <>
              <span>·</span>
              <span className={due.overdue ? 'text-red-500 font-medium' : ''}>
                {due.overdue ? 'Venceu em:' : 'Vence em:'} {due.label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Alertas() {
  const { selectedUnitId } = useUnit();
  const qc = useQueryClient();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts', selectedUnitId],
    queryFn: () => alertsApi.getAll({ unitId: selectedUnitId }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => alertsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-count'] });
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => alertsApi.markUnread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => alertsApi.markAllRead(selectedUnitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-count'] });
    },
  });

  const unread   = alerts.filter(a => !a.isRead);
  const hasUnread = unread.length > 0;

  const sorted = [...alerts].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const subtitle = isLoading
    ? 'Carregando...'
    : `${unread.length} não lido${unread.length !== 1 ? 's' : ''} de ${alerts.length} total`;

  return (
    <motion.div className="space-y-5" variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Alertas Financeiros"
        subtitle={subtitle}
        action={
          hasUnread && (
            <Button
              variant="outline" size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="gap-1.5"
              aria-label="Marcar todos os alertas como lidos"
            >
              {markAllMutation.isPending
                ? <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                : <CheckCheck size={14} />
              }
              Marcar todos como lido
            </Button>
          )
        }
      />

      {/* Summary badges */}
      {!isLoading && alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ALERT_META) as AlertType[]).map(type => {
            const count = alerts.filter(a => a.type === type).length;
            if (count === 0) return null;
            const meta = ALERT_META[type];
            return (
              <Badge key={type} variant="outline" className={`${meta.badgeClass} text-xs font-semibold`}>
                {meta.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
              <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <EmptyState
          icon={<AlertCircle size={22} strokeWidth={1.5} />}
          title="Erro ao carregar alertas"
          description={(error as Error).message}
        />
      )}

      {/* Empty */}
      {!isLoading && !error && alerts.length === 0 && (
        <EmptyState
          icon={<Bell size={22} strokeWidth={1.5} />}
          title="Nenhum alerta no momento"
          description="Os alertas aparecerão aqui quando houver vencimentos, verbas baixas ou saldo negativo"
        />
      )}

      {/* Alert list */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={id => markReadMutation.mutate(id)}
              onMarkUnread={id => markUnreadMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

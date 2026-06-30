import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, Monitor, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { adminUsersApi, adminRolesApi, adminSessionsApi, adminAuditApi } from '../../services/adminApi';
import { cn } from '../../lib/utils';

export default function AdminDashboard() {
  const { data: usersResult } = useQuery({ queryKey: ['admin-users-dashboard'], queryFn: () => adminUsersApi.getAll({ pageSize: 500 }), staleTime: 60_000 });
  const users = usersResult?.data ?? [];
  const { data: roles = [] } = useQuery({ queryKey: ['admin-roles'], queryFn: () => adminRolesApi.getAll(), staleTime: 60_000 });
  const { data: sessions = [] } = useQuery({ queryKey: ['admin-sessions'], queryFn: () => adminSessionsApi.getAll(), staleTime: 30_000 });
  const { data: auditResult } = useQuery({ queryKey: ['admin-audit-recent'], queryFn: () => adminAuditApi.getAll({ pageSize: 10 }), staleTime: 30_000 });
  const audit = auditResult?.data ?? [];
  const auditTotal = auditResult?.total ?? 0;

  const activeUsers    = users.filter(u => u.status === 'Active').length;
  const blockedUsers   = users.filter(u => u.status === 'Blocked').length;
  const pendingUsers   = users.filter(u => u.status === 'AwaitingActivation').length;
  const systemRoles    = roles.filter(r => r.isSystem).length;

  const kpis = [
    { label: 'Usuários totais',    value: users.length,    icon: Users,       color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { label: 'Usuários ativos',    value: activeUsers,     icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Bloqueados',         value: blockedUsers,    icon: AlertTriangle, color: 'text-red-400',  bg: 'bg-red-500/10' },
    { label: 'Aguard. ativação',   value: pendingUsers,    icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10' },
    { label: 'Cargos configurados',value: roles.length,    icon: ShieldCheck, color: 'text-violet-400',  bg: 'bg-violet-500/10' },
    { label: 'Cargos de sistema',  value: systemRoles,     icon: ShieldCheck, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
    { label: 'Sessões ativas',     value: sessions.length, icon: Monitor,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
    { label: 'Eventos de auditoria', value: auditTotal,    icon: FileText,    color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0f172a]">
      <div>
        <h1 className="text-white font-semibold text-xl">Painel Administrativo</h1>
        <p className="text-white/40 text-sm mt-0.5">Visão geral do sistema de administração</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/4 border border-white/6 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', kpi.bg)}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
            </div>
            <div className={cn('text-2xl font-bold tabular-nums', kpi.color)}>{kpi.value}</div>
            <div className="text-white/40 text-xs mt-0.5">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent users */}
        <div className="bg-white/4 border border-white/6 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">Usuários recentes</h3>
          {users.length === 0 ? (
            <p className="text-white/25 text-xs">Nenhum usuário cadastrado</p>
          ) : (
            <ul className="space-y-2">
              {users.slice(0, 5).map(u => (
                <li key={u.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[9px] font-bold shrink-0">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs truncate">{u.fullName}</p>
                    <p className="text-white/30 text-[10px] truncate">{u.units.map(uu => uu.roleName).join(', ')}</p>
                  </div>
                  <StatusDot status={u.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent audit events */}
        <div className="bg-white/4 border border-white/6 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">Atividade recente</h3>
          {audit.length === 0 ? (
            <p className="text-white/25 text-xs">Nenhuma atividade registrada</p>
          ) : (
            <ul className="space-y-2">
              {audit.slice(0, 6).map(ev => (
                <li key={ev.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs">{ev.action} <span className="text-white/30">({ev.entityType})</span></p>
                    <p className="text-white/25 text-[10px]">
                      {ev.actorFullName && `${ev.actorFullName} · `}
                      {new Date(ev.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-400', Blocked: 'bg-red-400', Suspended: 'bg-amber-400',
  AwaitingActivation: 'bg-blue-400', Deactivated: 'bg-slate-400',
};

function StatusDot({ status }: { status: string }) {
  return <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[status] ?? 'bg-slate-400')} />;
}

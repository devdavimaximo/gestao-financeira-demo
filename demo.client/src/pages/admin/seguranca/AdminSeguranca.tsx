import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Monitor, FileText, Trash2, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Clock, Globe, User,
} from 'lucide-react';
import { adminSessionsApi, adminAuditApi } from '../../../services/adminApi';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type { AdminAuditLog, AdminSession } from '../../../types';

type Tab = 'sessions' | 'audit';

export default function AdminSeguranca() {
  const [tab, setTab] = useState<Tab>('sessions');

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0f172a]">
      <div className="px-6 pt-6 pb-0 border-b border-white/6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
            <Shield size={16} className="text-rose-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Segurança</h1>
            <p className="text-white/40 text-xs">Sessões ativas e trilha de auditoria</p>
          </div>
        </div>
        <div className="flex gap-1">
          {([['sessions', 'Sessões Ativas', Monitor], ['audit', 'Auditoria', FileText]] as const).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'text-white border-blue-500'
                  : 'text-white/40 border-transparent hover:text-white/70'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'sessions' ? <SessionsTab /> : <AuditTab />}
      </div>
    </div>
  );
}

// ── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => adminSessionsApi.getAll(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminSessionsApi.revoke(id),
    onSuccess: () => {
      toast({ title: 'Sessão revogada', variant: 'success' });
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => adminSessionsApi.revokeAll(),
    onSuccess: () => {
      toast({ title: 'Todas as sessões revogadas', variant: 'success' });
      void qc.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-sm">{sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} ativa{sessions.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button onClick={() => void refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/8 rounded-lg transition-colors">
            <RefreshCw size={12} />
            Atualizar
          </button>
          <button
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending || sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg disabled:opacity-40 transition-colors"
          >
            <Trash2 size={12} />
            Revogar todas
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={Monitor} message="Nenhuma sessão ativa no momento" />
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} onRevoke={() => revokeMutation.mutate(session.id)} revoking={revokeMutation.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onRevoke, revoking }: { session: AdminSession; onRevoke: () => void; revoking: boolean }) {
  const expiresAt = new Date(session.expiresAt);
  const isExpired = expiresAt < new Date();
  const lastSeen = new Date(session.lastSeenAt);

  return (
    <div className="bg-white/4 border border-white/6 rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
        <Monitor size={15} className="text-white/50" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <User size={11} className="text-white/30 shrink-0" />
          <span className="text-white text-sm font-medium truncate">{session.userFullName}</span>
        </div>
        {session.ipAddress && (
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Globe size={10} className="shrink-0" />
            <span>{session.ipAddress}</span>
          </div>
        )}
        {session.userAgent && (
          <p className="text-white/30 text-[10px] truncate">{session.userAgent}</p>
        )}
        <div className="flex items-center gap-2 text-white/30 text-[10px]">
          <Clock size={10} className="shrink-0" />
          <span>Visto: {lastSeen.toLocaleString('pt-BR')}</span>
          <span className={cn('ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium', isExpired ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400')}>
            {isExpired ? 'Expirada' : `Expira ${expiresAt.toLocaleDateString('pt-BR')}`}
          </span>
        </div>
      </div>
      <button
        onClick={onRevoke}
        disabled={revoking}
        className="shrink-0 w-7 h-7 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
        title="Revogar sessão"
      >
        {revoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
    </div>
  );
}

// ── Audit tab ─────────────────────────────────────────────────────────────────

function AuditTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  const { data: auditResult, isLoading } = useQuery({
    queryKey: ['admin-audit', entityTypeFilter],
    queryFn: () => adminAuditApi.getAll({ entityType: entityTypeFilter || undefined, pageSize: 100 }),
    staleTime: 30_000,
  });
  const logs = auditResult?.data ?? [];

  const entityTypes = Array.from(new Set(logs.map(l => l.entityType))).sort();

  if (isLoading) return <LoadingState />;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-sm">{logs.length} evento{logs.length !== 1 ? 's' : ''}</p>
        <select
          value={entityTypeFilter}
          onChange={e => setEntityTypeFilter(e.target.value)}
          className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 transition"
        >
          <option value="" className="bg-[#1e293b]">Todos os tipos</option>
          {entityTypes.map(t => <option key={t} value={t} className="bg-[#1e293b]">{t}</option>)}
        </select>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={FileText} message="Nenhum evento de auditoria registrado" />
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => (
            <AuditLogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId(prev => prev === log.id ? null : log.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogRow({ log, expanded, onToggle }: { log: AdminAuditLog; expanded: boolean; onToggle: () => void }) {
  const hasDiff = !!(log.before || log.after);

  return (
    <div className={cn('bg-white/3 border border-white/6 rounded-xl overflow-hidden transition-all', expanded && 'border-blue-500/20')}>
      <button
        onClick={hasDiff ? onToggle : undefined}
        className={cn('w-full flex items-center gap-3 px-4 py-3 text-left', hasDiff && 'hover:bg-white/4 transition-colors')}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-xs font-medium">{log.action}</span>
            <span className="text-[10px] bg-white/6 text-white/40 rounded px-1.5 py-0.5">{log.entityType}</span>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-[10px]">
            {log.actorFullName && <span>{log.actorFullName}</span>}
            {log.actorFullName && <span>·</span>}
            <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
            {log.ipAddress && <><span>·</span><span>{log.ipAddress}</span></>}
          </div>
        </div>
        {hasDiff && (
          expanded ? <ChevronDown size={13} className="text-white/30 shrink-0" /> : <ChevronRight size={13} className="text-white/30 shrink-0" />
        )}
      </button>

      {expanded && hasDiff && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-white/6 px-4 py-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {log.before && (
              <div>
                <p className="text-[9px] uppercase tracking-wide text-red-400/60 mb-1 font-medium">Antes</p>
                <pre className="text-[10px] text-white/50 bg-white/4 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {formatJson(log.before)}
                </pre>
              </div>
            )}
            {log.after && (
              <div>
                <p className="text-[9px] uppercase tracking-wide text-emerald-400/60 mb-1 font-medium">Depois</p>
                <pre className="text-[10px] text-white/50 bg-white/4 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {formatJson(log.after)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function formatJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw; }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="text-blue-400 animate-spin" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Shield; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon size={32} className="text-white/15 mb-3" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

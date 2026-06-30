import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, RefreshCw, X, ChevronRight,
  Shield, Trash2, Loader2,
} from 'lucide-react';
import { adminUsersApi } from '../../../services/adminApi';
import UserStatusBadge from '../../../components/admin/UserStatusBadge';
import Pagination from '../../../components/shared/Pagination';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type { AdminUserListItem, AdminUserDetail } from '../../../types';
import CreateUserModal from './CreateUserModal';
import UserDetailDrawer from './UserDetailDrawer';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Active', label: 'Ativos' },
  { value: 'Blocked', label: 'Bloqueados' },
  { value: 'Suspended', label: 'Suspensos' },
  { value: 'AwaitingActivation', label: 'Aguardando' },
  { value: 'Deactivated', label: 'Desativados' },
];

export default function AdminUsuarios() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserListItem | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const PAGE_SIZE = 20;

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data: pagedResult, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', debouncedSearch, statusFilter, page],
    queryFn: () => adminUsersApi.getAll({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const users = pagedResult?.data ?? [];
  const total = pagedResult?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.hardDelete(id),
    onSuccess: () => {
      toast({ title: 'Usuário excluído', description: 'Exclusão permanente realizada com sucesso.', variant: 'success' });
      setConfirmDelete(null);
      setConfirmDeleteName('');
      setSelectedUser(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'block' | 'unblock' | 'activate' | 'deactivate' }) => {
      if (action === 'block')      return adminUsersApi.block(id);
      if (action === 'unblock')    return adminUsersApi.unblock(id);
      if (action === 'activate')   return adminUsersApi.activate(id);
      if (action === 'deactivate') return adminUsersApi.deactivate(id);
    },
    onSuccess: (_, vars) => {
      const labels = { block: 'bloqueado', unblock: 'desbloqueado', activate: 'ativado', deactivate: 'desativado' };
      toast({ title: `Usuário ${labels[vars.action]}`, variant: 'success' });
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      if (selectedUser) {
        adminUsersApi.getById(selectedUser.id).then(setSelectedUser).catch(() => {});
      }
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  async function openDetail(user: AdminUserListItem) {
    setLoadingDetail(true);
    try {
      const detail = await adminUsersApi.getById(user.id);
      setSelectedUser(detail);
    } catch {
      toast({ title: 'Erro ao carregar usuário', variant: 'error' });
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen bg-[#0f172a]">
      {/* ── Main list ───────────────────────────────────────────────────────── */}
      <div className={cn('flex flex-col flex-1 min-w-0 transition-all duration-300', selectedUser ? 'hidden md:flex' : 'flex')}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Users size={16} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg leading-tight">Usuários</h1>
                <p className="text-white/40 text-xs">{total} usuário{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refetch()}
                className="w-8 h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/6 flex items-center justify-center transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Novo usuário
              </button>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-blue-500/50 transition"
            >
              {STATUS_FILTERS.map(f => (
                <option key={f.value} value={f.value} className="bg-[#1e293b]">{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <Users size={32} className="text-white/15 mb-3" />
              <p className="text-white/40 text-sm">Nenhum usuário encontrado</p>
              {(search || statusFilter) && (
                <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="text-blue-400 text-xs mt-2 hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {users.map(user => (
                <li key={user.id}>
                  <button
                    onClick={() => void openDetail(user)}
                    className={cn(
                      'w-full flex items-center gap-3 px-6 py-3.5 hover:bg-white/4 transition-colors text-left',
                      selectedUser?.id === user.id && 'bg-white/6 border-r-2 border-blue-500'
                    )}
                  >
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-medium truncate">{user.fullName}</span>
                        {user.isSystemUser && <Shield size={11} className="text-amber-400 shrink-0" title="Usuário do sistema" />}
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-xs">
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <UserStatusBadge status={user.status} size="sm" />
                        {user.units.slice(0, 2).map(u => (
                          <span key={u.unitId} className="text-[10px] bg-white/6 text-white/40 rounded px-1.5 py-0.5">
                            {u.unitName}
                          </span>
                        ))}
                        {user.units.length > 2 && (
                          <span className="text-[10px] text-white/30">+{user.units.length - 2}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/20 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-white/6">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Detail drawer (desktop side panel) ──────────────────────────────── */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onDelete={() => {
              const item = users.find(u => u.id === selectedUser.id);
              if (item) setConfirmDelete(item);
            }}
            onStatusChange={(action) => statusMutation.mutate({ id: selectedUser.id, action })}
            onRefresh={() => adminUsersApi.getById(selectedUser.id).then(setSelectedUser).catch(() => {})}
          />
        )}
      </AnimatePresence>

      {/* ── Loading detail overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {loadingDetail && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <Loader2 size={28} className="text-blue-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              void qc.invalidateQueries({ queryKey: ['admin-users'] });
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm hard delete ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setConfirmDelete(null); setConfirmDeleteName(''); }}
          >
            <motion.div
              className="w-full max-w-md bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Excluir usuário permanentemente</h3>
                  <p className="text-white/40 text-xs">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-white/60 text-sm mb-4">
                Para confirmar, digite o nome completo do usuário:{' '}
                <span className="text-white font-medium">{confirmDelete.fullName}</span>
              </p>

              <input
                value={confirmDeleteName}
                onChange={e => setConfirmDeleteName(e.target.value)}
                placeholder="Digite o nome exato..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(null); setConfirmDeleteName(''); }}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white/70 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(confirmDelete.id)}
                  disabled={confirmDeleteName !== confirmDelete.fullName || deleteMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Excluir permanentemente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserAvatar({ user }: { user: AdminUserListItem }) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.fullName} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  const idx = user.fullName.charCodeAt(0) % colors.length;
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', colors[idx])}>
      {initials}
    </div>
  );
}

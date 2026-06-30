import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Plus, Copy, Trash2, Loader2, X,
  Users, Lock, CheckCircle, ChevronRight,
} from 'lucide-react';
import { adminRolesApi, adminPermissionsApi } from '../../../services/adminApi';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type { AdminRoleListItem, AdminRoleDetail, AdminModule } from '../../../types';
import RoleEditor from './RoleEditor';

export default function AdminRoles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<AdminRoleDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminRoleListItem | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesApi.getAll(),
    staleTime: 30_000,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: () => adminPermissionsApi.getModules(),
    staleTime: 5 * 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminRolesApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Role excluída', variant: 'success' });
      setConfirmDelete(null);
      setSelectedRole(null);
      void qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adminRolesApi.duplicate(id),
    onSuccess: () => {
      toast({ title: 'Role duplicada', variant: 'success' });
      void qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  async function openRole(role: AdminRoleListItem) {
    setLoadingDetail(true);
    try {
      const detail = await adminRolesApi.getById(role.id);
      setSelectedRole(detail);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen bg-[#0f172a]">
      {/* List */}
      <div className={cn('flex flex-col flex-1 min-w-0', selectedRole || showCreate ? 'hidden md:flex' : 'flex')}>
        <div className="px-6 pt-6 pb-4 border-b border-white/6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <ShieldCheck size={16} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg">Cargos e Permissões</h1>
                <p className="text-white/40 text-xs">{roles.length} cargo{roles.length !== 1 ? 's' : ''} configurado{roles.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedRole(null); setShowCreate(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Novo cargo
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-violet-400 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {roles.map(role => (
                <li key={role.id}>
                  <div className={cn(
                    'flex items-center gap-3 px-6 py-4 hover:bg-white/4 transition-colors',
                    selectedRole?.id === role.id && 'bg-white/6 border-r-2 border-violet-500'
                  )}>
                    <button className="flex-1 flex items-center gap-3 text-left" onClick={() => void openRole(role)}>
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        role.isSystem ? 'bg-amber-500/15' : 'bg-violet-500/15'
                      )}>
                        {role.isSystem ? <Lock size={15} className="text-amber-400" /> : <ShieldCheck size={15} className="text-violet-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-sm font-medium">{role.name}</span>
                          {role.isSystem && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 rounded-full px-2 py-0.5">Sistema</span>
                          )}
                          {!role.isActive && (
                            <span className="text-[10px] bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20 rounded-full px-2 py-0.5">Inativo</span>
                          )}
                        </div>
                        {role.description && <p className="text-white/40 text-xs truncate">{role.description}</p>}
                        <div className="flex items-center gap-1.5 mt-1 text-white/30 text-[10px]">
                          <Users size={10} />
                          {role.userCount} usuário{role.userCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-white/20 shrink-0" />
                    </button>
                    {/* Quick actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => duplicateMutation.mutate(role.id)}
                        disabled={duplicateMutation.isPending}
                        title="Duplicar"
                        className="w-7 h-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/6 flex items-center justify-center transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(role)}
                        title="Excluir"
                        className="w-7 h-7 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detail / Editor panel */}
      <AnimatePresence>
        {(selectedRole || showCreate) && (
          <RoleEditor
            role={selectedRole}
            modules={modules}
            onClose={() => { setSelectedRole(null); setShowCreate(false); }}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ['admin-roles'] });
              setSelectedRole(null);
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {loadingDetail && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={28} className="text-violet-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="w-full max-w-sm bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Excluir cargo</h3>
                  <p className="text-white/40 text-xs">"{confirmDelete.name}"</p>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Todos os usuários com este cargo perderão suas permissões associadas. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white/70 text-sm transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(confirmDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

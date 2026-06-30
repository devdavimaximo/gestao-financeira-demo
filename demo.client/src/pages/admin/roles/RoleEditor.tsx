import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Loader2, CheckSquare, Square, Minus } from 'lucide-react';
import { adminRolesApi } from '../../../services/adminApi';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type { AdminRoleDetail, AdminModule } from '../../../types';

interface Props {
  role: AdminRoleDetail | null;  // null = create mode
  modules: AdminModule[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RoleEditor({ role, modules, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!role;

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [isActive, setIsActive] = useState(role?.isActive ?? true);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set(role?.permissionCodes ?? []));

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setIsActive(role?.isActive ?? true);
    setSelectedCodes(new Set(role?.permissionCodes ?? []));
  }, [role]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const codes = Array.from(selectedCodes);
      if (isEdit && role) {
        return adminRolesApi.update(role.id, { name, description: description || undefined, isActive, permissionCodes: codes });
      }
      return adminRolesApi.create({ name, description: description || undefined, permissionCodes: codes });
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Cargo atualizado' : 'Cargo criado', variant: 'success' });
      onSaved();
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'error' }),
  });

  function togglePermission(code: string) {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function toggleModule(mod: AdminModule) {
    const allCodes = mod.permissions.map(p => p.code);
    const allSelected = allCodes.every(c => selectedCodes.has(c));
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (allSelected) { allCodes.forEach(c => next.delete(c)); }
      else { allCodes.forEach(c => next.add(c)); }
      return next;
    });
  }

  function selectAll() {
    const all = modules.flatMap(m => m.permissions.map(p => p.code));
    setSelectedCodes(new Set(all));
  }

  function clearAll() {
    setSelectedCodes(new Set());
  }

  const totalPermissions = modules.reduce((n, m) => n + m.permissions.length, 0);

  return (
    <motion.aside
      className="w-full md:w-[480px] shrink-0 flex flex-col border-l border-white/6 bg-[#111827] overflow-hidden"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#111827] border-b border-white/6 px-5 py-4 flex items-center justify-between">
        <span className="text-white/60 text-sm font-medium">{isEdit ? `Editar: ${role?.name}` : 'Novo cargo'}</span>
        <button onClick={onClose} className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Nome do cargo *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={role?.isSystem}
            placeholder="Ex: Analista Financeiro"
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-white/50 text-xs font-medium mb-1.5">Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Descreva as responsabilidades deste cargo..."
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none transition"
          />
        </div>

        {/* Active toggle (edit only) */}
        {isEdit && !role?.isSystem && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded accent-violet-500" />
            <span className="text-white/60 text-sm">Cargo ativo</span>
          </label>
        )}

        {/* Permission Matrix */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-white/50 text-xs font-medium">Matriz de permissões</label>
              <p className="text-white/30 text-[10px] mt-0.5">{selectedCodes.size}/{totalPermissions} selecionadas</p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">Todas</button>
              <span className="text-white/20">·</span>
              <button onClick={clearAll} className="text-[10px] text-white/40 hover:text-white/60 transition-colors">Nenhuma</button>
            </div>
          </div>

          <div className="space-y-3">
            {modules.map(mod => {
              const modCodes = mod.permissions.map(p => p.code);
              const checkedCount = modCodes.filter(c => selectedCodes.has(c)).length;
              const allChecked = checkedCount === modCodes.length;
              const someChecked = checkedCount > 0 && !allChecked;

              return (
                <div key={mod.id} className="bg-white/3 border border-white/6 rounded-xl overflow-hidden">
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-colors text-left"
                  >
                    <ModuleCheckIcon all={allChecked} some={someChecked} />
                    <span className="flex-1 text-white text-sm font-medium">{mod.name}</span>
                    <span className="text-white/30 text-xs">{checkedCount}/{modCodes.length}</span>
                  </button>

                  {/* Permissions grid */}
                  <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
                    {mod.permissions.map(perm => {
                      const checked = selectedCodes.has(perm.code);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(perm.code)}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left',
                            checked
                              ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25'
                              : 'bg-white/4 text-white/40 hover:bg-white/8 hover:text-white/60'
                          )}
                        >
                          {checked ? <CheckSquare size={11} className="shrink-0" /> : <Square size={11} className="shrink-0" />}
                          <span className="truncate">{perm.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/6 px-5 py-4 flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white/70 text-sm transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Salvar alterações' : 'Criar cargo'}
        </button>
      </div>
    </motion.aside>
  );
}

function ModuleCheckIcon({ all, some }: { all: boolean; some: boolean }) {
  if (all)  return <CheckSquare size={15} className="text-violet-400 shrink-0" />;
  if (some) return <Minus size={15} className="text-violet-300/60 shrink-0" />;
  return <Square size={15} className="text-white/20 shrink-0" />;
}

import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Eye, EyeOff, ChevronDown, ShieldCheck } from 'lucide-react';
import { adminUsersApi, adminRolesApi, adminPermissionsApi } from '../../../services/adminApi';
import { unitsApi } from '../../../services/api';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type { AdminCreateUserRequest, AdminModule, UserStatus } from '../../../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'Active',             label: 'Ativo' },
  { value: 'AwaitingActivation', label: 'Aguardando ativação' },
  { value: 'Blocked',            label: 'Bloqueado' },
];

export default function CreateUserModal({ onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [showPwd, setShowPwd]   = useState(false);
  const [form, setForm]         = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    phone:     '',
    position:  '',
    notes:     '',
    status:    'Active' as UserStatus,
    forcePasswordChange: false,
  });
  const [unitAssignments, setUnitAssignments] = useState<{ unitId: string; roleId: string }[]>([]);

  const { data: allUnits = [] } = useQuery({ queryKey: ['units'],       queryFn: () => unitsApi.getAll(),            staleTime: 60_000 });
  const units = allUnits.filter(u => u.status === 'Active');
  const { data: roles   = [] } = useQuery({ queryKey: ['admin-roles'],  queryFn: () => adminRolesApi.getAll(),       staleTime: 60_000 });
  const { data: modules = [] } = useQuery({ queryKey: ['admin-modules'], queryFn: adminPermissionsApi.getModules,    staleTime: 300_000 });

  const mutation = useMutation({
    mutationFn: (dto: AdminCreateUserRequest) => adminUsersApi.create(dto),
    onSuccess: () => {
      toast({ title: 'Usuário criado', description: `${form.firstName} ${form.lastName} foi criado com sucesso.`, variant: 'success' });
      onSuccess();
    },
    onError: (e: Error) => toast({ title: 'Erro ao criar usuário', description: e.message, variant: 'error' }),
  });

  function addUnit()    { setUnitAssignments(prev => [...prev, { unitId: '', roleId: '' }]); }
  function removeUnit(i: number) { setUnitAssignments(prev => prev.filter((_, idx) => idx !== i)); }
  function updateUnit(i: number, field: 'unitId' | 'roleId', value: string) {
    setUnitAssignments(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) return;
    mutation.mutate({
      ...form,
      phone:    form.phone    || undefined,
      position: form.position || undefined,
      notes:    form.notes    || undefined,
      units:    unitAssignments.filter(u => u.unitId && u.roleId),
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h3 className="text-white font-semibold">Novo usuário</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *">
              <input required value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="João" className={inputCls} />
            </Field>
            <Field label="Sobrenome *">
              <input required value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Silva" className={inputCls} />
            </Field>
          </div>

          {/* Email */}
          <Field label="E-mail *">
            <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com" className={inputCls} />
          </Field>

          {/* Password */}
          <Field label="Senha *">
            <div className="relative">
              <input
                required type={showPwd ? 'text' : 'password'} minLength={8}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres" className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          {/* Phone + Position */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className={inputCls} />
            </Field>
            <Field label="Função / Título">
              <input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Gerente Financeiro" className={inputCls} />
            </Field>
          </div>

          {/* Status */}
          <Field label="Status inicial">
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as UserStatus }))} className={inputCls}>
              {STATUSES.map(s => <option key={s.value} value={s.value} className="bg-[#1e293b]">{s.label}</option>)}
            </select>
          </Field>

          {/* Force password change */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.forcePasswordChange}
              onChange={e => setForm(p => ({ ...p, forcePasswordChange: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-500"
            />
            <span className="text-white/60 text-sm">Forçar troca de senha no primeiro login</span>
          </label>

          {/* Notes */}
          <Field label="Observações">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Anotações internas..." className={`${inputCls} resize-none`} />
          </Field>

          {/* Unit + Role assignments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-white/50 text-xs font-medium">Unidades e cargos</label>
                <p className="text-white/25 text-[10px] mt-0.5">Defina em qual unidade o usuário atua e qual cargo (permissões) ele terá</p>
              </div>
              <button type="button" onClick={addUnit} className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-colors shrink-0">
                <Plus size={12} /> Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {unitAssignments.map((a, i) => (
                <div key={i}>
                  {/* Selectors row */}
                  <div className="flex gap-2 items-center">
                    <select
                      value={a.unitId}
                      onChange={e => updateUnit(i, 'unitId', e.target.value)}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="" className="bg-[#1e293b]">Unidade...</option>
                      {units.map(u => <option key={u.id} value={u.id} className="bg-[#1e293b]">{u.name}</option>)}
                    </select>

                    <select
                      value={a.roleId}
                      onChange={e => updateUnit(i, 'roleId', e.target.value)}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="" className="bg-[#1e293b]">Cargo...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id} className="bg-[#1e293b]">
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <button type="button" onClick={() => removeUnit(i)} className="text-red-400/60 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Permission preview */}
                  {a.roleId && (
                    <RolePermissionPreview roleId={a.roleId} modules={modules} />
                  )}
                </div>
              ))}

              {unitAssignments.length === 0 && (
                <p className="text-white/25 text-xs italic">Nenhuma unidade atribuída — o usuário não terá acesso ao sistema.</p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white/70 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={mutation.isPending || !form.firstName || !form.lastName || !form.email || !form.password}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Criar usuário
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Role permission preview ────────────────────────────────────────────────────

function RolePermissionPreview({ roleId, modules }: { roleId: string; modules: AdminModule[] }) {
  const [expanded, setExpanded] = useState(false);

  const { data: role, isLoading } = useQuery({
    queryKey: ['admin-role-detail', roleId],
    queryFn:  () => adminRolesApi.getById(roleId),
    staleTime: 60_000,
    enabled:  !!roleId,
  });

  const permNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    modules.forEach(m => m.permissions.forEach(p => { map[p.code] = p.name; }));
    return map;
  }, [modules]);

  const totalPerms = modules.reduce((n, m) => n + m.permissions.length, 0);

  if (isLoading) return (
    <div className="mt-1.5 px-3 py-1.5 rounded-lg border border-white/6 bg-white/2">
      <span className="text-[10px] text-white/25 animate-pulse">Carregando permissões...</span>
    </div>
  );

  if (!role) return null;

  const count = role.permissionCodes.length;

  return (
    <div className="mt-1.5 rounded-lg border border-white/6 bg-white/2 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/3 transition-colors"
      >
        <ShieldCheck size={11} className={cn('shrink-0', count > 0 ? 'text-violet-400' : 'text-white/20')} />
        <span className="flex-1 text-left text-[10px] text-white/40">
          {count === 0
            ? 'Nenhuma permissão configurada neste cargo'
            : `${count}${totalPerms > 0 ? `/${totalPerms}` : ''} permissões`}
        </span>
        {count > 0 && (
          <ChevronDown
            size={11}
            className={cn('text-white/25 shrink-0 transition-transform duration-150', expanded && 'rotate-180')}
          />
        )}
      </button>

      {expanded && count > 0 && (
        <div className="px-3 pb-2.5">
          {/* Group by module */}
          {modules
            .filter(m => m.permissions.some(p => role.permissionCodes.includes(p.code)))
            .map(mod => (
              <div key={mod.id} className="mb-2 last:mb-0">
                <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider mb-1">{mod.name}</p>
                <div className="flex flex-wrap gap-1">
                  {mod.permissions
                    .filter(p => role.permissionCodes.includes(p.code))
                    .map(p => (
                      <span
                        key={p.code}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/12 text-violet-300 border border-violet-500/20"
                      >
                        {permNameMap[p.code] ?? p.code}
                      </span>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-xs font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

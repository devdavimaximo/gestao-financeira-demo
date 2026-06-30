import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  X, Shield, Phone, Briefcase, Building2, Key,
  Ban, CheckCircle, UserX, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Save,
} from 'lucide-react';
import { adminUsersApi, adminRolesApi, adminPermissionsApi } from '../../../services/adminApi';
import UserStatusBadge from '../../../components/admin/UserStatusBadge';
import { useToast } from '../../../components/shared/toast';
import { cn } from '../../../lib/utils';
import type {
  AdminUserDetail, AdminUserUnitRole,
  AdminRoleListItem, AdminUserPermissions,
} from '../../../types';

interface Props {
  user: AdminUserDetail;
  onClose: () => void;
  onDelete: () => void;
  onStatusChange: (action: 'block' | 'unblock' | 'activate' | 'deactivate') => void;
  onRefresh: () => void;
}

const STATUS_ACTIONS: Record<string, { label: string; action: 'block' | 'unblock' | 'activate' | 'deactivate'; icon: typeof Ban; danger?: boolean }[]> = {
  Active:             [{ label: 'Bloquear',    action: 'block',      icon: Ban,         danger: true }, { label: 'Desativar', action: 'deactivate', icon: UserX, danger: true }],
  Blocked:            [{ label: 'Desbloquear', action: 'unblock',    icon: CheckCircle },               { label: 'Desativar', action: 'deactivate', icon: UserX, danger: true }],
  Suspended:          [{ label: 'Ativar',      action: 'activate',   icon: CheckCircle },               { label: 'Bloquear',  action: 'block',      icon: Ban,  danger: true }],
  AwaitingActivation: [{ label: 'Ativar',      action: 'activate',   icon: CheckCircle }],
  Deactivated:        [{ label: 'Ativar',      action: 'activate',   icon: CheckCircle }],
};

export default function UserDetailDrawer({ user, onClose, onDelete, onStatusChange, onRefresh }: Props) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  const { data: timeline = [], isLoading: loadingTimeline } = useQuery({
    queryKey: ['user-timeline', user.id],
    queryFn: () => adminUsersApi.getTimeline(user.id),
    enabled: showTimeline,
    staleTime: 60_000,
  });

  const actions = STATUS_ACTIONS[user.status] ?? [];

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 8) return;
    try {
      await adminUsersApi.resetPassword(user.id, newPassword);
      setNewPassword('');
      setShowResetPwd(false);
      toast({ title: 'Senha redefinida', description: 'Usuário deve alterar no próximo acesso.', variant: 'success' });
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'error' });
    }
  }

  return (
    <motion.aside
      key="detail-drawer"
      className="w-full md:w-105 shrink-0 flex flex-col border-l border-white/6 bg-[#111827] overflow-y-auto"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#111827] border-b border-white/6 px-5 py-4 flex items-center justify-between">
        <span className="text-white/60 text-sm font-medium">Detalhes do usuário</span>
        <button onClick={onClose} className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="px-5 py-5 border-b border-white/6">
        <div className="flex items-start gap-4">
          <DrawerAvatar user={user} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-semibold text-base leading-tight truncate">{user.fullName}</h2>
              {user.isSystemUser && (
                <span title="Usuário do sistema (protegido)">
                  <Shield size={14} className="text-amber-400 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs mb-2">{user.email}</p>
            <UserStatusBadge status={user.status} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 py-4 space-y-3 border-b border-white/6">
        {user.phone && <InfoRow icon={Phone} label="Telefone" value={user.phone} />}
        {user.position && <InfoRow icon={Briefcase} label="Cargo" value={user.position} />}
        {user.notes && (
          <div className="bg-white/4 rounded-lg p-3">
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Observações</p>
            <p className="text-white/70 text-xs leading-relaxed">{user.notes}</p>
          </div>
        )}
        <InfoRow icon={Clock} label="Criado em" value={new Date(user.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' })} />
        {user.forcePasswordChange && (
          <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle size={12} />
            Deve alterar senha no próximo login
          </div>
        )}
      </div>

      {/* Units + roles + permission overrides (Phase 3) */}
      <div className="px-5 py-4 border-b border-white/6">
        <p className="text-white/40 text-[10px] uppercase tracking-wide mb-2">Unidades e cargos</p>
        {user.units.length === 0 ? (
          <p className="text-white/30 text-xs">Nenhuma unidade atribuída</p>
        ) : (
          <div className="space-y-2">
            {user.units.map(unit => (
              <UserUnitRoleCard
                key={unit.unitId}
                userId={user.id}
                unit={unit}
                allUnits={user.units}
                isSystemUser={user.isSystemUser}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status actions */}
      {!user.isSystemUser && actions.length > 0 && (
        <div className="px-5 py-4 border-b border-white/6">
          <p className="text-white/40 text-[10px] uppercase tracking-wide mb-2">Ações de status</p>
          <div className="flex flex-wrap gap-2">
            {actions.map(({ label, action, icon: Icon, danger }) => (
              <button
                key={action}
                onClick={() => onStatusChange(action)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  danger
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-1 ring-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20'
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset password */}
      {!user.isSystemUser && (
        <div className="px-5 py-4 border-b border-white/6">
          <button
            onClick={() => setShowResetPwd(!showResetPwd)}
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            <Key size={12} />
            Redefinir senha
            {showResetPwd ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showResetPwd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres)"
                className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={() => void handleResetPassword()}
                disabled={newPassword.length < 8}
                className="w-full py-2 rounded-lg bg-white/6 hover:bg-white/10 disabled:opacity-40 text-white/70 text-xs transition-colors"
              >
                Confirmar redefinição
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="px-5 py-4 border-b border-white/6">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center justify-between w-full text-white/40 text-[10px] uppercase tracking-wide hover:text-white/60 transition-colors"
        >
          <span>Histórico de atividades</span>
          {showTimeline ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showTimeline && (
          <div className="mt-3">
            {loadingTimeline ? (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="text-blue-400 animate-spin" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-3">Nenhum evento registrado</p>
            ) : (
              <ol className="relative border-l border-white/8 ml-2 space-y-4">
                {timeline.map(ev => (
                  <li key={ev.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 w-2.5 h-2.5 rounded-full bg-[#1e293b] border-2 border-blue-500/50" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/70 text-xs font-medium">{ev.action}</span>
                      {ev.actorFullName && <span className="text-white/35 text-[10px]">por {ev.actorFullName}</span>}
                      {ev.detail && <span className="text-white/40 text-[10px]">{ev.detail}</span>}
                      <span className="text-white/25 text-[9px]">{new Date(ev.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {!user.isSystemUser && (
        <div className="px-5 py-4 mt-auto">
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          >
            <X size={14} />
            Excluir permanentemente
          </button>
        </div>
      )}
    </motion.aside>
  );
}

// ── UserUnitRoleCard ──────────────────────────────────────────────────────────

function UserUnitRoleCard({
  userId, unit, allUnits, isSystemUser, onRefresh,
}: {
  userId: string;
  unit: AdminUserUnitRole;
  allUnits: AdminUserUnitRole[];
  isSystemUser: boolean;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showPerms, setShowPerms] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(unit.roleId);
  const [saving, setSaving] = useState(false);

  // Sync when parent refreshes the unit prop
  useEffect(() => { setSelectedRoleId(unit.roleId); }, [unit.roleId]);

  const { data: roles = [] } = useQuery<AdminRoleListItem[]>({
    queryKey: ['admin-roles'],
    queryFn: () => adminRolesApi.getAll(),
    staleTime: 2 * 60_000,
  });

  async function handleRoleChange(newRoleId: string) {
    if (newRoleId === selectedRoleId) return;
    setSaving(true);
    try {
      const updated = allUnits.map(u => ({
        unitId: u.unitId,
        roleId: u.unitId === unit.unitId ? newRoleId : u.roleId,
      }));
      await adminUsersApi.updateUnits(userId, updated);
      setSelectedRoleId(newRoleId);
      onRefresh();
      toast({ title: 'Cargo atualizado', description: `${unit.unitName} — novo cargo aplicado.`, variant: 'success' });
    } catch (e) {
      toast({ title: 'Erro ao atualizar cargo', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white/4 rounded-lg overflow-hidden">
      {/* Unit header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Building2 size={13} className="text-white/40 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-xs font-medium leading-tight">{unit.unitName}</p>
          {/* Role selector */}
          {!isSystemUser ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              {saving && <Loader2 size={9} className="animate-spin text-blue-400 shrink-0" />}
              <select
                value={selectedRoleId}
                onChange={e => void handleRoleChange(e.target.value)}
                disabled={saving || roles.length === 0}
                className={cn(
                  'text-[10px] bg-transparent text-white/50 border-none outline-none cursor-pointer',
                  'hover:text-white/80 transition-colors appearance-none -ml-0.5 pr-1',
                  saving && 'opacity-50 cursor-not-allowed'
                )}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#1e293b] text-white text-xs">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-white/40 text-[10px] mt-0.5">{unit.roleName}</p>
          )}
        </div>
        {!isSystemUser && (
          <button
            onClick={() => setShowPerms(!showPerms)}
            className={cn(
              'shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors',
              showPerms
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-white/30 hover:text-blue-400 hover:bg-white/5'
            )}
          >
            <Key size={10} />
            Permissões
          </button>
        )}
      </div>

      {/* Expandable permission override panel */}
      {showPerms && !isSystemUser && (
        <div className="border-t border-white/6">
          <PermissionOverridePanel
            userId={userId}
            unitId={unit.unitId}
            onSaved={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

// ── PermissionOverridePanel ───────────────────────────────────────────────────

function PermissionOverridePanel({
  userId, unitId, onSaved,
}: {
  userId: string;
  unitId: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: perms, isLoading: loadingPerms } = useQuery<AdminUserPermissions>({
    queryKey: ['user-permissions', userId, unitId],
    queryFn: () => adminUsersApi.getPermissions(userId, unitId),
    staleTime: 30_000,
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: () => adminPermissionsApi.getModules(),
    staleTime: 5 * 60_000,
  });

  // Map<permissionId, true | false>; absent = "use role default"
  const [draft, setDraft] = useState<Map<string, boolean>>(new Map());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!perms) return;
    const m = new Map<string, boolean>();
    perms.overrides.forEach(o => m.set(o.permissionId, o.isGranted));
    setDraft(m);
    setIsDirty(false);
  }, [perms]);

  function setOverride(permId: string, value: boolean | null) {
    setDraft(prev => {
      const next = new Map(prev);
      if (value === null) next.delete(permId);
      else next.set(permId, value);
      return next;
    });
    setIsDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const overrides = Array.from(draft.entries()).map(([permissionId, isGranted]) => ({
        permissionId,
        isGranted,
      }));
      return adminUsersApi.updatePermissions(userId, unitId, overrides);
    },
    onSuccess: () => {
      toast({ title: 'Permissões salvas', description: 'Sessões do usuário foram revogadas para aplicar as mudanças.', variant: 'success' });
      setIsDirty(false);
      void qc.invalidateQueries({ queryKey: ['user-permissions', userId, unitId] });
      onSaved();
    },
    onError: (e: Error) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'error' }),
  });

  if (loadingPerms || loadingModules) {
    return (
      <div className="flex justify-center py-5">
        <Loader2 size={16} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!perms) return null;

  const rolePerms = new Set(perms.rolePermissions);

  return (
    <div className="p-3">
      {/* Context + save button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/30 text-[10px]">
          Cargo base: <span className="text-white/55">{perms.roleName}</span>
        </p>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={() => void saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              Salvar
            </button>
          )}
          {draft.size > 0 && (
            <button
              onClick={() => { setDraft(new Map()); setIsDirty(true); }}
              className="text-[10px] text-white/25 hover:text-red-400 transition-colors"
              title="Limpar todas as sobreposições"
            >
              Limpar tudo
            </button>
          )}
        </div>
      </div>

      {/* Module → Permission matrix */}
      <div className="space-y-4 max-h-64 overflow-y-auto pr-0.5">
        {modules.filter(m => m.permissions.length > 0).map(mod => (
          <div key={mod.id}>
            <p className="text-white/25 text-[9px] uppercase tracking-widest mb-1.5">{mod.name}</p>
            <div className="space-y-1">
              {mod.permissions.map(perm => {
                const fromRole    = rolePerms.has(perm.code);
                const override    = draft.get(perm.id) ?? null;
                const effective   = override !== null ? override : fromRole;

                return (
                  <div key={perm.id} className="flex items-center gap-2">
                    {/* Effective indicator dot */}
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                      effective ? 'bg-emerald-400' : 'bg-white/10'
                    )} />

                    {/* Permission name */}
                    <span className="flex-1 text-[10px] text-white/55 min-w-0 truncate">{perm.name}</span>

                    {/* Role indicator badge */}
                    {fromRole && (
                      <span className="text-[9px] bg-violet-500/15 text-violet-300/60 rounded px-1 py-0.5 shrink-0 leading-none">
                        cargo
                      </span>
                    )}

                    {/* 3-state segmented control */}
                    <div className="flex rounded overflow-hidden ring-1 ring-white/8 shrink-0">
                      {([
                        [null,  'Padrão'],
                        [true,  '✓'],
                        [false, '✗'],
                      ] as [boolean | null, string][]).map(([val, label]) => (
                        <button
                          key={String(val)}
                          onClick={() => setOverride(perm.id, val)}
                          className={cn(
                            'px-1.5 py-0.5 text-[9px] transition-colors leading-none',
                            override === val
                              ? val === true
                                ? 'bg-emerald-500/25 text-emerald-400 font-medium'
                                : val === false
                                  ? 'bg-red-500/25 text-red-400 font-medium'
                                  : 'bg-white/12 text-white/70'
                              : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
        <span className="text-[9px] text-white/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Ativo
        </span>
        <span className="text-[9px] text-white/20 flex items-center gap-1">
          <span className="text-[9px] text-violet-300/50">cargo</span> = herdado do cargo
        </span>
        <span className="text-[9px] text-white/20">✓/✗ = sobrepõe</span>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-white/30 shrink-0" />
      <span className="text-white/35 text-xs w-20 shrink-0">{label}</span>
      <span className="text-white/70 text-xs">{value}</span>
    </div>
  );
}

function DrawerAvatar({ user }: { user: AdminUserDetail }) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  if (user.avatarUrl) return <img src={user.avatarUrl} alt={user.fullName} className="w-14 h-14 rounded-xl object-cover shrink-0" />;
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  const idx = user.fullName.charCodeAt(0) % colors.length;
  return (
    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0', colors[idx])}>
      {initials}
    </div>
  );
}

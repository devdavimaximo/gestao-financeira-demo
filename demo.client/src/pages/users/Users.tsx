import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, UserX } from 'lucide-react';
import { usersApi, unitsApi } from '../../services/api';
import type { AppUser } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';

const ROLES = [
  { value: 'Admin',     label: 'Administrador' },
  { value: 'Financial', label: 'Financeiro' },
  { value: 'Purchases', label: 'Compras' },
  { value: 'Partner',   label: 'Sócio' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  Admin:     'Administrador',
  Financial: 'Financeiro',
  Purchases: 'Compras',
  Partner:   'Sócio',
};

const ROLE_COLORS: Record<string, string> = {
  Admin:     'bg-brand-navy/10 text-brand-navy border-brand-navy/20',
  Financial: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  Purchases: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
  Partner:   'bg-gray-100 text-gray-600 border-gray-200',
};

const createSchema = z.object({
  fullName: z.string().min(1, 'Nome obrigatório'),
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role:     z.string().min(1, 'Perfil obrigatório'),
  unitIds:  z.array(z.string()).min(1, 'Selecione ao menos uma unidade'),
});

const editSchema = z.object({
  fullName: z.string().min(1, 'Nome obrigatório'),
  role:     z.string().min(1, 'Perfil obrigatório'),
  isActive: z.boolean(),
  unitIds:  z.array(z.string()).min(1, 'Selecione ao menos uma unidade'),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function UnitCheckboxes({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter(x => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="space-y-2">
      {units.map(unit => (
        <label key={unit.id} className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={value.includes(unit.id)}
            onChange={() => toggle(unit.id)}
            className="size-4 rounded border-gray-300 text-brand-navy accent-brand-navy cursor-pointer"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">
            {unit.name}
            <span className="ml-1.5 font-mono text-xs text-gray-400">({unit.identifier})</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  });

  const unitMap = Object.fromEntries(units.map(u => [u.id, u]));

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { unitIds: [] },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { isActive: true, unitIds: [] },
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      createForm.reset({ unitIds: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  function openEdit(user: AppUser) {
    editForm.reset({
      fullName: user.fullName,
      role:     user.role,
      isActive: user.isActive,
      unitIds:  user.unitIds,
    });
    setEditingUser(user);
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os usuários e permissões do sistema</p>
        </div>
        <Button
          onClick={() => { createForm.reset({ unitIds: [] }); setCreateOpen(true); }}
          className="bg-brand-navy hover:bg-brand-navy/90 text-white shrink-0"
        >
          <Plus size={16} />
          Novo Usuário
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} className="hover:bg-gray-50/60">
                    <TableCell className="font-medium text-gray-800">
                      {user.fullName}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.unitIds.length === 0
                        ? <span className="text-gray-400">—</span>
                        : user.unitIds
                            .map(id => unitMap[id]?.identifier ?? '?')
                            .join(', ')}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={14} />
                        </Button>
                        {user.isActive && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Desativar"
                            disabled={deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(user.id)}
                          >
                            <UserX size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input placeholder="João Silva" {...createForm.register('fullName')} />
                {createForm.formState.errors.fullName && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="joao@empresa.com" {...createForm.register('email')} />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" {...createForm.register('password')} />
                {createForm.formState.errors.password && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Controller
                  name="role"
                  control={createForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createForm.formState.errors.role && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.role.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidades</Label>
                <Controller
                  name="unitIds"
                  control={createForm.control}
                  render={({ field }) => (
                    <UnitCheckboxes value={field.value} onChange={field.onChange} />
                  )}
                />
                {createForm.formState.errors.unitIds && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.unitIds.message}</p>
                )}
              </div>
              {createMutation.error && (
                <p className="text-xs text-red-500">{(createMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-brand-navy hover:bg-brand-navy/90 text-white"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="text-sm text-gray-500 -mt-1">{editingUser.email}</div>
          )}
          <form
            onSubmit={editForm.handleSubmit(data =>
              editingUser && updateMutation.mutate({ id: editingUser.id, data }),
            )}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input {...editForm.register('fullName')} />
                {editForm.formState.errors.fullName && (
                  <p className="text-xs text-red-500">{editForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Controller
                  name="role"
                  control={editForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidades</Label>
                <Controller
                  name="unitIds"
                  control={editForm.control}
                  render={({ field }) => (
                    <UnitCheckboxes value={field.value} onChange={field.onChange} />
                  )}
                />
                {editForm.formState.errors.unitIds && (
                  <p className="text-xs text-red-500">{editForm.formState.errors.unitIds.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Controller
                  name="isActive"
                  control={editForm.control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={field.value}
                      onChange={e => field.onChange(e.target.checked)}
                      className="size-4 rounded border-gray-300 accent-brand-navy cursor-pointer"
                    />
                  )}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Usuário ativo</Label>
              </div>
              {updateMutation.error && (
                <p className="text-xs text-red-500">{(updateMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-brand-navy hover:bg-brand-navy/90 text-white"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

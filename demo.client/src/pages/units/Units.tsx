import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Ban, Trash2 } from 'lucide-react';
import { unitsApi } from '../../services/api';
import type { Unit, UnitStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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
import { formatDate } from '../../lib/utils';

const createSchema = z.object({
  name:       z.string().min(1, 'Nome obrigatório'),
  identifier: z.string().min(1, 'Código obrigatório'),
});

const editSchema = z.object({
  name:       z.string().min(1, 'Nome obrigatório'),
  identifier: z.string().min(1, 'Código obrigatório'),
  status:     z.enum(['Active', 'Inactive'] as const),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

function StatusBadge({ status }: { status: UnitStatus }) {
  return status === 'Active' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      Ativa
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      Inativa
    </span>
  );
}

export default function Units() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<Unit | null>(null);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  });

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const createMutation = useMutation({
    mutationFn: unitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setCreateOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) =>
      unitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setEditingUnit(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: unitsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: unitsApi.permanentDelete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setConfirmDeleteUnit(null);
    },
  });

  function openEdit(unit: Unit) {
    editForm.reset({
      name:       unit.name,
      identifier: unit.identifier,
      status:     unit.status,
    });
    setEditingUnit(unit);
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unidades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as lojas cadastradas no sistema</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { createForm.reset(); setCreateOpen(true); }}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white shrink-0"
          >
            <Plus size={16} />
            Nova Unidade
          </Button>
        )}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : units.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhuma unidade cadastrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map(unit => (
                  <TableRow key={unit.id} className="hover:bg-gray-50/60">
                    <TableCell className="font-medium text-gray-800">{unit.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {unit.identifier}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={unit.status} />
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {formatDate(unit.createdAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Editar"
                            onClick={() => openEdit(unit)}
                          >
                            <Pencil size={14} />
                          </Button>
                          {unit.status === 'Active' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Desativar"
                              disabled={deactivateMutation.isPending}
                              onClick={() => deactivateMutation.mutate(unit.id)}
                            >
                              <Ban size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Excluir permanentemente"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmDeleteUnit(unit)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
            <DialogTitle>Nova Unidade</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Ex: Loja Norte" {...createForm.register('name')} />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-red-500">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input
                  placeholder="Ex: NORTE"
                  className="uppercase"
                  {...createForm.register('identifier')}
                />
                {createForm.formState.errors.identifier && (
                  <p className="text-xs text-red-500">
                    {createForm.formState.errors.identifier.message}
                  </p>
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
                {createMutation.isPending ? 'Criando...' : 'Criar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation dialog */}
      <Dialog open={!!confirmDeleteUnit} onOpenChange={open => { if (!open) setConfirmDeleteUnit(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={18} />
              Excluir unidade permanentemente
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-700">
              Tem certeza que deseja excluir permanentemente a unidade{' '}
              <span className="font-semibold">"{confirmDeleteUnit?.name}"</span>?
            </p>
            <p className="text-xs text-gray-500">
              Esta ação não pode ser desfeita. Se a unidade possuir dados financeiros ou usuários vinculados, a exclusão será bloqueada.
            </p>
            {permanentDeleteMutation.error && (
              <p className="text-xs text-red-500">{(permanentDeleteMutation.error as Error).message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteUnit(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={permanentDeleteMutation.isPending}
              onClick={() => confirmDeleteUnit && permanentDeleteMutation.mutate(confirmDeleteUnit.id)}
            >
              {permanentDeleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUnit} onOpenChange={open => { if (!open) setEditingUnit(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(data =>
              editingUnit && updateMutation.mutate({ id: editingUnit.id, data }),
            )}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...editForm.register('name')} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-red-500">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input className="uppercase" {...editForm.register('identifier')} />
                {editForm.formState.errors.identifier && (
                  <p className="text-xs text-red-500">
                    {editForm.formState.errors.identifier.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={editForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Ativa</SelectItem>
                        <SelectItem value="Inactive">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {updateMutation.error && (
                <p className="text-xs text-red-500">{(updateMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setEditingUnit(null)}>
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

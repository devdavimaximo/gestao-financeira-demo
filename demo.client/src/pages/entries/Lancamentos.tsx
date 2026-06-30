import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react';
import { entriesApi, lookupApi, unitsApi } from '../../services/api';
import type { FinancialEntry } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnit } from '../../contexts/UnitContext';
import { useToast } from '../../components/shared/toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';
import TableSkeleton from '../../components/shared/TableSkeleton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import FormField from '../../components/shared/FormField';
import { formatCurrency, formatDateOnly, todayIso, MONTH_NAMES } from '../../lib/utils';

const now = new Date();

const baseFields = {
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  type: z.enum(['Revenue', 'Expense'] as const),
  date: z.string().min(1, 'Data obrigatória'),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  paymentMethodId: z.string().min(1, 'Forma de pagamento obrigatória'),
  salesChannelId: z.string().optional().transform(v => v || undefined),
  notes: z.string().optional(),
};

const createSchema = z.object({ ...baseFields, unitId: z.string().min(1, 'Unidade obrigatória') });
const editSchema   = z.object(baseFields);

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

function TypeBadge({ type }: { type: 'Revenue' | 'Expense' }) {
  return type === 'Revenue' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
      Receita
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
      Despesa
    </span>
  );
}

export default function Lancamentos() {
  const { user, isAdmin } = useAuth();
  const { selectedUnitId } = useUnit();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());
  const [filterType,  setFilterType]  = useState('');
  const [createOpen,      setCreateOpen]      = useState(false);
  const [editingEntry,    setEditingEntry]    = useState<FinancialEntry | null>(null);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  const from = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
  const to   = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${new Date(filterYear, filterMonth, 0).getDate()}`;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', { unitId: selectedUnitId, from, to, type: filterType || undefined }],
    queryFn: () => entriesApi.getAll({ unitId: selectedUnitId, from, to, type: filterType || undefined }),
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ['lookup-categories'], queryFn: lookupApi.getCategories });
  const { data: paymentMethods = [] } = useQuery({ queryKey: ['lookup-pm'], queryFn: lookupApi.getPaymentMethods });
  const { data: salesChannels = [] } = useQuery({ queryKey: ['lookup-sc'], queryFn: lookupApi.getSalesChannels });

  const accessibleUnits = useMemo(() => {
    const active = units.filter(u => u.status === 'Active');
    return isAdmin ? active : active.filter(u => user?.unitIds.includes(u.id));
  }, [units, isAdmin, user]);

  const revenues = entries.filter(e => e.type === 'Revenue').reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
  const balance  = revenues - expenses;

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const createMutation = useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setCreateOpen(false);
      createForm.reset();
      toast('Lançamento criado com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) =>
      entriesApi.update(id, { ...data, salesChannelId: data.salesChannelId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setEditingEntry(null);
      toast('Lançamento atualizado.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: entriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setDeletingId(null);
      toast('Lançamento excluído.', 'info');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setDeletingId(null); },
  });

  function openCreate() {
    createForm.reset({
      date: todayIso(),
      type: 'Revenue',
      unitId: selectedUnitId ?? (accessibleUnits.length === 1 ? accessibleUnits[0].id : ''),
      salesChannelId: '',
      notes: '',
    });
    setCreateOpen(true);
  }

  function openEdit(entry: FinancialEntry) {
    editForm.reset({
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
      date: entry.date,
      categoryId: entry.categoryId,
      paymentMethodId: entry.paymentMethodId,
      salesChannelId: entry.salesChannelId ?? '',
      notes: entry.notes ?? '',
    });
    setEditingEntry(entry);
  }

  const canEdit = isAdmin || user?.role === 'Financial';
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const periodLabel = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Lançamentos"
        subtitle="Receitas e despesas registradas por período"
        action={
          canEdit && (
            <Button onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
              <Plus size={15} /> Novo Lançamento
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
          <SelectTrigger className="w-36 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-24 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-white h-9 text-sm"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            <SelectItem value="Revenue">Receitas</SelectItem>
            <SelectItem value="Expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Receitas"
          value={formatCurrency(revenues)}
          sub={`${entries.filter(e => e.type === 'Revenue').length} lançamentos`}
          icon={<TrendingUp size={15} />}
          variant="emerald"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(expenses)}
          sub={`${entries.filter(e => e.type === 'Expense').length} lançamentos`}
          icon={<TrendingDown size={15} />}
          variant="red"
        />
        <StatCard
          label="Saldo"
          value={formatCurrency(balance)}
          sub={balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          icon={<Scale size={15} />}
          variant={balance >= 0 ? 'default' : 'red'}
        />
      </motion.div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Receipt size={22} strokeWidth={1.5} />}
            title="Nenhum lançamento encontrado"
            description={`Sem registros para ${MONTH_NAMES[filterMonth - 1]}/${filterYear}`}
            action={
              canEdit && (
                <Button size="sm" onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
                  <Plus size={14} /> Novo Lançamento
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">{periodLabel}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-50 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-400 hidden sm:table-cell">Data</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400">Descrição</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 hidden lg:table-cell">Unidade</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 hidden lg:table-cell">Canal</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400">Tipo</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 text-right">Valor</TableHead>
                    {canEdit && <TableHead className="text-xs font-medium text-gray-400 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-gray-50/70 border-gray-50">
                      <TableCell className="hidden sm:table-cell text-xs text-gray-500 whitespace-nowrap py-3.5">
                        {formatDateOnly(entry.date)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="font-medium text-gray-800 text-sm">{entry.description}</div>
                        <div className="text-xs text-gray-400 mt-0.5 md:hidden">{entry.categoryName}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600 py-3.5">{entry.categoryName}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-600 py-3.5">{entry.unitName}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500 py-3.5">{entry.salesChannelName ?? '—'}</TableCell>
                      <TableCell className="py-3.5"><TypeBadge type={entry.type} /></TableCell>
                      <TableCell className="text-right py-3.5 whitespace-nowrap">
                        <span className={`font-bold text-sm tabular-nums ${entry.type === 'Revenue' ? 'text-emerald-600' : 'text-red-700'}`}>
                          {entry.type === 'Revenue' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(entry)} className="text-gray-400 hover:text-brand-navy hover:bg-blue-50">
                              <Pencil size={13} />
                            </Button>
                            <Button
                              variant="ghost" size="icon-sm" title="Excluir"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeletingId(entry.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deletingId}
        title="Excluir lançamento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        onClose={() => setDeletingId(null)}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate({ ...data, salesChannelId: data.salesChannelId || undefined }))}>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <FormField label="Descrição" required error={createForm.formState.errors.description?.message}>
                  <Input placeholder="Ex: Vendas Balcão" {...createForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor (R$)" required error={createForm.formState.errors.amount?.message}>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...createForm.register('amount')} />
              </FormField>
              <FormField label="Data" required error={createForm.formState.errors.date?.message}>
                <Input type="date" {...createForm.register('date')} />
              </FormField>
              <FormField label="Tipo" required error={createForm.formState.errors.type?.message}>
                <Controller name="type" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revenue">Receita</SelectItem>
                      <SelectItem value="Expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Unidade" required error={createForm.formState.errors.unitId?.message}>
                <Controller name="unitId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {accessibleUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Categoria" required error={createForm.formState.errors.categoryId?.message}>
                <Controller name="categoryId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Forma de Pagamento" required error={createForm.formState.errors.paymentMethodId?.message}>
                <Controller name="paymentMethodId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Canal de Venda">
                <Controller name="salesChannelId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {salesChannels.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              {createMutation.error && (
                <p className="col-span-2 text-xs text-red-600">{(createMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
                {createMutation.isPending ? 'Salvando...' : 'Criar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={open => { if (!open) setEditingEntry(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(data => editingEntry && updateMutation.mutate({ id: editingEntry.id, data }))}>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <FormField label="Descrição" required error={editForm.formState.errors.description?.message}>
                  <Input {...editForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor (R$)" required error={editForm.formState.errors.amount?.message}>
                <Input type="number" step="0.01" min="0.01" {...editForm.register('amount')} />
              </FormField>
              <FormField label="Data" required error={editForm.formState.errors.date?.message}>
                <Input type="date" {...editForm.register('date')} />
              </FormField>
              <FormField label="Tipo" required error={editForm.formState.errors.type?.message}>
                <Controller name="type" control={editForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revenue">Receita</SelectItem>
                      <SelectItem value="Expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Categoria" required error={editForm.formState.errors.categoryId?.message}>
                <Controller name="categoryId" control={editForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Forma de Pagamento" required error={editForm.formState.errors.paymentMethodId?.message}>
                <Controller name="paymentMethodId" control={editForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Canal de Venda">
                <Controller name="salesChannelId" control={editForm.control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {salesChannels.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              {updateMutation.error && (
                <p className="col-span-2 text-xs text-red-600">{(updateMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setEditingEntry(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

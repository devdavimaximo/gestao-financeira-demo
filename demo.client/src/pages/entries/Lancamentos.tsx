import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Receipt, Repeat } from 'lucide-react';
import { entriesApi, lookupApi, unitsApi } from '../../services/api';
import type { FinancialEntry, RecurrenceType } from '../../types';
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

const createSchema = z.object({
  ...baseFields,
  unitId: z.string().min(1, 'Unidade obrigatória'),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['Weekly', 'Monthly', 'Yearly'] as const).optional(),
  recurrenceInterval: z.coerce.number().int().min(1).max(36).optional(),
  recurrenceEndDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isRecurring) {
    if (!data.recurrenceFrequency) {
      ctx.addIssue({ code: 'custom', path: ['recurrenceFrequency'], message: 'Selecione a frequência' });
    }
    if (!data.recurrenceEndDate) {
      ctx.addIssue({ code: 'custom', path: ['recurrenceEndDate'], message: 'Informe a data final' });
    } else if (data.recurrenceEndDate <= data.date) {
      ctx.addIssue({ code: 'custom', path: ['recurrenceEndDate'], message: 'Data final deve ser posterior à data do lançamento' });
    }
  }
});

const editSchema = z.object(baseFields);

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

const FREQ_LABELS: Record<string, string> = { Weekly: 'semana(s)', Monthly: 'mês(es)', Yearly: 'ano(s)' };

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

function isRecurring(entry: FinancialEntry): boolean {
  return !!(entry.parentEntryId || entry.recurrenceFrequency);
}

function countOccurrences(start: string, end: string, freq: RecurrenceType, interval: number): number {
  const s = new Date(start);
  const e = new Date(end);
  if (s >= e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e && count <= 120) {
    count++;
    if (freq === 'Weekly') cur.setDate(cur.getDate() + 7 * interval);
    else if (freq === 'Monthly') cur.setMonth(cur.getMonth() + interval);
    else cur.setFullYear(cur.getFullYear() + interval);
  }
  return Math.min(count, 120);
}

export default function Lancamentos() {
  const { user, isAdmin } = useAuth();
  const { selectedUnitId } = useUnit();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());
  const [filterType,  setFilterType]  = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editingEntry,  setEditingEntry]  = useState<FinancialEntry | null>(null);
  const [editScope,     setEditScope]     = useState<'single' | 'all'>('single');
  const [deletingEntry, setDeletingEntry] = useState<FinancialEntry | null>(null);
  const [deleteScope,   setDeleteScope]   = useState<'single' | 'all'>('single');

  const from = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
  const to   = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${new Date(filterYear, filterMonth, 0).getDate()}`;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', { unitId: selectedUnitId, from, to, type: filterType || undefined }],
    queryFn: () => entriesApi.getAll({ unitId: selectedUnitId, from, to, type: filterType || undefined }),
  });

  const { data: units = [] }          = useQuery({ queryKey: ['units'],             queryFn: unitsApi.getAll });
  const { data: categories = [] }     = useQuery({ queryKey: ['lookup-categories'], queryFn: lookupApi.getCategories });
  const { data: paymentMethods = [] } = useQuery({ queryKey: ['lookup-pm'],         queryFn: lookupApi.getPaymentMethods });
  const { data: salesChannels = [] }  = useQuery({ queryKey: ['lookup-sc'],         queryFn: lookupApi.getSalesChannels });

  const accessibleUnits = useMemo(() => {
    const active = units.filter(u => u.status === 'Active');
    return isAdmin ? active : active.filter(u => user?.unitIds.includes(u.id));
  }, [units, isAdmin, user]);

  const revenues = entries.filter(e => e.type === 'Revenue').reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter(e => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
  const balance  = revenues - expenses;

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { isRecurring: false, recurrenceInterval: 1 },
  });
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const watchIsRecurring = createForm.watch('isRecurring');
  const watchFrequency   = createForm.watch('recurrenceFrequency');
  const watchInterval    = createForm.watch('recurrenceInterval');
  const watchDate        = createForm.watch('date');
  const watchEndDate     = createForm.watch('recurrenceEndDate');

  const previewCount = useMemo(() => {
    if (!watchIsRecurring || !watchFrequency || !watchDate || !watchEndDate) return 0;
    return countOccurrences(watchDate, watchEndDate, watchFrequency, watchInterval ?? 1);
  }, [watchIsRecurring, watchFrequency, watchInterval, watchDate, watchEndDate]);

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => entriesApi.create({
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: data.date,
      notes: data.notes || undefined,
      unitId: data.unitId,
      categoryId: data.categoryId,
      paymentMethodId: data.paymentMethodId,
      salesChannelId: data.salesChannelId || undefined,
      isRecurring: data.isRecurring,
      recurrenceFrequency: data.isRecurring ? data.recurrenceFrequency : undefined,
      recurrenceInterval: data.isRecurring ? (data.recurrenceInterval ?? 1) : undefined,
      recurrenceEndDate: data.isRecurring ? data.recurrenceEndDate : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setCreateOpen(false);
      createForm.reset();
      toast('Lançamento criado com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, scope }: { id: string; data: EditForm; scope: 'single' | 'all' }) =>
      entriesApi.update(id, { ...data, salesChannelId: data.salesChannelId || undefined, scope }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setEditingEntry(null);
      toast('Lançamento atualizado.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: 'single' | 'all' }) =>
      entriesApi.delete(id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      setDeletingEntry(null);
      setDeleteScope('single');
      toast('Lançamento excluído.', 'info');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setDeletingEntry(null); },
  });

  function openCreate() {
    createForm.reset({
      date: todayIso(),
      type: 'Revenue',
      unitId: selectedUnitId ?? (accessibleUnits.length === 1 ? accessibleUnits[0].id : ''),
      salesChannelId: '',
      notes: '',
      isRecurring: false,
      recurrenceInterval: 1,
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
    setEditScope('single');
    setEditingEntry(entry);
  }

  function openDelete(entry: FinancialEntry) {
    setDeleteScope('single');
    setDeletingEntry(entry);
  }

  function handleEditScopeChange(scope: 'single' | 'all') {
    setEditScope(scope);
    if (scope === 'all' && editingEntry) {
      editForm.setValue('date', editingEntry.date);
    }
  }

  const canEdit     = isAdmin || user?.role === 'Financial';
  const years       = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const periodLabel = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`;
  const revenueCount = entries.filter(e => e.type === 'Revenue').length;
  const expenseCount = entries.filter(e => e.type === 'Expense').length;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Lançamentos"
        subtitle="Receitas e despesas registradas por período"
        action={
          canEdit && (
            <Button onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5 text-sm">
              <Plus size={15} /> Novo Lançamento
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
          <SelectTrigger className="w-32 sm:w-36 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-20 sm:w-24 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 sm:w-40 bg-white h-9 text-sm"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            <SelectItem value="Revenue">Receitas</SelectItem>
            <SelectItem value="Expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI — mobile rows (full values visible) */}
      <div className="flex flex-col gap-2 mb-4 sm:hidden">
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Receitas</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{revenueCount} lançamento{revenueCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-emerald-700">{formatCurrency(revenues)}</p>
        </div>
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Despesas</p>
            <p className="text-[10px] text-red-400 mt-0.5">{expenseCount} lançamento{expenseCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-red-700">{formatCurrency(expenses)}</p>
        </div>
        <div className={`flex items-center justify-between border rounded-xl px-4 py-3 ${balance >= 0 ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Saldo</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}</p>
          </div>
          <p className={`text-lg font-black tabular-nums ${balance >= 0 ? 'text-brand-navy' : 'text-red-700'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* KPI — desktop stat cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="hidden sm:grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Receitas"
          value={formatCurrency(revenues)}
          sub={`${revenueCount} lançamentos`}
          icon={<TrendingUp size={15} />}
          variant="emerald"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(expenses)}
          sub={`${expenseCount} lançamentos`}
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

      {/* Entries */}
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

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {entries.map(entry => (
                <div key={entry.id} className="flex">
                  {/* Type bar */}
                  <span className={`w-[3px] shrink-0 self-stretch ${entry.type === 'Revenue' ? 'bg-emerald-400' : 'bg-red-500'}`} />

                  <div className="flex-1 min-w-0 px-3 py-3">
                    {/* Row 1: description + value */}
                    <div className="flex items-start gap-3 mb-2">
                      <p className="flex-1 min-w-0 font-semibold text-gray-800 text-sm leading-snug">
                        {entry.description}
                        {isRecurring(entry) && <Repeat size={10} className="text-brand-navy/40 inline ml-1" />}
                      </p>
                      <span className={`shrink-0 font-bold text-sm tabular-nums ${entry.type === 'Revenue' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {entry.type === 'Revenue' ? '+' : '−'}{formatCurrency(entry.amount)}
                      </span>
                    </div>

                    {/* Row 2: badge + date + category + actions */}
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={entry.type} />
                      <span className="text-xs text-gray-400 shrink-0">{formatDateOnly(entry.date)}</span>
                      <span className="text-gray-200 shrink-0">·</span>
                      <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{entry.categoryName}</span>
                      {canEdit && (
                        <div className="flex gap-0.5 shrink-0 -mr-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(entry)} className="text-gray-300 hover:text-brand-navy h-7 w-7">
                            <Pencil size={12} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openDelete(entry)} className="text-gray-300 hover:text-red-600 h-7 w-7">
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-50 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-400">Data</TableHead>
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
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap py-3.5">
                        {formatDateOnly(entry.date)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 text-sm">{entry.description}</span>
                          {isRecurring(entry) && (
                            <span title="Lançamento recorrente">
                              <Repeat size={11} className="text-brand-navy/40 shrink-0" />
                            </span>
                          )}
                        </div>
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
                              onClick={() => openDelete(entry)}
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

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingEntry}
        onOpenChange={open => { if (!open) { setDeletingEntry(null); setDeleteScope('single'); } }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm rounded-xl">
          <DialogHeader><DialogTitle>Excluir lançamento?</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
            {deletingEntry && isRecurring(deletingEntry) && (
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-700">Este lançamento faz parte de uma série recorrente:</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="deleteScope" value="single"
                    checked={deleteScope === 'single'}
                    onChange={() => setDeleteScope('single')}
                    className="accent-brand-navy"
                  />
                  <span className="text-sm text-gray-700">Somente este lançamento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="deleteScope" value="all"
                    checked={deleteScope === 'all'}
                    onChange={() => setDeleteScope('all')}
                    className="accent-brand-navy"
                  />
                  <span className="text-sm text-gray-700">Toda a série</span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => { setDeletingEntry(null); setDeleteScope('single'); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingEntry && deleteMutation.mutate({ id: deletingEntry.id, scope: deleteScope })}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="col-span-1 sm:col-span-2">
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
              <div className="col-span-1 sm:col-span-2">
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
              </div>
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

              {/* Recurrence toggle */}
              <div className="col-span-1 sm:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Controller name="isRecurring" control={createForm.control} render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded border-gray-300 accent-brand-navy"
                    />
                  )} />
                  <div className="flex items-center gap-1.5">
                    <Repeat size={13} className="text-brand-navy/60" />
                    <span className="text-sm font-medium text-gray-700">Lançamento recorrente</span>
                  </div>
                </label>
              </div>

              {watchIsRecurring && (
                <>
                  <FormField
                    label="Frequência" required
                    error={(createForm.formState.errors as Record<string, { message?: string }>).recurrenceFrequency?.message}
                  >
                    <Controller name="recurrenceFrequency" control={createForm.control} render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekly">Semanal</SelectItem>
                          <SelectItem value="Monthly">Mensal</SelectItem>
                          <SelectItem value="Yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </FormField>
                  <FormField label="Intervalo">
                    <div className="flex items-center gap-2">
                      <Input type="number" min="1" max="36" {...createForm.register('recurrenceInterval')} className="w-20" />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {watchFrequency ? FREQ_LABELS[watchFrequency] : ''}
                      </span>
                    </div>
                  </FormField>
                  <div className="col-span-1 sm:col-span-2">
                    <FormField
                      label="Data final" required
                      error={(createForm.formState.errors as Record<string, { message?: string }>).recurrenceEndDate?.message}
                    >
                      <Input type="date" {...createForm.register('recurrenceEndDate')} />
                    </FormField>
                  </div>
                  {previewCount > 0 && (
                    <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-xs text-brand-navy bg-blue-50 rounded-lg px-3 py-2">
                      <Repeat size={11} />
                      <span>
                        {previewCount === 120 ? '120 (máximo)' : previewCount} lançamento{previewCount !== 1 ? 's' : ''} serão criados
                      </span>
                    </div>
                  )}
                </>
              )}

              {createMutation.error && (
                <p className="col-span-1 sm:col-span-2 text-xs text-red-600">{(createMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4 flex-row justify-end gap-2">
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
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(data => editingEntry && updateMutation.mutate({ id: editingEntry.id, data, scope: editScope }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {editingEntry && isRecurring(editingEntry) && (
                <div className="col-span-1 sm:col-span-2 border rounded-lg p-3 bg-gray-50 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Este lançamento faz parte de uma série recorrente:</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editScope" value="single" checked={editScope === 'single'} onChange={() => handleEditScopeChange('single')} className="accent-brand-navy" />
                    <span className="text-sm text-gray-700">Editar somente este lançamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editScope" value="all" checked={editScope === 'all'} onChange={() => handleEditScopeChange('all')} className="accent-brand-navy" />
                    <span className="text-sm text-gray-700">Editar toda a série</span>
                  </label>
                </div>
              )}
              <div className="col-span-1 sm:col-span-2">
                <FormField label="Descrição" required error={editForm.formState.errors.description?.message}>
                  <Input {...editForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor (R$)" required error={editForm.formState.errors.amount?.message}>
                <Input type="number" step="0.01" min="0.01" {...editForm.register('amount')} />
              </FormField>
              {editScope === 'single' && (
                <FormField label="Data" required error={editForm.formState.errors.date?.message}>
                  <Input type="date" {...editForm.register('date')} />
                </FormField>
              )}
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
              <div className="col-span-1 sm:col-span-2">
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
              </div>
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
                <p className="col-span-1 sm:col-span-2 text-xs text-red-600">{(updateMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4 flex-row justify-end gap-2">
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

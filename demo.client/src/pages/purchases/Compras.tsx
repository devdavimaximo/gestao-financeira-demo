import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingCart, Plus, AlertCircle, Check, Pencil, XCircle } from 'lucide-react';
import { purchasesApi, budgetsApi, lookupApi, unitsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useUnit } from '../../contexts/UnitContext';
import { useToast } from '../../components/shared/toast';
import { formatCurrency } from '../../lib/utils';
import type { Purchase, UpdatePurchaseRequest } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';
import TableSkeleton from '../../components/shared/TableSkeleton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import FormField from '../../components/shared/FormField';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  Intended:  { label: 'Intencionada', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  Confirmed: { label: 'Confirmada',   className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Cancelled: { label: 'Cancelada',    className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

const createSchema = z.object({
  description: z.string().min(1, 'Informe a descrição'),
  amount:      z.coerce.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dueDate:     z.string().optional().transform(v => v || undefined),
  notes:       z.string().optional().transform(v => v || undefined),
  unitId:      z.string().min(1, 'Selecione a unidade'),
  categoryId:  z.string().min(1, 'Selecione a categoria'),
  budgetId:    z.string().min(1, 'Selecione a verba'),
});

const editSchema = z.object({
  description: z.string().min(1, 'Informe a descrição'),
  amount:      z.coerce.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dueDate:     z.string().optional().transform(v => v || undefined),
  notes:       z.string().optional().transform(v => v || undefined),
  categoryId:  z.string().min(1, 'Selecione a categoria'),
  status:      z.enum(['Intended', 'Confirmed', 'Cancelled']),
  budgetId:    z.string().min(1, 'Selecione a verba'),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

function CreateDialog({
  open, onClose, accessibleUnits, categories, activeBudgets, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  accessibleUnits: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  activeBudgets: { id: string; description: string; unitId: string; unitName: string }[];
  onSuccess: () => void;
}) {
  const { selectedUnitId } = useUnit();
  const qc = useQueryClient();

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      unitId: selectedUnitId ?? (accessibleUnits.length === 1 ? accessibleUnits[0].id : ''),
    },
  });

  const selectedUnitInForm = watch('unitId');
  const budgetsForUnit = activeBudgets.filter(b => !selectedUnitInForm || b.unitId === selectedUnitInForm);

  const mutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      reset();
      onClose();
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova Compra</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(data => mutation.mutate({ description: data.description, amount: data.amount, dueDate: data.dueDate, notes: data.notes, unitId: data.unitId, categoryId: data.categoryId, budgetId: data.budgetId }))} className="space-y-4 py-2">
          <FormField label="Descrição" required error={errors.description?.message}>
            <Input {...register('description')} placeholder="Ex: Material de limpeza" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)" required error={errors.amount?.message}>
              <Input type="number" step="0.01" min="0.01" {...register('amount')} placeholder="0,00" />
            </FormField>
            <FormField label="Vencimento">
              <Input type="date" {...register('dueDate')} />
            </FormField>
          </div>
          <FormField label="Unidade" required error={errors.unitId?.message}>
            <Controller name="unitId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>{accessibleUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Categoria" required error={errors.categoryId?.message}>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Verba" required error={errors.budgetId?.message}>
            <Controller name="budgetId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione a verba" /></SelectTrigger>
                <SelectContent>
                  {budgetsForUnit.length === 0
                    ? <SelectItem value="_none" disabled>Nenhuma verba ativa para essa unidade</SelectItem>
                    : budgetsForUnit.map(b => <SelectItem key={b.id} value={b.id}>{b.description} — {b.unitName}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Observações">
            <Input {...register('notes')} placeholder="Opcional" />
          </FormField>
          {mutation.error && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {(mutation.error as Error).message}</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
              {mutation.isPending ? 'Registrando...' : 'Registrar Compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  item, open, onClose, categories, activeBudgets, onSuccess,
}: {
  item: Purchase;
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  activeBudgets: { id: string; description: string; unitId: string; unitName: string }[];
  onSuccess: () => void;
}) {
  const qc = useQueryClient();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      description: item.description,
      amount:      item.amount,
      dueDate:     item.dueDate ?? '',
      notes:       item.notes ?? '',
      categoryId:  item.categoryId,
      status:      item.status as 'Intended' | 'Confirmed' | 'Cancelled',
      budgetId:    item.budgetId,
    },
  });

  const budgetsForUnit = activeBudgets.filter(b => b.unitId === item.unitId || b.id === item.budgetId);

  const mutation = useMutation({
    mutationFn: (dto: UpdatePurchaseRequest) => purchasesApi.update(item.id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
      onSuccess();
    },
  });

  function onSubmit(data: EditForm) {
    mutation.mutate({ description: data.description, amount: data.amount, dueDate: data.dueDate, notes: data.notes, categoryId: data.categoryId, status: data.status, budgetId: data.budgetId });
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar Compra</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FormField label="Descrição" required error={errors.description?.message}>
            <Input {...register('description')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)" required error={errors.amount?.message}>
              <Input type="number" step="0.01" min="0.01" {...register('amount')} />
            </FormField>
            <FormField label="Vencimento">
              <Input type="date" {...register('dueDate')} />
            </FormField>
          </div>
          <FormField label="Status" required>
            <Controller name="status" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intended">Intencionada</SelectItem>
                  <SelectItem value="Confirmed">Confirmada</SelectItem>
                  <SelectItem value="Cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Categoria" required error={errors.categoryId?.message}>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Verba" required error={errors.budgetId?.message}>
            <Controller name="budgetId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{budgetsForUnit.map(b => <SelectItem key={b.id} value={b.id}>{b.description}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Observações">
            <Input {...register('notes')} placeholder="Opcional" />
          </FormField>
          {mutation.error && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {(mutation.error as Error).message}</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Compras() {
  const { isAdmin, user } = useAuth();
  const { selectedUnitId } = useUnit();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: units } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });

  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterBudgetId, setFilterBudgetId] = useState('');
  const [createOpen,     setCreateOpen]     = useState(false);
  const [editItem,       setEditItem]       = useState<Purchase | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<Purchase | null>(null);
  const [cancellingItem, setCancellingItem] = useState<Purchase | null>(null);

  const accessibleUnits = useMemo(() => {
    const active = (units ?? []).filter(u => u.isActive);
    if (isAdmin) return active.map(u => ({ id: u.id, name: u.name }));
    return active.filter(u => user?.unitIds?.includes(u.id)).map(u => ({ id: u.id, name: u.name }));
  }, [units, isAdmin, user]);

  const { data: categories = [] } = useQuery({ queryKey: ['lookup-categories'], queryFn: lookupApi.getCategories });

  const { data: allBudgets = [] } = useQuery({
    queryKey: ['budgets', selectedUnitId],
    queryFn: () => budgetsApi.getAll({ unitId: selectedUnitId }),
  });

  const activeBudgets = useMemo(
    () => allBudgets.filter(b => b.status !== 'Closed').map(b => ({ id: b.id, description: b.description, unitId: b.unitId, unitName: b.unitName })),
    [allBudgets],
  );

  const { data: purchases = [], isLoading, error } = useQuery({
    queryKey: ['purchases', selectedUnitId, filterBudgetId, filterStatus],
    queryFn: () => purchasesApi.getAll({ unitId: selectedUnitId, budgetId: filterBudgetId || undefined, status: filterStatus || undefined }),
  });

  const kpi = useMemo(() => {
    const intended  = purchases.filter(p => p.status === 'Intended');
    const confirmed = purchases.filter(p => p.status === 'Confirmed');
    return {
      intendedCount:  intended.length,
      intendedTotal:  intended.reduce((s, p) => s + p.amount, 0),
      confirmedCount: confirmed.length,
      confirmedTotal: confirmed.reduce((s, p) => s + p.amount, 0),
      grandTotal:     purchases.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + p.amount, 0),
    };
  }, [purchases]);

  const confirmMutation = useMutation({
    mutationFn: (p: Purchase) => purchasesApi.update(p.id, {
      description: p.description, amount: p.amount, dueDate: p.dueDate ?? undefined,
      notes: p.notes ?? undefined, categoryId: p.categoryId, status: 'Confirmed', budgetId: p.budgetId,
    } satisfies UpdatePurchaseRequest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setConfirmingItem(null);
      toast('Compra confirmada.');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setConfirmingItem(null); },
  });

  const cancelMutation = useMutation({
    mutationFn: purchasesApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setCancellingItem(null);
      toast('Compra cancelada.', 'info');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setCancellingItem(null); },
  });

  const canMutate = isAdmin || user?.role === 'Financial' || user?.role === 'Purchases';

  return (
    <motion.div className="space-y-5" variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Controle de Compras"
        subtitle="Gerencie compras vinculadas às verbas"
        action={
          canMutate && (
            <Button onClick={() => setCreateOpen(true)} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
              <Plus size={15} /> Nova Compra
            </Button>
          )
        }
      />

      {/* Mobile KPIs */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Intencionadas</p>
            <p className="text-[10px] text-blue-500 mt-0.5">{kpi.intendedCount} compra{kpi.intendedCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-blue-700">{formatCurrency(kpi.intendedTotal)}</p>
        </div>
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Confirmadas</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{kpi.confirmedCount} compra{kpi.confirmedCount !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-emerald-700">{formatCurrency(kpi.confirmedTotal)}</p>
        </div>
        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-navy">Total Geral</p>
            <p className="text-[10px] text-brand-navy/60 mt-0.5">{purchases.filter(p => p.status !== 'Cancelled').length} ativas</p>
          </div>
          <p className="text-lg font-black tabular-nums text-brand-navy">{formatCurrency(kpi.grandTotal)}</p>
        </div>
      </div>

      {/* Desktop KPI Cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="hidden sm:grid grid-cols-3 gap-3">
        <StatCard
          label="Intencionadas"
          value={formatCurrency(kpi.intendedTotal)}
          sub={`${kpi.intendedCount} ${kpi.intendedCount === 1 ? 'compra' : 'compras'}`}
          variant="blue"
        />
        <StatCard
          label="Confirmadas"
          value={formatCurrency(kpi.confirmedTotal)}
          sub={`${kpi.confirmedCount} ${kpi.confirmedCount === 1 ? 'compra' : 'compras'}`}
          variant="emerald"
        />
        <StatCard
          label="Total Geral"
          value={formatCurrency(kpi.grandTotal)}
          sub={`${purchases.filter(p => p.status !== 'Cancelled').length} compras ativas`}
          variant="navy"
        />
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-white h-9 text-sm"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            <SelectItem value="Intended">Intencionadas</SelectItem>
            <SelectItem value="Confirmed">Confirmadas</SelectItem>
            <SelectItem value="Cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBudgetId} onValueChange={setFilterBudgetId}>
          <SelectTrigger className="w-56 bg-white h-9 text-sm"><SelectValue placeholder="Todas as verbas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as verbas</SelectItem>
            {allBudgets.map(b => <SelectItem key={b.id} value={b.id}>{b.description} — {b.unitName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={22} strokeWidth={1.5} />}
            title="Erro ao carregar compras"
            description={(error as Error).message}
          />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={22} strokeWidth={1.5} />}
            title="Nenhuma compra encontrada"
            description="As compras vinculadas às verbas aparecerão aqui"
            action={
              canMutate && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
                  <Plus size={14} /> Nova Compra
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {purchases.map(item => {
                const barColors: Record<string, string> = {
                  Intended: 'bg-blue-400', Confirmed: 'bg-emerald-400', Cancelled: 'bg-gray-300',
                };
                return (
                  <div key={item.id} className="flex">
                    <span className={`w-0.75 shrink-0 self-stretch ${barColors[item.status] ?? 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0 px-3 py-3">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm leading-snug">{item.description}</p>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
                        </div>
                        <span className="shrink-0 font-bold text-sm tabular-nums text-gray-800">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{item.categoryName}</span>
                        {canMutate && (
                          <div className="flex gap-0.5 -mr-1">
                            {item.status === 'Intended' && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setConfirmingItem(item)} className="text-emerald-500 hover:text-emerald-700 h-7 w-7" title="Confirmar">
                                <Check size={12} />
                              </Button>
                            )}
                            {item.status !== 'Cancelled' && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setEditItem(item)} className="text-gray-300 hover:text-brand-navy h-7 w-7" title="Editar">
                                <Pencil size={12} />
                              </Button>
                            )}
                            {item.status !== 'Cancelled' && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setCancellingItem(item)} className="text-gray-300 hover:text-red-600 h-7 w-7" title="Cancelar">
                                <XCircle size={12} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 hidden lg:table-cell">Verba</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Vencimento</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Valor</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Status</th>
                    {canMutate && <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-800">
                        {item.description}
                        {item.notes && <p className="text-xs text-gray-400 font-normal mt-0.5 truncate max-w-48">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{item.categoryName}</td>
                      <td className="px-4 py-3.5 text-gray-600 hidden md:table-cell">{item.unitName}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs hidden lg:table-cell">{item.budgetDescription}</td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {item.dueDate ? item.dueDate.split('-').reverse().join('/') : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-800 tabular-nums">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={item.status} /></td>
                      {canMutate && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'Intended' && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => setConfirmingItem(item)}
                                disabled={confirmMutation.isPending}
                                className="h-7 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                              >
                                <Check size={12} /> Confirmar
                              </Button>
                            )}
                            {item.status !== 'Cancelled' && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => setEditItem(item)}
                                className="h-7 px-2.5 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Editar
                              </Button>
                            )}
                            {item.status !== 'Cancelled' && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => setCancellingItem(item)}
                                disabled={cancelMutation.isPending}
                                className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Confirm purchase dialog */}
      <ConfirmDialog
        open={!!confirmingItem}
        title="Confirmar compra?"
        description={confirmingItem ? `Confirmar "${confirmingItem.description}" de ${formatCurrency(confirmingItem.amount)}?` : undefined}
        confirmLabel="Confirmar compra"
        loading={confirmMutation.isPending}
        onConfirm={() => confirmingItem && confirmMutation.mutate(confirmingItem)}
        onClose={() => setConfirmingItem(null)}
      />

      {/* Cancel purchase dialog */}
      <ConfirmDialog
        open={!!cancellingItem}
        title="Cancelar compra?"
        description={cancellingItem ? `Cancelar "${cancellingItem.description}"? Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Cancelar compra"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => cancellingItem && cancelMutation.mutate(cancellingItem.id)}
        onClose={() => setCancellingItem(null)}
      />

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accessibleUnits={accessibleUnits}
        categories={categories}
        activeBudgets={activeBudgets}
        onSuccess={() => toast('Compra registrada com sucesso.')}
      />

      {editItem && (
        <EditDialog
          item={editItem}
          open={!!editItem}
          onClose={() => setEditItem(null)}
          categories={categories}
          activeBudgets={activeBudgets}
          onSuccess={() => toast('Compra atualizada.')}
        />
      )}
    </motion.div>
  );
}

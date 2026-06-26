import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, PiggyBank } from 'lucide-react';
import { budgetsApi, unitsApi } from '../../services/api';
import type { Budget, BudgetStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUnit } from '../../contexts/UnitContext';
import { useToast } from '../../components/shared/toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';
import { CardSkeleton } from '../../components/shared/TableSkeleton';
import FormField from '../../components/shared/FormField';
import { formatCurrency, MONTH_NAMES } from '../../lib/utils';

const now = new Date();

const createSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  totalAmount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  month:       z.coerce.number().min(1).max(12),
  year:        z.coerce.number().min(2020).max(2030),
  unitId:      z.string().min(1, 'Unidade obrigatória'),
});

const editSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  totalAmount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

const STATUS_MAP: Record<BudgetStatus, { label: string; className: string }> = {
  Active:   { label: 'Ativa',     className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Exceeded: { label: 'Estourada', className: 'bg-red-50 text-red-700 border-red-100' },
  Closed:   { label: 'Fechada',   className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function StatusBadge({ status }: { status: BudgetStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-orange-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="mt-3 mb-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className="tabular-nums">{pct.toFixed(0)}% utilizado</span>
        <span className="tabular-nums">{formatCurrency(used)} / {formatCurrency(total)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Verbas() {
  const { user, isAdmin } = useAuth();
  const { selectedUnitId } = useUnit();
  const toast = useToast();
  const qc = useQueryClient();
  const canEdit = isAdmin || user?.role === 'Financial';

  const [filterMonth,   setFilterMonth]   = useState<number | ''>('');
  const [filterYear,    setFilterYear]    = useState<number>(now.getFullYear());
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', { unitId: selectedUnitId, month: filterMonth || undefined, year: filterYear }],
    queryFn: () => budgetsApi.getAll({ unitId: selectedUnitId, month: filterMonth || undefined, year: filterYear }),
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });

  const accessibleUnits = useMemo(() => {
    const active = units.filter(u => u.status === 'Active');
    return isAdmin ? active : active.filter(u => user?.unitIds.includes(u.id));
  }, [units, isAdmin, user]);

  const totalBudgeted  = budgets.reduce((s, b) => s + b.totalAmount, 0);
  const totalUsed      = budgets.reduce((s, b) => s + b.usedAmount, 0);
  const totalAvailable = budgets.reduce((s, b) => s + b.availableAmount, 0);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() } });
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setCreateOpen(false);
      createForm.reset();
      toast('Verba criada com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => budgetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setEditingBudget(null);
      toast('Verba atualizada.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  function openEdit(budget: Budget) {
    editForm.reset({ description: budget.description, totalAmount: budget.totalAmount });
    setEditingBudget(budget);
  }

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Controle de Verbas"
        subtitle="Orçamentos por unidade e período"
        action={
          canEdit && (
            <Button
              onClick={() => { createForm.reset({ month: now.getMonth() + 1, year: now.getFullYear(), unitId: selectedUnitId ?? '' }); setCreateOpen(true); }}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5"
            >
              <Plus size={15} /> Nova Verba
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
          <SelectTrigger className="w-24 bg-white h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterMonth === '' ? '' : String(filterMonth)} onValueChange={v => setFilterMonth(v === '' ? '' : Number(v))}>
          <SelectTrigger className="w-36 bg-white h-9 text-sm"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os meses</SelectItem>
            {MONTH_NAMES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Total Orçado"
          value={formatCurrency(totalBudgeted)}
          sub={`${budgets.length} verbas`}
          icon={<PiggyBank size={15} />}
          variant="navy"
        />
        <StatCard
          label="Utilizado"
          value={formatCurrency(totalUsed)}
          sub={totalBudgeted > 0 ? `${((totalUsed / totalBudgeted) * 100).toFixed(0)}% do total` : '—'}
          variant="amber"
        />
        <StatCard
          label="Disponível"
          value={formatCurrency(totalAvailable)}
          variant={totalAvailable < 0 ? 'red' : 'emerald'}
        />
      </motion.div>

      {/* Budget Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={22} strokeWidth={1.5} />}
          title="Nenhuma verba encontrada"
          description="Nenhuma verba cadastrada para este período"
          action={
            canEdit && (
              <Button size="sm" onClick={() => { createForm.reset({ month: now.getMonth() + 1, year: now.getFullYear(), unitId: selectedUnitId ?? '' }); setCreateOpen(true); }}
                className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
                <Plus size={14} /> Nova Verba
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(budget => (
            <div key={budget.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0 mr-3">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{budget.description}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{budget.unitName}</p>
                </div>
                <StatusBadge status={budget.status} />
              </div>

              <ProgressBar used={budget.usedAmount} total={budget.totalAmount} />

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Utilizado</span>
                  <span className="font-medium text-amber-600 tabular-nums">{formatCurrency(budget.usedAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Disponível</span>
                  <span className={`font-medium tabular-nums ${budget.availableAmount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(budget.availableAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-50">
                  <span className="text-gray-400 text-xs">Total orçado</span>
                  <span className="text-gray-600 font-medium text-xs tabular-nums">{formatCurrency(budget.totalAmount)}</span>
                </div>
              </div>

              {canEdit && budget.status !== 'Closed' && (
                <div className="mt-4 pt-3 border-t border-gray-50">
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 h-7 px-2 text-xs" onClick={() => openEdit(budget)}>
                    <Pencil size={12} className="mr-1" /> Editar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Verba</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}>
            <div className="space-y-4 py-2">
              <FormField label="Descrição" required error={createForm.formState.errors.description?.message}>
                <Input placeholder="Ex: Verba Operacional" {...createForm.register('description')} />
              </FormField>
              <FormField label="Valor Total (R$)" required error={createForm.formState.errors.totalAmount?.message}>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...createForm.register('totalAmount')} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Mês" required error={createForm.formState.errors.month?.message}>
                  <Controller name="month" control={createForm.control} render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
                <FormField label="Ano" required error={createForm.formState.errors.year?.message}>
                  <Controller name="year" control={createForm.control} render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </FormField>
              </div>
              <FormField label="Unidade" required error={createForm.formState.errors.unitId?.message}>
                <Controller name="unitId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                    <SelectContent>{accessibleUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              {createMutation.error && <p className="text-xs text-red-600">{(createMutation.error as Error).message}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
                {createMutation.isPending ? 'Criando...' : 'Criar Verba'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={open => { if (!open) setEditingBudget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Verba</DialogTitle></DialogHeader>
          {editingBudget && (
            <p className="text-sm text-gray-500 -mt-1">{editingBudget.unitName} · {MONTH_NAMES[editingBudget.month - 1]}/{editingBudget.year}</p>
          )}
          <form onSubmit={editForm.handleSubmit(data => editingBudget && updateMutation.mutate({ id: editingBudget.id, data }))}>
            <div className="space-y-4 py-2">
              <FormField label="Descrição" required error={editForm.formState.errors.description?.message}>
                <Input {...editForm.register('description')} />
              </FormField>
              <FormField label="Valor Total (R$)" required error={editForm.formState.errors.totalAmount?.message}>
                <Input type="number" step="0.01" min="0.01" {...editForm.register('totalAmount')} />
              </FormField>
              {updateMutation.error && <p className="text-xs text-red-600">{(updateMutation.error as Error).message}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setEditingBudget(null)}>Cancelar</Button>
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

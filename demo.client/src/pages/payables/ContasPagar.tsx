import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, CreditCard, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { payablesApi, lookupApi, unitsApi } from '../../services/api';
import type { AccountPayable, AccountPayableStatus } from '../../types';
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
import { formatCurrency, formatDateOnly, todayIso } from '../../lib/utils';

const createSchema = z.object({
  description:     z.string().min(1, 'Descrição obrigatória'),
  amount:          z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  dueDate:         z.string().min(1, 'Data de vencimento obrigatória'),
  unitId:          z.string().min(1, 'Unidade obrigatória'),
  categoryId:      z.string().min(1, 'Categoria obrigatória'),
  paymentMethodId: z.string().optional().transform(v => v || undefined),
  notes:           z.string().optional(),
});

const paySchema = z.object({
  paidAmount:      z.coerce.number().min(0.01, 'Valor pago obrigatório'),
  paidDate:        z.string().min(1, 'Data de pagamento obrigatória'),
  paymentMethodId: z.string().min(1, 'Forma de pagamento obrigatória'),
});

type CreateForm = z.infer<typeof createSchema>;
type PayForm    = z.infer<typeof paySchema>;

const STATUS_MAP: Record<AccountPayableStatus, { label: string; className: string }> = {
  Pending:   { label: 'Pendente',  className: 'bg-amber-50 text-amber-700 border-amber-100' },
  Paid:      { label: 'Pago',      className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Overdue:   { label: 'Vencida',   className: 'bg-red-50 text-red-700 border-red-100' },
  Cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function StatusBadge({ status }: { status: AccountPayableStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

export default function ContasPagar() {
  const { user, isAdmin } = useAuth();
  const { selectedUnitId } = useUnit();
  const toast = useToast();
  const qc = useQueryClient();
  const canEdit = isAdmin || user?.role === 'Financial';

  const [filterStatus,   setFilterStatus]   = useState('');
  const [createOpen,     setCreateOpen]     = useState(false);
  const [editingItem,    setEditingItem]    = useState<AccountPayable | null>(null);
  const [payingItem,     setPayingItem]     = useState<AccountPayable | null>(null);
  const [cancellingId,   setCancellingId]   = useState<string | null>(null);

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ['payables', { unitId: selectedUnitId, status: filterStatus || undefined }],
    queryFn: () => payablesApi.getAll({ unitId: selectedUnitId, status: filterStatus || undefined }),
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ['lookup-categories'], queryFn: lookupApi.getCategories });
  const { data: paymentMethods = [] } = useQuery({ queryKey: ['lookup-pm'], queryFn: lookupApi.getPaymentMethods });

  const accessibleUnits = useMemo(() => {
    const active = units.filter(u => u.status === 'Active');
    return isAdmin ? active : active.filter(u => user?.unitIds.includes(u.id));
  }, [units, isAdmin, user]);

  const totalPending = payables.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payables.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);
  const totalPaid    = payables.filter(p => p.status === 'Paid').reduce((s, p) => s + (p.paidAmount ?? 0), 0);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const editForm   = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const payForm    = useForm<PayForm>({ resolver: zodResolver(paySchema) });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => payablesApi.create({ ...data, paymentMethodId: data.paymentMethodId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      setCreateOpen(false);
      createForm.reset();
      toast('Conta criada com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateForm }) =>
      payablesApi.update(id, { description: data.description, amount: data.amount, dueDate: data.dueDate, notes: data.notes, categoryId: data.categoryId, paymentMethodId: data.paymentMethodId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      setEditingItem(null);
      toast('Conta atualizada.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayForm }) => payablesApi.pay(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      setPayingItem(null);
      toast('Pagamento registrado com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: payablesApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      setCancellingId(null);
      toast('Conta cancelada.', 'info');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setCancellingId(null); },
  });

  function openCreate() {
    createForm.reset({
      dueDate: todayIso(),
      unitId: selectedUnitId ?? (accessibleUnits.length === 1 ? accessibleUnits[0].id : ''),
      paymentMethodId: '',
      notes: '',
    });
    setCreateOpen(true);
  }

  function openEdit(item: AccountPayable) {
    editForm.reset({
      description: item.description,
      amount: item.amount,
      dueDate: item.dueDate,
      unitId: item.unitId,
      categoryId: item.categoryId,
      paymentMethodId: item.paymentMethodId ?? '',
      notes: item.notes ?? '',
    });
    setEditingItem(item);
  }

  function openPay(item: AccountPayable) {
    payForm.reset({ paidAmount: item.amount, paidDate: todayIso(), paymentMethodId: item.paymentMethodId ?? '' });
    setPayingItem(item);
  }

  const today = todayIso();

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Contas a Pagar"
        subtitle="Controle de vencimentos e baixa de pagamentos"
        action={
          canEdit && (
            <Button onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
              <Plus size={15} /> Nova Conta
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-white h-9 text-sm"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            <SelectItem value="Pending">Pendente</SelectItem>
            <SelectItem value="Overdue">Vencida</SelectItem>
            <SelectItem value="Paid">Pago</SelectItem>
            <SelectItem value="Cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Pendente"
          value={formatCurrency(totalPending)}
          sub={`${payables.filter(p => p.status === 'Pending').length} contas`}
          icon={<Clock size={15} />}
          variant="amber"
        />
        <StatCard
          label="Vencida"
          value={formatCurrency(totalOverdue)}
          sub={`${payables.filter(p => p.status === 'Overdue').length} contas`}
          icon={<AlertCircle size={15} />}
          variant="red"
        />
        <StatCard
          label="Pago"
          value={formatCurrency(totalPaid)}
          sub={`${payables.filter(p => p.status === 'Paid').length} contas`}
          icon={<CheckCircle2 size={15} />}
          variant="emerald"
        />
      </motion.div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : payables.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={22} strokeWidth={1.5} />}
            title="Nenhuma conta a pagar"
            description="As contas aparecerão aqui quando cadastradas"
            action={
              canEdit && (
                <Button size="sm" onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
                  <Plus size={14} /> Nova Conta
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-gray-400">Descrição</TableHead>
                  <TableHead className="text-xs font-medium text-gray-400 hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-xs font-medium text-gray-400 hidden lg:table-cell">Unidade</TableHead>
                  <TableHead className="text-xs font-medium text-gray-400">Vencimento</TableHead>
                  <TableHead className="text-xs font-medium text-gray-400 text-right">Valor</TableHead>
                  <TableHead className="text-xs font-medium text-gray-400">Status</TableHead>
                  {canEdit && <TableHead className="text-xs font-medium text-gray-400 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map(item => {
                  const isOverdue = item.status === 'Pending' && item.dueDate < today;
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/70 border-gray-50">
                      <TableCell className="py-3.5">
                        <div className="font-medium text-gray-800 text-sm">{item.description}</div>
                        <div className="text-xs text-gray-400 mt-0.5 md:hidden">{item.categoryName}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600 py-3.5">{item.categoryName}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-600 py-3.5">{item.unitName}</TableCell>
                      <TableCell className={`text-sm font-medium whitespace-nowrap py-3.5 ${isOverdue || item.status === 'Overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatDateOnly(item.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-gray-800 whitespace-nowrap tabular-nums py-3.5">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="py-3.5"><StatusBadge status={item.status} /></TableCell>
                      {canEdit && (
                        <TableCell className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {(item.status === 'Pending' || item.status === 'Overdue') && (
                              <>
                                <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(item)} className="text-gray-400 hover:text-brand-navy hover:bg-blue-50">
                                  <Pencil size={13} />
                                </Button>
                                <Button
                                  variant="ghost" size="icon-sm" title="Registrar pagamento"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => openPay(item)}
                                >
                                  <CreditCard size={13} />
                                </Button>
                              </>
                            )}
                            {item.status !== 'Cancelled' && item.status !== 'Paid' && (
                              <Button
                                variant="ghost" size="icon-sm" title="Cancelar"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setCancellingId(item.id)}
                              >
                                <XCircle size={13} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Confirm cancel */}
      <ConfirmDialog
        open={!!cancellingId}
        title="Cancelar conta?"
        description="A conta será marcada como cancelada e não poderá ser reaberta."
        confirmLabel="Cancelar conta"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => cancellingId && cancelMutation.mutate(cancellingId)}
        onClose={() => setCancellingId(null)}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <FormField label="Descrição" required error={createForm.formState.errors.description?.message}>
                  <Input placeholder="Ex: Aluguel de julho" {...createForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor (R$)" required error={createForm.formState.errors.amount?.message}>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...createForm.register('amount')} />
              </FormField>
              <FormField label="Vencimento" required error={createForm.formState.errors.dueDate?.message}>
                <Input type="date" {...createForm.register('dueDate')} />
              </FormField>
              <FormField label="Unidade" required error={createForm.formState.errors.unitId?.message}>
                <Controller name="unitId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{accessibleUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Categoria" required error={createForm.formState.errors.categoryId?.message}>
                <Controller name="categoryId" control={createForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <div className="col-span-2">
                <FormField label="Forma de Pagamento">
                  <Controller name="paymentMethodId" control={createForm.control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma (definir ao pagar)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </FormField>
              </div>
              {createMutation.error && (
                <p className="col-span-2 text-xs text-red-600">{(createMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
                {createMutation.isPending ? 'Salvando...' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={open => { if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Conta a Pagar</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(data => editingItem && updateMutation.mutate({ id: editingItem.id, data }))}>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <FormField label="Descrição" required error={editForm.formState.errors.description?.message}>
                  <Input {...editForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor (R$)" required error={editForm.formState.errors.amount?.message}>
                <Input type="number" step="0.01" min="0.01" {...editForm.register('amount')} />
              </FormField>
              <FormField label="Vencimento" required error={editForm.formState.errors.dueDate?.message}>
                <Input type="date" {...editForm.register('dueDate')} />
              </FormField>
              <FormField label="Categoria" required error={editForm.formState.errors.categoryId?.message}>
                <Controller name="categoryId" control={editForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Forma de Pagamento">
                <Controller name="paymentMethodId" control={editForm.control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              {updateMutation.error && (
                <p className="col-span-2 text-xs text-red-600">{(updateMutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-brand-navy hover:bg-brand-navy/90 text-white">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={!!payingItem} onOpenChange={open => { if (!open) setPayingItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payingItem && (
            <div className="mb-1 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">{payingItem.description}</p>
              <p className="text-gray-500 text-xs mt-0.5">Valor original: <span className="font-bold tabular-nums">{formatCurrency(payingItem.amount)}</span></p>
            </div>
          )}
          <form onSubmit={payForm.handleSubmit(data => payingItem && payMutation.mutate({ id: payingItem.id, data }))}>
            <div className="space-y-4 py-1">
              <FormField label="Valor Pago (R$)" required error={payForm.formState.errors.paidAmount?.message}>
                <Input type="number" step="0.01" min="0.01" {...payForm.register('paidAmount')} />
              </FormField>
              <FormField label="Data do Pagamento" required error={payForm.formState.errors.paidDate?.message}>
                <Input type="date" {...payForm.register('paidDate')} />
              </FormField>
              <FormField label="Forma de Pagamento" required error={payForm.formState.errors.paymentMethodId?.message}>
                <Controller name="paymentMethodId" control={payForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              {payMutation.error && <p className="text-xs text-red-600">{(payMutation.error as Error).message}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setPayingItem(null)}>Cancelar</Button>
              <Button type="submit" disabled={payMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {payMutation.isPending ? 'Registrando...' : 'Confirmar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wallet, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { receivablesApi, lookupApi, unitsApi } from '../../services/api';
import type { AccountReceivable, AccountReceivableStatus } from '../../types';
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
  expectedAmount:  z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  expectedDate:    z.string().min(1, 'Data prevista obrigatória'),
  unitId:          z.string().min(1, 'Unidade obrigatória'),
  categoryId:      z.string().min(1, 'Categoria obrigatória'),
  paymentMethodId: z.string().optional().transform(v => v || undefined),
  notes:           z.string().optional(),
});

const receiveSchema = z.object({
  receivedAmount: z.coerce.number().min(0.01, 'Valor obrigatório'),
  receivedDate:   z.string().min(1, 'Data obrigatória'),
});

type CreateForm  = z.infer<typeof createSchema>;
type ReceiveForm = z.infer<typeof receiveSchema>;

const STATUS_MAP: Record<AccountReceivableStatus, { label: string; className: string }> = {
  Pending:   { label: 'Previsto',  className: 'bg-blue-50 text-blue-700 border-blue-100' },
  Received:  { label: 'Recebido', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Overdue:   { label: 'Atrasado', className: 'bg-red-50 text-red-700 border-red-100' },
  Cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function StatusBadge({ status }: { status: AccountReceivableStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

export default function ContasReceber() {
  const { user, isAdmin } = useAuth();
  const { selectedUnitId } = useUnit();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canEdit = isAdmin || user?.role === 'Financial';

  const [filterStatus,  setFilterStatus]  = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [receivingItem, setReceivingItem] = useState<AccountReceivable | null>(null);
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ['receivables', { unitId: selectedUnitId, status: filterStatus || undefined }],
    queryFn: () => receivablesApi.getAll({ unitId: selectedUnitId, status: filterStatus || undefined }),
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitsApi.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ['lookup-categories'], queryFn: lookupApi.getCategories });
  const { data: paymentMethods = [] } = useQuery({ queryKey: ['lookup-pm'], queryFn: lookupApi.getPaymentMethods });

  const accessibleUnits = useMemo(() => {
    const active = units.filter(u => u.status === 'Active');
    return isAdmin ? active : active.filter(u => user?.unitIds.includes(u.id));
  }, [units, isAdmin, user]);

  const totalPending  = receivables.filter(r => r.status === 'Pending').reduce((s, r) => s + r.expectedAmount, 0);
  const totalOverdue  = receivables.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.expectedAmount, 0);
  const totalReceived = receivables.filter(r => r.status === 'Received').reduce((s, r) => s + (r.receivedAmount ?? 0), 0);

  const createForm  = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const receiveForm = useForm<ReceiveForm>({ resolver: zodResolver(receiveSchema) });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => receivablesApi.create({ ...data, paymentMethodId: data.paymentMethodId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      setCreateOpen(false);
      createForm.reset();
      toast('Recebimento criado com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceiveForm }) => receivablesApi.receive(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      setReceivingItem(null);
      toast('Recebimento registrado com sucesso.');
    },
    onError: (e) => toast((e as Error).message, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: receivablesApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      setCancellingId(null);
      toast('Recebimento cancelado.', 'info');
    },
    onError: (e) => { toast((e as Error).message, 'error'); setCancellingId(null); },
  });

  function openCreate() {
    createForm.reset({
      expectedDate: todayIso(),
      unitId: selectedUnitId ?? (accessibleUnits.length === 1 ? accessibleUnits[0].id : ''),
      paymentMethodId: '',
      notes: '',
    });
    setCreateOpen(true);
  }

  function openReceive(item: AccountReceivable) {
    receiveForm.reset({ receivedAmount: item.expectedAmount, receivedDate: todayIso() });
    setReceivingItem(item);
  }

  const today = todayIso();

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Contas a Receber"
        subtitle="Recebimentos previstos e registro de entradas"
        action={
          canEdit && (
            <Button onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
              <Plus size={15} /> Novo Recebimento
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
            <SelectItem value="Pending">Previsto</SelectItem>
            <SelectItem value="Overdue">Atrasado</SelectItem>
            <SelectItem value="Received">Recebido</SelectItem>
            <SelectItem value="Cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile KPIs */}
      <div className="flex flex-col gap-2 mb-4 sm:hidden">
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Previsto</p>
            <p className="text-[10px] text-blue-500 mt-0.5">{receivables.filter(r => r.status === 'Pending').length} entrada{receivables.filter(r => r.status === 'Pending').length !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-blue-700">{formatCurrency(totalPending)}</p>
        </div>
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Atrasado</p>
            <p className="text-[10px] text-red-500 mt-0.5">{receivables.filter(r => r.status === 'Overdue').length} entrada{receivables.filter(r => r.status === 'Overdue').length !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-red-700">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Recebido</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{receivables.filter(r => r.status === 'Received').length} entrada{receivables.filter(r => r.status === 'Received').length !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-lg font-black tabular-nums text-emerald-700">{formatCurrency(totalReceived)}</p>
        </div>
      </div>

      {/* Desktop KPI Cards */}
      <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="hidden sm:grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Previsto"
          value={formatCurrency(totalPending)}
          sub={`${receivables.filter(r => r.status === 'Pending').length} entradas`}
          icon={<Clock size={15} />}
          variant="blue"
        />
        <StatCard
          label="Atrasado"
          value={formatCurrency(totalOverdue)}
          sub={`${receivables.filter(r => r.status === 'Overdue').length} entradas`}
          icon={<AlertCircle size={15} />}
          variant="red"
        />
        <StatCard
          label="Recebido"
          value={formatCurrency(totalReceived)}
          sub={`${receivables.filter(r => r.status === 'Received').length} entradas`}
          icon={<CheckCircle size={15} />}
          variant="emerald"
        />
      </motion.div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : receivables.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} strokeWidth={1.5} />}
            title="Nenhum recebimento encontrado"
            description="Os recebimentos previstos aparecerão aqui"
            action={
              canEdit && (
                <Button size="sm" onClick={openCreate} className="bg-brand-navy hover:bg-brand-navy/90 text-white gap-1.5">
                  <Plus size={14} /> Novo Recebimento
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {receivables.map(item => {
                const isLate = item.status === 'Pending' && item.expectedDate < today;
                const barColors: Record<AccountReceivableStatus, string> = {
                  Pending: 'bg-blue-400', Overdue: 'bg-red-500',
                  Received: 'bg-emerald-400', Cancelled: 'bg-gray-300',
                };
                return (
                  <div key={item.id} className="flex">
                    <span className={`w-0.75 shrink-0 self-stretch ${barColors[item.status]}`} />
                    <div className="flex-1 min-w-0 px-3 py-3">
                      <div className="flex items-start gap-3 mb-2">
                        <p className="flex-1 min-w-0 font-semibold text-gray-800 text-sm leading-snug">{item.description}</p>
                        <span className="shrink-0 font-bold text-sm tabular-nums text-gray-800">{formatCurrency(item.expectedAmount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={item.status} />
                        <span className={`text-xs shrink-0 ${isLate || item.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {formatDateOnly(item.expectedDate)}
                        </span>
                        <span className="flex-1" />
                        {canEdit && (
                          <div className="flex gap-0.5 -mr-1">
                            {(item.status === 'Pending' || item.status === 'Overdue') && (
                              <Button variant="ghost" size="icon-sm" onClick={() => openReceive(item)} className="text-emerald-500 hover:text-emerald-700 h-7 w-7">
                                <Wallet size={12} />
                              </Button>
                            )}
                            {item.status !== 'Cancelled' && item.status !== 'Received' && (
                              <Button variant="ghost" size="icon-sm" onClick={() => setCancellingId(item.id)} className="text-gray-300 hover:text-red-600 h-7 w-7">
                                <XCircle size={12} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {item.receivedAmount != null && item.receivedDate && (
                        <p className="text-xs text-emerald-600 mt-1.5">
                          Recebido {formatCurrency(item.receivedAmount)} em {formatDateOnly(item.receivedDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-50 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-400">Descrição</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 hidden lg:table-cell">Unidade</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400">Data Prevista</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400 text-right">Valor Previsto</TableHead>
                    <TableHead className="text-xs font-medium text-gray-400">Status</TableHead>
                    {canEdit && <TableHead className="text-xs font-medium text-gray-400 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map(item => {
                    const isLate = item.status === 'Pending' && item.expectedDate < today;
                    return (
                      <TableRow key={item.id} className="hover:bg-gray-50/70 border-gray-50">
                        <TableCell className="py-3.5">
                          <div className="font-medium text-gray-800 text-sm">{item.description}</div>
                          {item.receivedAmount && item.receivedDate && (
                            <div className="text-xs text-emerald-600 mt-0.5">
                              Recebido {formatCurrency(item.receivedAmount)} em {formatDateOnly(item.receivedDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600 py-3.5">{item.categoryName}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-600 py-3.5">{item.unitName}</TableCell>
                        <TableCell className={`text-sm font-medium whitespace-nowrap py-3.5 ${isLate || item.status === 'Overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDateOnly(item.expectedDate)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-gray-800 whitespace-nowrap tabular-nums py-3.5">
                          {formatCurrency(item.expectedAmount)}
                        </TableCell>
                        <TableCell className="py-3.5"><StatusBadge status={item.status} /></TableCell>
                        {canEdit && (
                          <TableCell className="text-right py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              {(item.status === 'Pending' || item.status === 'Overdue') && (
                                <Button
                                  variant="ghost" size="icon-sm" title="Registrar Recebimento"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => openReceive(item)}
                                >
                                  <Wallet size={13} />
                                </Button>
                              )}
                              {item.status !== 'Cancelled' && item.status !== 'Received' && (
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
          </>
        )}
      </div>

      {/* Confirm cancel */}
      <ConfirmDialog
        open={!!cancellingId}
        title="Cancelar recebimento?"
        description="O recebimento será marcado como cancelado e não poderá ser reaberto."
        confirmLabel="Cancelar recebimento"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => cancellingId && cancelMutation.mutate(cancellingId)}
        onClose={() => setCancellingId(null)}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Recebimento Previsto</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))}>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <FormField label="Descrição" required error={createForm.formState.errors.description?.message}>
                  <Input placeholder="Ex: Repasse iFood" {...createForm.register('description')} />
                </FormField>
              </div>
              <FormField label="Valor Previsto (R$)" required error={createForm.formState.errors.expectedAmount?.message}>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...createForm.register('expectedAmount')} />
              </FormField>
              <FormField label="Data Prevista" required error={createForm.formState.errors.expectedDate?.message}>
                <Input type="date" {...createForm.register('expectedDate')} />
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
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
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
                {createMutation.isPending ? 'Salvando...' : 'Criar Recebimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!receivingItem} onOpenChange={open => { if (!open) setReceivingItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar Recebimento</DialogTitle></DialogHeader>
          {receivingItem && (
            <div className="mb-1 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">{receivingItem.description}</p>
              <p className="text-gray-500 text-xs mt-0.5">Valor previsto: <span className="font-bold tabular-nums">{formatCurrency(receivingItem.expectedAmount)}</span></p>
            </div>
          )}
          <form onSubmit={receiveForm.handleSubmit(data => receivingItem && receiveMutation.mutate({ id: receivingItem.id, data }))}>
            <div className="space-y-4 py-1">
              <FormField label="Valor Recebido (R$)" required error={receiveForm.formState.errors.receivedAmount?.message}>
                <Input type="number" step="0.01" min="0.01" {...receiveForm.register('receivedAmount')} />
              </FormField>
              <FormField label="Data do Recebimento" required error={receiveForm.formState.errors.receivedDate?.message}>
                <Input type="date" {...receiveForm.register('receivedDate')} />
              </FormField>
              {receiveMutation.error && <p className="text-xs text-red-600">{(receiveMutation.error as Error).message}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setReceivingItem(null)}>Cancelar</Button>
              <Button type="submit" disabled={receiveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {receiveMutation.isPending ? 'Registrando...' : 'Confirmar Recebimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

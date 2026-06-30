import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cashFlowApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import { formatCurrency } from '../../lib/utils';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labels: Record<string, string> = {
    revenue: 'Receitas',
    expenses: 'Despesas',
    runningBalance: 'Saldo Acum.',
  };
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3.5 text-sm min-w-44">
      <p className="font-semibold text-gray-700 mb-2.5 text-xs uppercase tracking-wide">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-5 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 text-xs">{labels[p.name] ?? p.name}</span>
          </div>
          <span className="font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function FluxoCaixa() {
  const { selectedUnitId } = useUnit();
  const [from, setFrom] = useState(daysAgoStr(29));
  const [to,   setTo]   = useState(todayStr());

  const { data, isLoading, error } = useQuery({
    queryKey: ['cashflow', selectedUnitId, from, to],
    queryFn: () => cashFlowApi.get({ unitId: selectedUnitId, from, to }),
    enabled: !!from && !!to,
  });

  const totalDays = data?.points.length ?? 0;
  const step = totalDays > 20 ? Math.ceil(totalDays / 15) : 1;

  const chartData = data?.points.map((p, i) => ({
    ...p,
    label: i % step === 0 ? p.label : '',
  }));

  const balancePositive = (data?.netBalance ?? 0) >= 0;

  return (
    <motion.div className="space-y-5" variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="Entradas e saídas diárias no período"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="space-y-0.5">
              <Label className="text-xs text-gray-500">De</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-8 text-sm bg-white" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-gray-500">Até</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-8 text-sm bg-white" />
            </div>
          </div>
        }
      />

      {/* KPI Cards */}
      {(data || isLoading) && (
        <>
          {/* Mobile KPIs */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Total Entradas</p>
              <p className="text-lg font-black tabular-nums text-blue-700">{isLoading ? '...' : formatCurrency(data?.totalRevenue ?? 0)}</p>
            </div>
            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-800">Total Saídas</p>
              <p className="text-lg font-black tabular-nums text-red-900">{isLoading ? '...' : formatCurrency(data?.totalExpenses ?? 0)}</p>
            </div>
            <div className={`flex items-center justify-between border rounded-xl px-4 py-3 ${balancePositive ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${balancePositive ? 'text-amber-600' : 'text-red-700'}`}>Saldo Líquido</p>
              <p className={`text-lg font-black tabular-nums ${balancePositive ? 'text-amber-700' : 'text-red-700'}`}>{isLoading ? '...' : formatCurrency(data?.netBalance ?? 0)}</p>
            </div>
          </div>

          {/* Desktop KPI Cards */}
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="hidden sm:grid grid-cols-3 gap-3">
            <StatCard
              label="Total Entradas"
              value={isLoading ? '...' : formatCurrency(data?.totalRevenue ?? 0)}
              icon={<TrendingUp size={15} />}
              variant="blue"
            />
            <StatCard
              label="Total Saídas"
              value={isLoading ? '...' : formatCurrency(data?.totalExpenses ?? 0)}
              icon={<TrendingDown size={15} />}
              variant="bordeaux"
            />
            <StatCard
              label="Saldo Líquido"
              value={isLoading ? '...' : formatCurrency(data?.netBalance ?? 0)}
              icon={<Wallet size={15} />}
              variant={balancePositive ? 'gold' : 'bordeaux'}
            />
          </motion.div>
        </>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-brand-navy">Entradas × Saídas × Saldo Acumulado</h2>
          <p className="text-xs text-gray-400 mt-0.5">Barras diárias + linha de saldo acumulado</p>
        </div>

        {isLoading && (
          <div className="h-72 flex items-center justify-center">
            <div className="skeleton w-full h-full rounded-lg" />
          </div>
        )}

        {error && (
          <EmptyState
            icon={<TrendingUp size={22} strokeWidth={1.5} />}
            title="Erro ao carregar o fluxo de caixa"
            description={(error as Error).message}
            className="h-72"
          />
        )}

        {data && data.points.length === 0 && !isLoading && (
          <EmptyState
            icon={<TrendingUp size={22} strokeWidth={1.5} />}
            title="Sem lançamentos no período"
            description="Selecione um período com lançamentos para visualizar o gráfico"
            className="h-72"
          />
        )}

        {data && data.points.length > 0 && (
          <>
            {/* Mobile chart — eixo Y único, todas as séries visíveis */}
            <div className="sm:hidden h-56" aria-label="Gráfico de fluxo de caixa">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 0" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize: 9, paddingTop: 6 }} formatter={(v: string) => ({ revenue: 'Receitas', expenses: 'Despesas', runningBalance: 'Saldo Acum.' }[v] ?? v)} />
                  <Bar dataKey="revenue"  name="revenue"  fill="#3b91d1" radius={[2,2,0,0]} maxBarSize={10} />
                  <Bar dataKey="expenses" name="expenses" fill="#441114" radius={[2,2,0,0]} maxBarSize={10} />
                  <Line type="monotone" dataKey="runningBalance" name="runningBalance" stroke="#fbc654" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#fbc654', strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Desktop chart — duplo eixo Y, inalterado */}
            <div className="hidden sm:block h-72" aria-label="Gráfico de fluxo de caixa diário">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 0" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis yAxisId="bar" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                  <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v: string) => ({ revenue: 'Receitas', expenses: 'Despesas', runningBalance: 'Saldo Acum.' }[v] ?? v)} />
                  <Bar yAxisId="bar" dataKey="revenue"  name="revenue"  fill="#3b91d1" radius={[2,2,0,0]} maxBarSize={16} />
                  <Bar yAxisId="bar" dataKey="expenses" name="expenses" fill="#441114" radius={[2,2,0,0]} maxBarSize={16} />
                  <Line yAxisId="line" type="monotone" dataKey="runningBalance" name="runningBalance" stroke="#fbc654" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#fbc654', strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Daily table */}
      {data && data.points.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-brand-navy">Detalhe por Dia</h2>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-50">
            {data.points.filter(p => p.revenue > 0 || p.expenses > 0).map(p => (
              <div key={p.date} className="px-4 py-3">
                {/* Row 1: data + saldo acumulado */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{p.date.split('-').reverse().join('/')}</span>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Saldo Acum.</p>
                    <p className={`text-sm font-black tabular-nums leading-none ${p.runningBalance >= 0 ? 'text-brand-navy' : 'text-red-600'}`}>
                      {formatCurrency(p.runningBalance)}
                    </p>
                  </div>
                </div>
                {/* Row 2: entradas, saídas e saldo do dia */}
                <div className="flex items-center gap-2 flex-wrap">
                  {p.revenue > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#3b91d1] shrink-0" />
                      <span className="text-xs font-semibold text-emerald-700 tabular-nums">{formatCurrency(p.revenue)}</span>
                    </div>
                  )}
                  {p.expenses > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#441114] shrink-0" />
                      <span className="text-xs font-semibold text-red-700 tabular-nums">{formatCurrency(p.expenses)}</span>
                    </div>
                  )}
                  <span className="flex-1" />
                  <span className={`text-xs font-bold tabular-nums ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Dia {p.balance >= 0 ? '+' : ''}{formatCurrency(p.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Data</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">Entradas</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">Saídas</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">Saldo Dia</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400">Saldo Acum.</th>
                </tr>
              </thead>
              <tbody>
                {data.points.filter(p => p.revenue > 0 || p.expenses > 0).map(p => (
                  <tr key={p.date} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{p.date.split('-').reverse().join('/')}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                      {p.revenue > 0 ? formatCurrency(p.revenue) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-700 tabular-nums">
                      {p.expenses > 0 ? formatCurrency(p.expenses) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${p.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(p.balance)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${p.runningBalance >= 0 ? 'text-brand-navy' : 'text-brand-bordeaux'}`}>
                      {formatCurrency(p.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

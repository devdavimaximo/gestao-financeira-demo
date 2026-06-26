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
        <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3">
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
          <div className="h-72" aria-label="Gráfico de fluxo de caixa diário">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 0" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis yAxisId="bar" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => ({ revenue: 'Receitas', expenses: 'Despesas', runningBalance: 'Saldo Acum.' }[v] ?? v)} />
                <Bar yAxisId="bar" dataKey="revenue"  name="revenue"  fill="#3b91d1" radius={[2,2,0,0]} maxBarSize={16} />
                <Bar yAxisId="bar" dataKey="expenses" name="expenses" fill="#441114" radius={[2,2,0,0]} maxBarSize={16} />
                <Line yAxisId="line" type="monotone" dataKey="runningBalance" name="runningBalance" stroke="#fbc654" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#fbc654', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily table */}
      {data && data.points.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-brand-navy">Detalhe por Dia</h2>
          </div>
          <div className="overflow-x-auto">
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

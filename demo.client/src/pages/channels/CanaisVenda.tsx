import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer } from '../../lib/motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { channelsApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import { formatCurrency } from '../../lib/utils';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import EmptyState from '../../components/shared/EmptyState';

const CHANNEL_COLORS: Record<string, string> = {
  'Balcão':      '#0f2860',
  'Delivery':    '#3b91d1',
  'iFood':       '#f78802',
  'Zé Delivery': '#441114',
};
const FALLBACK_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899'];

function colorFor(name: string, idx: number) {
  return CHANNEL_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function ChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { channelName: string; count: number; percentage: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3.5 text-sm min-w-44">
      <p className="font-semibold text-gray-800 mb-1.5 text-xs uppercase tracking-wide">{d.payload.channelName}</p>
      <p className="text-gray-600 text-xs">Receita: <span className="font-bold text-brand-navy tabular-nums">{formatCurrency(d.value)}</span></p>
      <p className="text-gray-400 text-xs mt-0.5">{d.payload.count} lançamentos · {d.payload.percentage}%</p>
    </div>
  );
}

function PieLabel({ cx, cy, midAngle, outerRadius, name, percentage }: {
  cx: number; cy: number; midAngle: number; outerRadius: number;
  name: string; percentage: number;
}) {
  if (percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fill="#374151">
      {name} ({percentage}%)
    </text>
  );
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstDayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function CanaisVenda() {
  const { selectedUnitId } = useUnit();
  const [from, setFrom] = useState(firstDayStr());
  const [to,   setTo]   = useState(todayStr());

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['channels', selectedUnitId, from, to],
    queryFn: () => channelsApi.get({ unitId: selectedUnitId, from, to }),
    enabled: !!from && !!to,
  });

  const totalRevenue = data.reduce((s, c) => s + c.amount, 0);
  const totalCount   = data.reduce((s, c) => s + c.count, 0);

  return (
    <motion.div className="space-y-5" variants={pageVariants} initial="initial" animate="animate">
      <PageHeader
        title="Canais de Venda"
        subtitle="Receitas por canal no período"
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

      {isLoading && (
        <div className="space-y-4">
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="skeleton h-3 w-24 rounded mb-3" />
                <div className="skeleton h-7 w-32 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="skeleton h-64 rounded-lg" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
          icon={<BarChart3 size={22} strokeWidth={1.5} />}
          title="Erro ao carregar canais"
          description={(error as Error).message}
        />
      )}

      {!isLoading && !error && data.length === 0 && (
        <EmptyState
          icon={<BarChart3 size={22} strokeWidth={1.5} />}
          title="Nenhuma receita com canal de venda"
          description="Verifique se os lançamentos possuem canal de venda vinculado no período selecionado"
        />
      )}

      {data.length > 0 && (
        <>
          {/* Mobile KPIs */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-navy">Total Receitas</p>
              <p className="text-lg font-black tabular-nums text-brand-navy">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Canais Ativos</p>
              <p className="text-lg font-black tabular-nums text-blue-700">{data.length}</p>
            </div>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lançamentos</p>
              <p className="text-lg font-black tabular-nums text-gray-700">{totalCount}</p>
            </div>
          </div>

          {/* Desktop KPI Summary */}
          <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="hidden sm:grid grid-cols-3 gap-3">
            <StatCard
              label="Total Receitas"
              value={formatCurrency(totalRevenue)}
              variant="navy"
            />
            <StatCard
              label="Canais Ativos"
              value={String(data.length)}
              variant="blue"
            />
            <StatCard
              label="Lançamentos"
              value={String(totalCount)}
              variant="default"
            />
          </motion.div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-brand-navy">Receita por Canal</h2>
                <p className="text-xs text-gray-400 mt-0.5">Comparativo de receita entre canais</p>
              </div>
              <div className="h-64" aria-label="Gráfico de barras por canal de venda">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 0" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="channelName" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="amount" name="Receita" radius={[4,4,0,0]} maxBarSize={56}>
                      {data.map((d, i) => <Cell key={d.channelName} fill={colorFor(d.channelName, i)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-brand-navy">Participação</h2>
                <p className="text-xs text-gray-400 mt-0.5">% do total de receitas</p>
              </div>
              <div className="h-64" aria-label="Gráfico de pizza de participação por canal">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="amount"
                      nameKey="channelName"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={<PieLabel cx={0} cy={0} midAngle={0} outerRadius={80} name="" percentage={0} />}
                      labelLine={false}
                    >
                      {data.map((d, i) => <Cell key={d.channelName} fill={colorFor(d.channelName, i)} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(_v, entry) => (entry.payload as { channelName: string }).channelName} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-brand-navy">Detalhamento por Canal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Canal</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Receita</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Lançamentos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Participação</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 w-40">Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c, i) => (
                    <tr key={c.channelName} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(c.channelName, i) }} />
                          <span className="font-medium text-gray-800">{c.channelName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-brand-navy tabular-nums">{formatCurrency(c.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{c.count}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700 tabular-nums">{c.percentage}%</td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${c.percentage}%`, backgroundColor: colorFor(c.channelName, i) }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

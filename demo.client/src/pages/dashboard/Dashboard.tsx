import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Bell,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import { formatCurrency, MONTH_NAMES } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import EmptyState from '../../components/shared/EmptyState';
import AnimatedNumber from '../../components/shared/AnimatedNumber';
import MotionCard from '../../components/shared/MotionCard';
import { staggerContainer, cardVariants, heroVariants, headerVariants } from '../../lib/motion';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-[1fr_112px] gap-4">
        <div className="h-36 bg-gray-200 rounded-2xl" />
        <div className="h-36 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { revenue: 'Receitas', expenses: 'Despesas' };
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3.5 min-w-40">
      <p className="font-bold text-[10px] text-gray-400 uppercase tracking-widest mb-2.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-5 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 text-xs">{labelMap[p.name] ?? p.name}</span>
          </div>
          <span className="font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Category bar ─────────────────────────────────────────────────────────────

function CategoryBar({ name, amount, total, color }: {
  name: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-600 truncate max-w-[55%]">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 tabular-nums">{pct.toFixed(0)}%</span>
          <span className="text-xs font-bold text-gray-700 tabular-nums">{formatCurrency(amount)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <MotionCard noHover>
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className ?? ''}`}>
        <div className="mb-4">
          <h2 className="text-sm font-bold text-brand-navy dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </MotionCard>
  );
}

// ── Hero sparkline (derived from monthly chart) ───────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-8 mt-3">
      {data.map((v, i) => (
        <motion.div
          key={i}
          className={i === data.length - 1 ? 'bg-brand-gold flex-1 rounded-t-sm' : 'bg-brand-gold/30 flex-1 rounded-t-sm'}
          style={{ height: `${max > 0 ? (v / max) * 100 : 0}%` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 18,
            delay: 0.1 + i * 0.04,
          }}
          style={{ height: `${max > 0 ? (v / max) * 100 : 0}%`, transformOrigin: 'bottom' } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { selectedUnitId } = useUnit();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedUnitId, month, year],
    queryFn: () => dashboardApi.get({ unitId: selectedUnitId, month, year }),
  });

  const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
  const periodLabel = `${MONTH_NAMES[month - 1]}/${year}`;
  const balancePositive = data ? data.kpis.balance >= 0 : true;

  const fmtBRL = useCallback(
    (v: number) => formatCurrency(v),
    [],
  );
  const fmtK = useCallback(
    (v: number) => `R$${(v / 1000).toFixed(1).replace('.', ',')}k`,
    [],
  );
  const fmtInt = useCallback((v: number) => String(Math.round(v)), []);

  const sparkData = data?.monthlyChart.map(p => p.revenue) ?? [];

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200/70"
      >
        <div>
          <h1 className="text-[19px] font-black tracking-tight text-brand-navy leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">
            Visão consolidada · {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-34 bg-white h-9 text-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-white h-9 text-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {isLoading && <DashboardSkeleton />}

      {/* ── Error ── */}
      {error && !isLoading && (
        <EmptyState
          icon={<TrendingDown size={24} strokeWidth={1.5} />}
          title="Não foi possível carregar o dashboard"
          description={(error as Error).message}
        />
      )}

      {/* ── Content ── */}
      {data && !isLoading && (
        <motion.div
          variants={staggerContainer(0.065)}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >

          {/* ── Row 1: Hero + Alertas ── */}
          <div className="grid grid-cols-[1fr_112px] gap-4">

            {/* Hero — Saldo */}
            <motion.div
              variants={heroVariants}
              className="relative bg-brand-navy rounded-2xl p-5 overflow-hidden cursor-default"
              whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(15,40,96,0.35)' }}
              transition={{ duration: 0.15 }}
            >
              {/* Sheen sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
              />
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-1.5">
                Saldo do Período
              </p>
              <div className="text-[38px] font-black text-brand-gold leading-none tabular-nums tracking-tight">
                <AnimatedNumber value={data.kpis.balance} format={fmtBRL} duration={950} />
              </div>
              <p className="text-[11px] text-brand-gold/50 mt-1.5">
                {balancePositive
                  ? <><span className="text-green-400 font-bold">↑</span> resultado positivo no período</>
                  : <><span className="text-red-400 font-bold">↓</span> resultado negativo no período</>
                }
              </p>
              <Sparkline data={sparkData} />
            </motion.div>

            {/* Alertas */}
            <motion.div
              variants={cardVariants}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center text-center cursor-default"
              whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }}
              transition={{ duration: 0.15 }}
            >
              <div className="text-[38px] font-black text-red-600 leading-none tabular-nums">
                <AnimatedNumber value={data.kpis.unreadAlerts} format={fmtInt} duration={600} />
              </div>
              <p className="text-[10px] font-bold text-red-500 mt-1.5 uppercase tracking-wide">alertas</p>
              {data.kpis.unreadAlerts > 0 && (
                <p className="text-[9px] text-gray-400 mt-1">requer atenção</p>
              )}
            </motion.div>
          </div>

          {/* ── Row 2: KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-emerald-50 border border-emerald-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Receitas</p>
                    <p className="text-3xl font-black tabular-nums mt-2 leading-none tracking-tight text-emerald-700">
                      <AnimatedNumber value={data.kpis.totalRevenue} format={fmtBRL} />
                    </p>
                    <p className="text-xs mt-2 font-medium text-emerald-500/80">{periodLabel}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-red-50 border border-red-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Despesas</p>
                    <p className="text-3xl font-black tabular-nums mt-2 leading-none tracking-tight text-red-700">
                      <AnimatedNumber value={data.kpis.totalExpenses} format={fmtBRL} />
                    </p>
                    <p className="text-xs mt-2 font-medium text-red-400/80">{periodLabel}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-100 text-red-500">
                    <TrendingDown size={18} />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-amber-50 border border-amber-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">A Pagar</p>
                    <p className="text-3xl font-black tabular-nums mt-2 leading-none tracking-tight text-amber-700">
                      <AnimatedNumber value={data.kpis.pendingPayables} format={fmtBRL} />
                    </p>
                    <p className="text-xs mt-2 font-medium text-amber-500/80">pendente</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                    <AlertTriangle size={18} />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-blue-50 border border-blue-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">A Receber</p>
                    <p className="text-3xl font-black tabular-nums mt-2 leading-none tracking-tight text-brand-blue">
                      <AnimatedNumber value={data.kpis.pendingReceivables} format={fmtBRL} />
                    </p>
                    <p className="text-xs mt-2 font-medium text-blue-400/80">previsto</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-brand-blue">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Row 3: Chart ── */}
          <SectionCard
            title="Histórico — Últimos 6 Meses"
            subtitle="Receitas vs Despesas"
          >
            <div className="h-60" aria-label="Gráfico de receitas e despesas dos últimos 6 meses">
              {data.monthlyChart.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp size={22} strokeWidth={1.5} />}
                  title="Sem dados no histórico"
                  description="Os lançamentos dos últimos meses aparecerão aqui"
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 0" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="revenue" name="revenue" fill="#3b91d1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="expenses" name="expenses" fill="#ef4444" opacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue shrink-0" />
                Receitas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                Despesas
              </div>
            </div>
          </SectionCard>

          {/* ── Row 4: Top categories ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Top Despesas por Categoria" subtitle={periodLabel}>
              {data.topExpenses.length === 0 ? (
                <EmptyState icon={<TrendingDown size={20} strokeWidth={1.5} />} title="Sem despesas no período" className="py-6" />
              ) : (
                <div className="space-y-4">
                  {data.topExpenses.map(cat => (
                    <CategoryBar key={cat.name} name={cat.name} amount={cat.amount} total={data.kpis.totalExpenses} color="#ef4444" />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top Receitas por Categoria" subtitle={periodLabel}>
              {data.topRevenues.length === 0 ? (
                <EmptyState icon={<TrendingUp size={20} strokeWidth={1.5} />} title="Sem receitas no período" className="py-6" />
              ) : (
                <div className="space-y-4">
                  {data.topRevenues.map(cat => (
                    <CategoryBar key={cat.name} name={cat.name} amount={cat.amount} total={data.kpis.totalRevenue} color="#3b91d1" />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

        </motion.div>
      )}
    </div>
  );
}

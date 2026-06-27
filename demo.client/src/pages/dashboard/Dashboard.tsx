import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Bell, AlertTriangle,
  ArrowUpRight, CheckCircle2, Activity, Percent,
  MoreHorizontal, ChevronRight, PlusCircle, FileText,
  Download, BarChart3, Receipt,
} from 'lucide-react';
import { dashboardApi, entriesApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import { formatCurrency, formatDateOnly, MONTH_NAMES, cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import EmptyState from '../../components/shared/EmptyState';
import AnimatedNumber from '../../components/shared/AnimatedNumber';
import MotionCard from '../../components/shared/MotionCard';
import { staggerContainer, cardVariants, heroVariants, headerVariants } from '../../lib/motion';
import type { LucideIcon } from 'lucide-react';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-[1fr_160px] gap-4">
        <div className="h-44 bg-gray-200 rounded-2xl" />
        <div className="h-44 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 h-72 bg-gray-200 rounded-2xl" />
        <div className="col-span-2 h-72 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-44 bg-gray-200 rounded-2xl" />
        <div className="h-44 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Hero line chart ───────────────────────────────────────────────────────────

function HeroLineChart({ data }: { data: { v: number }[] }) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbc654" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#fbc654" stopOpacity={0} />
          </linearGradient>
          <filter id="heroGlow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#fbc654"
          strokeWidth={2.5}
          fill="url(#heroGrad)"
          dot={false}
          filter="url(#heroGlow)"
          isAnimationActive
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Custom bar chart tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { revenue: 'Receitas', expenses: 'Despesas' };
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3.5 min-w-44">
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

// ── Resumo item ───────────────────────────────────────────────────────────────

function ResumoItem({ icon: Icon, label, value, iconBg, iconColor, last = false }: {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3 py-3', !last && 'border-b border-gray-50')}>
      <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>
      <span className="flex-1 text-sm text-gray-600 truncate">{label}</span>
      <span className="font-bold text-sm text-gray-800 tabular-nums shrink-0">{value}</span>
      <ChevronRight size={14} className="text-gray-300 shrink-0" />
    </div>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, href, iconBg, iconColor }: {
  icon: LucideIcon;
  label: string;
  href: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link
      to={href}
      onClick={href === '#' ? (e) => e.preventDefault() : undefined}
      className="flex flex-col items-center gap-2 group"
    >
      <div className={cn(
        'size-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95',
        iconBg,
      )}>
        <Icon size={22} className={iconColor} />
      </div>
      <span className="text-xs text-gray-500 text-center leading-tight max-w-16 group-hover:text-gray-700 transition-colors">
        {label}
      </span>
    </Link>
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

  const { data: recentEntries } = useQuery({
    queryKey: ['recent-entries', selectedUnitId],
    queryFn: () => entriesApi.getAll({ unitId: selectedUnitId }),
    select: (entries) => [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
  });

  const years = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
  const periodLabel = `${MONTH_NAMES[month - 1]}/${year}`;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriodLabel = `${MONTH_NAMES[prevMonth - 1]}/${prevYear}`;

  const fmtBRL = useCallback((v: number) => formatCurrency(v), []);
  const fmtInt = useCallback((v: number) => String(Math.round(v)), []);

  // Monthly trend calculations from chart history
  const monthlyChart = data?.monthlyChart ?? [];
  const chartLen = monthlyChart.length;
  const currentRev = chartLen > 0 ? monthlyChart[chartLen - 1].revenue : 0;
  const prevRev = chartLen > 1 ? monthlyChart[chartLen - 2].revenue : 0;
  const revTrend = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null;

  const currentExp = chartLen > 0 ? monthlyChart[chartLen - 1].expenses : 0;
  const prevExp = chartLen > 1 ? monthlyChart[chartLen - 2].expenses : 0;
  const expTrend = prevExp > 0 ? ((currentExp - prevExp) / prevExp) * 100 : null;

  // Resumo do período derived metrics
  const daysInMonth = new Date(year, month, 0).getDate();
  const avgDailyRevenue = data ? data.kpis.totalRevenue / daysInMonth : 0;
  const expenseRatio = data && data.kpis.totalRevenue > 0
    ? (data.kpis.totalExpenses / data.kpis.totalRevenue) * 100
    : 0;
  const avgTicket = data && data.kpis.totalRevenue > 0 ? data.kpis.totalRevenue / 30 : 0;

  // Cumulative revenue so the line always trends upward (like the reference)
  const heroChartData = monthlyChart.reduce<{ v: number }[]>((acc, p, i) => {
    acc.push({ v: (i === 0 ? 0 : acc[i - 1].v) + p.revenue });
    return acc;
  }, []);

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
          <h1 className="text-[22px] font-black tracking-tight text-brand-navy leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">
            Visão consolidada • {periodLabel}
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
          <Link
            to="/alertas"
            aria-label="Alertas"
            className="relative w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-navy hover:border-gray-300 transition-colors shadow-sm"
          >
            <Bell size={16} />
            {(data?.kpis.unreadAlerts ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                {data!.kpis.unreadAlerts > 99 ? '99+' : data!.kpis.unreadAlerts}
              </span>
            )}
          </Link>
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
          <div className="grid grid-cols-[1fr_160px] gap-4">

            {/* Hero — Saldo do Período */}
            <motion.div
              variants={heroVariants}
              className="relative rounded-2xl overflow-hidden cursor-default"
              style={{ background: 'linear-gradient(135deg, #091d3e 0%, #0d2348 60%, #112a56 100%)' }}
              whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(9,29,62,0.55)' }}
              transition={{ duration: 0.15 }}
            >
              {/* Strong blue radial accent */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(59,145,209,0.38) 0%, rgba(59,145,209,0.12) 45%, transparent 70%)' }}
              />
              {/* Sheen sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
              />

              <div className="relative px-6 pt-5 pb-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30 mb-2">
                  Saldo do Período
                </p>
                <div className="text-[40px] font-black text-white leading-none tabular-nums tracking-tight">
                  <AnimatedNumber value={data.kpis.balance} format={fmtBRL} duration={950} />
                </div>
                <p className="text-[11px] mt-2 font-medium flex items-center gap-1.5">
                  {revTrend !== null ? (
                    revTrend >= 0 ? (
                      <>
                        <span className="text-emerald-400 font-bold">↑ {revTrend.toFixed(1)}%</span>
                        <span className="text-white/35">vs. {prevPeriodLabel}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-bold">↓ {Math.abs(revTrend).toFixed(1)}%</span>
                        <span className="text-white/35">vs. {prevPeriodLabel}</span>
                      </>
                    )
                  ) : (
                    <span className="text-white/35">{periodLabel}</span>
                  )}
                </p>
              </div>

              {/* Glowing line chart fills card bottom */}
              <div className="relative mt-1">
                <HeroLineChart data={heroChartData} />
              </div>
            </motion.div>

            {/* Alertas */}
            <motion.div
              variants={cardVariants}
              className="rounded-2xl border border-white/[0.07] flex flex-col items-center justify-center text-center cursor-default gap-2 px-4 py-5"
              style={{ background: 'linear-gradient(160deg, #0a1c3e 0%, #0d2045 100%)' }}
              whileHover={{ y: -3, boxShadow: '0 10px 32px rgba(0,0,0,0.35)' }}
              transition={{ duration: 0.15 }}
            >
              {/* Bell circle */}
              <div className="size-[52px] rounded-full border border-white/20 bg-white/[0.04] flex items-center justify-center">
                <Bell size={20} className="text-white/75" strokeWidth={1.5} />
              </div>
              {/* Count */}
              <div className="text-[42px] font-black text-white leading-none tabular-nums -mt-0.5">
                <AnimatedNumber value={data.kpis.unreadAlerts} format={fmtInt} duration={600} />
              </div>
              <p className="text-[9px] font-bold text-white/35 uppercase tracking-[0.18em] -mt-1">Alertas</p>
              {data.kpis.unreadAlerts === 0 ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Tudo em ordem</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <AlertTriangle size={11} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-medium">Verifique agora</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Row 2: KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Receitas */}
            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Receitas</p>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-[28px] font-black tabular-nums leading-none tracking-tight text-emerald-700">
                  <AnimatedNumber value={data.kpis.totalRevenue} format={fmtBRL} />
                </p>
                {revTrend !== null ? (
                  <p className="text-xs mt-2 flex items-center gap-1">
                    <span className={revTrend >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                      {revTrend >= 0 ? '↑' : '↓'} {Math.abs(revTrend).toFixed(1)}%
                    </span>
                    <span className="text-gray-400">vs. {prevPeriodLabel}</span>
                  </p>
                ) : (
                  <p className="text-xs mt-2 text-gray-400">{periodLabel}</p>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500" />
              </div>
            </motion.div>

            {/* Despesas */}
            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Despesas</p>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-red-100 text-red-500">
                    <TrendingDown size={16} />
                  </div>
                </div>
                <p className="text-[28px] font-black tabular-nums leading-none tracking-tight text-red-700">
                  <AnimatedNumber value={data.kpis.totalExpenses} format={fmtBRL} />
                </p>
                {expTrend !== null ? (
                  <p className="text-xs mt-2 flex items-center gap-1">
                    <span className={expTrend <= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                      {expTrend >= 0 ? '↑' : '↓'} {Math.abs(expTrend).toFixed(1)}%
                    </span>
                    <span className="text-gray-400">vs. {prevPeriodLabel}</span>
                  </p>
                ) : (
                  <p className="text-xs mt-2 text-gray-400">{periodLabel}</p>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-red-500" />
              </div>
            </motion.div>

            {/* A Pagar */}
            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">A Pagar</p>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <p className="text-[28px] font-black tabular-nums leading-none tracking-tight text-amber-700">
                  <AnimatedNumber value={data.kpis.pendingPayables} format={fmtBRL} />
                </p>
                <p className="text-xs mt-2 text-amber-500/80 font-medium">títulos pendentes</p>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-500" />
              </div>
            </motion.div>

            {/* A Receber */}
            <motion.div variants={cardVariants} whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }} transition={{ duration: 0.15 }} className="cursor-default">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">A Receber</p>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-brand-blue">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <p className="text-[28px] font-black tabular-nums leading-none tracking-tight text-brand-blue">
                  <AnimatedNumber value={data.kpis.pendingReceivables} format={fmtBRL} />
                </p>
                <p className="text-xs mt-2 text-blue-400/80 font-medium">títulos previstos</p>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-blue" />
              </div>
            </motion.div>
          </div>

          {/* ── Row 3: Chart (3/5) + Resumo do Período (2/5) ── */}
          <div className="grid grid-cols-5 gap-4">

            {/* Bar chart */}
            <div className="col-span-3">
              <MotionCard noHover>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-brand-navy">Histórico — Últimos 6 Meses</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Receitas vs Despesas</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 select-none hover:bg-gray-50 transition-colors cursor-default">
                      Mensal
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-0.5" aria-hidden>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  <div className="h-56" aria-label="Gráfico de receitas e despesas dos últimos 6 meses">
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
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                          <Bar dataKey="revenue" name="revenue" fill="#3b91d1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="expenses" name="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
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
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      Despesas
                    </div>
                  </div>
                </div>
              </MotionCard>
            </div>

            {/* Resumo do período */}
            <div className="col-span-2">
              <MotionCard noHover>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-bold text-brand-navy">Resumo do período</h2>
                    <button className="text-gray-300 hover:text-gray-400 transition-colors" aria-label="Mais opções">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <ResumoItem
                    icon={TrendingUp}
                    label="Saldo operacional"
                    value={formatCurrency(data.kpis.balance)}
                    iconBg="bg-emerald-500"
                    iconColor="text-white"
                  />
                  <ResumoItem
                    icon={Activity}
                    label="Média diária de receita"
                    value={formatCurrency(avgDailyRevenue)}
                    iconBg="bg-blue-500"
                    iconColor="text-white"
                  />
                  <ResumoItem
                    icon={Percent}
                    label="% despesas / receitas"
                    value={`${expenseRatio.toFixed(1)}%`}
                    iconBg="bg-amber-500"
                    iconColor="text-white"
                  />
                  <ResumoItem
                    icon={Receipt}
                    label="Ticket médio"
                    value={formatCurrency(avgTicket)}
                    iconBg="bg-violet-500"
                    iconColor="text-white"
                    last
                  />
                </div>
              </MotionCard>
            </div>
          </div>

          {/* ── Row 4: Atalhos Rápidos + Atividade Recente ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Atalhos rápidos */}
            <MotionCard noHover>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-brand-navy mb-5">Atalhos rápidos</h2>
                <div className="flex items-start gap-5 flex-wrap">
                  <QuickAction icon={PlusCircle}   label="Novo lançamento"  href="/lancamentos"    iconBg="bg-emerald-500" iconColor="text-white" />
                  <QuickAction icon={FileText}      label="Emitir recibo"   href="#"               iconBg="bg-blue-500"    iconColor="text-white" />
                  <QuickAction icon={AlertTriangle} label="Contas a pagar"  href="/contas-pagar"   iconBg="bg-orange-500"  iconColor="text-white" />
                  <QuickAction icon={Download}      label="Contas a receber"href="/contas-receber" iconBg="bg-sky-500"     iconColor="text-white" />
                  <QuickAction icon={BarChart3}     label="Relatórios"      href="/fluxo-caixa"    iconBg="bg-violet-500"  iconColor="text-white" />
                </div>
              </div>
            </MotionCard>

            {/* Atividade recente */}
            <MotionCard noHover>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-brand-navy mb-3">Atividade recente</h2>
                {!recentEntries || recentEntries.length === 0 ? (
                  <EmptyState
                    icon={<Activity size={20} strokeWidth={1.5} />}
                    title="Sem atividades recentes"
                    className="py-4"
                  />
                ) : (
                  <div>
                    {recentEntries.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'flex items-center gap-3 py-2.5',
                          i < recentEntries.length - 1 && 'border-b border-gray-50',
                        )}
                      >
                        <span className={cn(
                          'size-2 rounded-full shrink-0',
                          entry.type === 'Revenue' ? 'bg-emerald-500' : 'bg-red-500',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{entry.description}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDateOnly(entry.date)}</p>
                        </div>
                        <span className={cn(
                          'text-xs font-bold tabular-nums shrink-0',
                          entry.type === 'Revenue' ? 'text-emerald-600' : 'text-red-600',
                        )}>
                          {entry.type === 'Revenue' ? '+' : '−'}{formatCurrency(entry.amount)}
                        </span>
                        <ChevronRight size={13} className="text-gray-200 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </MotionCard>
          </div>

        </motion.div>
      )}
    </div>
  );
}

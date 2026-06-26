import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../lib/motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { calendarApi } from '../../services/api';
import { useUnit } from '../../contexts/UnitContext';
import { formatCurrency, MONTH_NAMES } from '../../lib/utils';
import type { CalendarEvent } from '../../types';
import { Button } from '../../components/ui/button';
import PageHeader from '../../components/shared/PageHeader';
import EmptyState from '../../components/shared/EmptyState';

const EVENT_STYLES: Record<string, { dot: string; pill: string; label: string }> = {
  Payable:    { dot: 'bg-red-500',     pill: 'bg-red-50 border border-red-100 text-red-700',           label: 'A Pagar' },
  Receivable: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border border-emerald-100 text-emerald-700', label: 'A Receber' },
  Revenue:    { dot: 'bg-brand-blue',  pill: 'bg-blue-50 border border-blue-100 text-blue-700',         label: 'Receita' },
  Expense:    { dot: 'bg-brand-bordeaux', pill: 'bg-rose-50 border border-rose-100 text-rose-800',      label: 'Despesa' },
};

function EventPill({ event }: { event: CalendarEvent }) {
  const style = EVENT_STYLES[event.eventType] ?? EVENT_STYLES.Expense;
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function DayCell({
  day, events, isToday, isCurrentMonth, onSelect, selected,
}: {
  day: Date; events: CalendarEvent[]; isToday: boolean;
  isCurrentMonth: boolean; onSelect: (d: Date) => void; selected: boolean;
}) {
  const MAX_VISIBLE = 2;
  const visible  = events.slice(0, MAX_VISIBLE);
  const overflow = events.length - MAX_VISIBLE;

  return (
    <button
      onClick={() => onSelect(day)}
      className={[
        'min-h-20 sm:min-h-24 p-1.5 text-left rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue outline-none',
        selected        ? 'border-brand-blue bg-blue-50/60' : 'border-transparent hover:border-gray-100 hover:bg-gray-50/60',
        !isCurrentMonth ? 'opacity-30' : '',
      ].join(' ')}
    >
      <div className={[
        'w-6 h-6 text-xs font-semibold rounded-full flex items-center justify-center mb-1',
        isToday ? 'bg-brand-navy text-white' : 'text-gray-700',
      ].join(' ')}>
        {day.getDate()}
      </div>
      <div className="space-y-0.5">
        {visible.map(e => <EventPill key={e.id} event={e} />)}
        {overflow > 0 && <p className="text-[10px] text-gray-400 font-medium pl-1">+{overflow} mais</p>}
      </div>
    </button>
  );
}

function DayDetail({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={22} strokeWidth={1.5} />}
        title="Nenhum evento"
        description="Nenhum evento neste dia"
        className="py-8"
      />
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 capitalize mb-3">{label}</p>
      <div className="space-y-2">
        {events.map(e => {
          const style = EVENT_STYLES[e.eventType] ?? EVENT_STYLES.Expense;
          return (
            <div key={e.id} className={`p-3 rounded-lg ${style.pill}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{style.label}</span>
              </div>
              <p className="text-sm font-semibold leading-snug">{e.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs opacity-70">{e.unitName}</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(e.amount)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioFinanceiro() {
  const { selectedUnitId } = useUnit();
  const today = new Date();

  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  const month = viewDate.getMonth() + 1;
  const year  = viewDate.getFullYear();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['calendar', selectedUnitId, month, year],
    queryFn: () => calendarApi.get({ unitId: selectedUnitId, month, year }),
  });

  const grid = useMemo(() => {
    const firstDay     = new Date(year, month - 1, 1);
    const startOffset  = firstDay.getDay();
    const cells: Date[] = [];
    for (let i = -startOffset; i < 42 - startOffset; i++) {
      cells.push(new Date(year, month - 1, 1 + i));
    }
    return cells;
  }, [month, year]);

  function eventsForDay(d: Date) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return events.filter(e => e.date === iso);
  }

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <motion.div className="space-y-5" variants={pageVariants} initial="initial" animate="animate">
      <PageHeader title="Calendário Financeiro" subtitle="Vencimentos e recebimentos do mês" />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <button
              onClick={prevMonth}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="font-bold text-brand-navy text-sm">{MONTH_NAMES[month - 1]} {year}</p>
              {isLoading && <span className="text-xs text-gray-400">carregando...</span>}
              {error    && <span className="text-xs text-red-500">Erro ao carregar</span>}
            </div>
            <button
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-50 px-2 pt-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="min-h-20 rounded-lg skeleton" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<Calendar size={22} strokeWidth={1.5} />}
              title="Erro ao carregar calendário"
              description={(error as Error).message}
              className="h-64"
            />
          ) : (
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {grid.map((day, i) => (
                <DayCell
                  key={i}
                  day={day}
                  events={eventsForDay(day)}
                  isToday={day.toDateString() === today.toDateString()}
                  isCurrentMonth={day.getMonth() + 1 === month}
                  onSelect={setSelectedDay}
                  selected={selectedDay?.toDateString() === day.toDateString()}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-50 flex flex-wrap gap-3">
            {Object.entries(EVENT_STYLES).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel — selected day */}
        <div className="lg:w-72 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-navy">Detalhe do Dia</h2>
            <Button size="sm" variant="outline" onClick={goToday} className="h-7 text-xs px-2.5">Hoje</Button>
          </div>
          {selectedDay
            ? <DayDetail date={selectedDay} events={selectedEvents} />
            : <p className="text-sm text-gray-400 text-center py-8">Clique em um dia para ver detalhes</p>
          }
        </div>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { cardVariants, cardHover, cardTap } from '../../lib/motion';

export type StatVariant =
  | 'default'
  | 'navy'
  | 'bordeaux'
  | 'gold'
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'red';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  variant?: StatVariant;
  className?: string;
  /** When true, skips framer-motion (use inside already-animated containers) */
  static?: boolean;
}

const VARIANTS: Record<StatVariant, {
  card: string; label: string; value: string; sub: string; iconWrap: string;
}> = {
  default: {
    card:     'bg-white border border-gray-100 shadow-sm',
    label:    'text-gray-400',
    value:    'text-brand-navy dark:text-white',
    sub:      'text-gray-400',
    iconWrap: 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/70',
  },
  navy: {
    card:     'bg-brand-navy shadow-sm',
    label:    'text-blue-200/80',
    value:    'text-brand-gold',
    sub:      'text-blue-200/60',
    iconWrap: 'bg-white/10 text-white/70',
  },
  bordeaux: {
    card:     'bg-brand-bordeaux shadow-sm',
    label:    'text-red-200/80',
    value:    'text-white',
    sub:      'text-red-200/60',
    iconWrap: 'bg-white/10 text-white/70',
  },
  gold: {
    card:     'bg-brand-gold shadow-sm',
    label:    'text-amber-800/70',
    value:    'text-brand-navy',
    sub:      'text-amber-800/50',
    iconWrap: 'bg-brand-navy/10 text-brand-navy/70',
  },
  blue: {
    card:     'bg-brand-blue shadow-sm',
    label:    'text-blue-100/80',
    value:    'text-white',
    sub:      'text-blue-100/60',
    iconWrap: 'bg-white/15 text-white/80',
  },
  amber: {
    card:     'bg-amber-50 border border-amber-100 shadow-sm',
    label:    'text-amber-600',
    value:    'text-amber-700',
    sub:      'text-amber-500/80',
    iconWrap: 'bg-amber-100 text-amber-600',
  },
  emerald: {
    card:     'bg-emerald-50 border border-emerald-100 shadow-sm',
    label:    'text-emerald-600',
    value:    'text-emerald-700',
    sub:      'text-emerald-500/80',
    iconWrap: 'bg-emerald-100 text-emerald-600',
  },
  red: {
    card:     'bg-red-50 border border-red-100 shadow-sm',
    label:    'text-red-500',
    value:    'text-red-700',
    sub:      'text-red-400/80',
    iconWrap: 'bg-red-100 text-red-500',
  },
};

export default function StatCard({
  label, value, sub, icon, variant = 'default', className, static: isStatic,
}: StatCardProps) {
  const v = VARIANTS[variant];

  const content = (
    <div className={cn('rounded-2xl p-5', v.card, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn('text-[10px] font-bold uppercase tracking-widest', v.label)}>
            {label}
          </p>
          <p className={cn('text-3xl font-black tabular-nums mt-2 leading-none tracking-tight', v.value)}>
            {value}
          </p>
          {sub && (
            <p className={cn('text-xs mt-2 font-medium', v.sub)}>{sub}</p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', v.iconWrap)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (isStatic) return content;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={cardHover}
      whileTap={cardTap}
      className="cursor-default"
    >
      {content}
    </motion.div>
  );
}

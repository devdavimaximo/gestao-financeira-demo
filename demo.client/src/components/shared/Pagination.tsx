import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < totalPages - 2) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

export default function Pagination({ page, pageSize, total, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1 && total <= pageSize) return null;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={cn('flex items-center justify-between gap-3 select-none', className)}>
      <span className="text-white/30 text-xs tabular-nums">
        {from}–{to} de {total}
      </span>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft size={13} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`el-${i}`} className="w-7 text-center text-white/25 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-white/45 hover:text-white hover:bg-white/8'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

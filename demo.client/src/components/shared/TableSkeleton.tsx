import { cn } from '../../lib/utils';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

function SkeletonCell({ wide }: { wide?: boolean }) {
  return (
    <td className="px-4 py-3.5">
      <div className={cn('skeleton h-3.5 rounded', wide ? 'w-3/4' : 'w-1/2')} />
    </td>
  );
}

export default function TableSkeleton({ rows = 5, cols = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('overflow-hidden', className)}>
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-gray-50 last:border-0">
              {Array.from({ length: cols }).map((_, c) => (
                <SkeletonCell key={c} wide={c === 0} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-100 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/4 rounded" />
        </div>
        <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

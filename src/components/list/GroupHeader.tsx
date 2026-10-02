import { cn } from '@/lib/cn';
import { ProgressBar } from '@/components/ui/primitives';

export function GroupHeader({
  label,
  done,
  total,
  index,
}: {
  label: string;
  done: number;
  total: number;
  index?: number;
}) {
  const complete = done === total && total > 0;

  return (
    <div
      className={cn(
        'sticky top-[var(--header-h)] z-20 flex items-center gap-2.5 rounded-t-[var(--radius-card)]',
        'border-b border-border bg-surface-2/92 px-3.5 py-2 backdrop-blur-md',
        complete && 'opacity-60',
      )}
    >
      {index !== undefined ? (
        <span
          className={cn(
            'tnum grid size-[22px] shrink-0 place-items-center rounded-[7px] text-[11px] font-bold',
            complete ? 'bg-surface-3 text-text-faint' : 'bg-accent-soft text-accent',
          )}
        >
          {index}
        </span>
      ) : null}

      <span
        className={cn(
          'flex-1 truncate text-[12.5px] font-semibold tracking-[0.01em]',
          complete && 'line-through decoration-text-faint',
        )}
      >
        {label}
      </span>

      <span className="tnum shrink-0 text-[11.5px] font-medium text-text-muted">
        {done}/{total}
      </span>

      <ProgressBar value={total ? done / total : 0} className="w-10 shrink-0" />
    </div>
  );
}

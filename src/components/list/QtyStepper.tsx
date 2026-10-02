import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { UNIT_LABELS } from '@/lib/taxonomy';
import type { Unit } from '@/types';

export function stepFor(unit: Unit): number {
  if (unit === 'kg' || unit === 'l') return 0.1;
  if (unit === 'g' || unit === 'ml') return 50;
  return 1;
}

export function QtyStepper({
  qty,
  unit,
  onChange,
}: {
  qty: number;
  unit: Unit;
  onChange: (qty: number) => void;
}) {
  const step = stepFor(unit);
  const round = (value: number) => Math.round(value * 1000) / 1000;

  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border bg-surface-2 p-1">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={qty <= step}
        onClick={() => onChange(round(Math.max(step, qty - step)))}
        className="grid size-9 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-35"
      >
        <Minus size={16} />
      </button>

      <div className="tnum min-w-[62px] text-center text-[14px] font-semibold">
        {Number.isInteger(qty) ? qty : qty.toFixed(unit === 'g' || unit === 'ml' ? 0 : 2).replace('.', ',')}
        <span className="ml-1 text-[11px] font-medium text-text-muted">{UNIT_LABELS[unit]}</span>
      </div>

      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => onChange(round(qty + step))}
        className="grid size-9 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-surface hover:text-text"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export function QtyPill({
  qty,
  unit,
  assumed,
  dimmed,
}: {
  qty: number;
  unit: Unit;
  assumed: boolean;
  dimmed?: boolean;
}) {
  const formatted = Number.isInteger(qty)
    ? String(qty)
    : qty.toFixed(2).replace('.', ',').replace(/,?0+$/, '');

  return (
    <span
      title={assumed ? 'Quantidade assumida pela IA — a mensagem não dizia' : undefined}
      className={cn(
        'tnum inline-flex shrink-0 items-center gap-0.5 rounded-[8px] px-1.5 py-0.5',
        'text-[12.5px] font-semibold tabular-nums',
        dimmed && 'opacity-45',
        assumed
          ? 'bg-surface-2 text-text-faint font-medium'
          : 'bg-accent-soft text-accent',
      )}
    >
      {formatted}
      <span className="text-[10.5px] font-medium opacity-75">{UNIT_LABELS[unit]}</span>
    </span>
  );
}

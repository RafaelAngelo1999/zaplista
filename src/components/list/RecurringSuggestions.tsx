import { Plus, RefreshCcw, X } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import type { ProductHistory } from '@/types';

export function RecurringSuggestions({
  items,
  onAdd,
  onDismiss,
}: {
  items: ProductHistory[];
  onAdd: (entry: ProductHistory) => void;
  onDismiss: (key: string) => void;
}) {
  if (!items.length) return null;

  return (
    <Card className="space-y-2 border-accent-border bg-accent-soft/40 p-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
        <RefreshCcw size={13} />
        Você sempre compra isso
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((entry) => (
          <span
            key={entry.key}
            className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent-border bg-surface py-1 pl-2.5 pr-1 text-[12.5px] font-medium"
          >
            {entry.label}
            <span className="tnum text-text-faint">{entry.timesBought}×</span>
            <button
              type="button"
              aria-label={`Adicionar ${entry.label}`}
              onClick={() => onAdd(entry)}
              className="grid size-6 place-items-center rounded-full text-accent transition-colors hover:bg-accent-soft"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              aria-label={`Ignorar ${entry.label}`}
              onClick={() => onDismiss(entry.key)}
              className="grid size-6 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    </Card>
  );
}

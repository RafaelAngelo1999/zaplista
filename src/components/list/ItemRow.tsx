import * as React from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check, ArrowDown, ArrowUp, AlertTriangle, StickyNote } from 'lucide-react';
import { cn, haptic } from '@/lib/cn';
import { moneyParts, timeAgo } from '@/lib/format';
import { QtyPill } from '@/components/list/QtyStepper';
import type { PriceComparison } from '@/lib/history';
import type { Item } from '@/types';

export function ItemRow({
  item,
  showPrice,
  comparison,
  recurrence,
  onToggle,
  onOpen,
}: {
  item: Item;
  showPrice: boolean;
  comparison: PriceComparison | null;
  recurrence: number | null;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const handleToggle = React.useCallback(() => {
    haptic();
    onToggle();
  }, [onToggle]);

  const price = moneyParts(item.price);

  return (
    <div
      className={cn(
        'row-item group relative flex min-h-[56px] items-center gap-3 px-3.5',
        'transition-[opacity,background-color] duration-200 ease-[var(--ease-out-soft)]',
        item.checked && 'opacity-55',
      )}
    >
      {item.needsReview && !item.checked ? (
        <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-warning" />
      ) : null}

      <RadixCheckbox.Root
        checked={item.checked}
        onCheckedChange={handleToggle}
        aria-label={`Marcar ${item.name}`}
        className={cn(
          'grid size-[26px] shrink-0 place-items-center rounded-[9px] border-2 border-border-strong',
          'transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out-soft)]',
          'active:scale-90',
          'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        )}
      >
        <RadixCheckbox.Indicator>
          <Check size={16} strokeWidth={3} className="text-accent-fg" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-[14.5px] font-medium tracking-[-0.005em]',
                item.checked && 'line-through decoration-text-faint',
              )}
            >
              {item.name}
            </span>
            {item.needsReview && !item.checked ? (
              <AlertTriangle size={13} className="shrink-0 text-warning" aria-label="Revisar" />
            ) : null}
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-text-muted">
            {item.notes ? (
              <span className="flex min-w-0 items-center gap-1">
                <StickyNote size={11} className="shrink-0" />
                <span className="truncate">{item.notes}</span>
              </span>
            ) : null}

            {comparison && !item.notes ? (
              <PriceDelta comparison={comparison} />
            ) : null}

            {!item.notes && !comparison && recurrence && recurrence > 1 ? (
              <span className="tnum text-text-faint">{recurrence}ª vez que você compra</span>
            ) : null}

            {item.checked && item.checkedAt ? (
              <span className="text-text-faint">
                {item.checkedBy ? `${item.checkedBy} · ` : ''}
                {timeAgo(item.checkedAt)}
              </span>
            ) : null}
          </div>
        </div>

        <QtyPill qty={item.qty} unit={item.unit} assumed={item.qtyAssumed} dimmed={item.checked} />

        {showPrice ? (
          <span
            className={cn(
              'tnum w-[76px] shrink-0 text-right text-[13.5px] font-semibold',
              item.price === undefined && 'text-text-faint font-normal',
            )}
          >
            {item.price === undefined ? (
              '—'
            ) : (
              <>
                <span className="mr-0.5 text-[10px] font-medium text-text-faint">{price.symbol}</span>
                {price.amount}
              </>
            )}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function PriceDelta({ comparison }: { comparison: PriceComparison }) {
  const { direction, percent, previous } = comparison;
  if (direction === 'flat') {
    return <span className="tnum text-text-faint">mesmo preço da última vez</span>;
  }

  const up = direction === 'up';
  const previousPrice = moneyParts(previous.price);

  return (
    <span
      className={cn('tnum flex items-center gap-1 font-medium', up ? 'text-danger' : 'text-success')}
    >
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(percent).toFixed(1).replace('.', ',')}%
      <span className="font-normal text-text-faint">
        (era {previousPrice.symbol} {previousPrice.amount})
      </span>
    </span>
  );
}

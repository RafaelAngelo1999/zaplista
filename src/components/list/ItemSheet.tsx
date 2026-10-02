import * as React from 'react';
import { Trash2, History } from 'lucide-react';
import {
  Button,
  Field,
  Input,
  Select,
  Sheet,
  Textarea,
  Chip,
} from '@/components/ui/primitives';
import { QtyStepper } from '@/components/list/QtyStepper';
import { AISLES, CATEGORIES, UNITS, UNIT_NAMES } from '@/lib/taxonomy';
import { money, timeAgo } from '@/lib/format';
import type { ProductHistory } from '@/types';
import type { Item, Unit } from '@/types';

export function ItemSheet({
  item,
  open,
  onOpenChange,
  showPrice,
  history,
  onSave,
  onDelete,
}: {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showPrice: boolean;
  history: ProductHistory | null;
  onSave: (patch: Partial<Item>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = React.useState<Item | null>(item);

  React.useEffect(() => setDraft(item), [item]);

  if (!draft) return null;

  const update = <K extends keyof Item>(key: K, value: Item[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const commit = () => {
    onSave({
      name: draft.name.trim() || item?.name,
      qty: draft.qty,
      unit: draft.unit,
      aisle: draft.aisle,
      category: draft.category,
      notes: draft.notes?.trim() || undefined,
      price: draft.price,
      needsReview: false,
    });
    onOpenChange(false);
  };

  const lastPrice = history?.prices[0];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Editar item"
      description={draft.rawText ? `No WhatsApp: "${draft.rawText}"` : undefined}
      footer={
        <>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
            aria-label="Remover item"
            className="px-3.5"
          >
            <Trash2 size={16} />
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={commit}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {draft.needsReview ? (
          <div className="rounded-[var(--radius-control)] border border-warning-border bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed">
            A IA não teve certeza da categorização deste item
            {draft.confidence !== undefined
              ? ` (confiança ${Math.round(draft.confidence * 100)}%)`
              : ''}
            . Confira e salve para tirar o aviso.
          </div>
        ) : null}

        <Field label="Descrição" htmlFor="item-name">
          <Input
            id="item-name"
            value={draft.name}
            onChange={(event) => update('name', event.target.value)}
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Unidade" htmlFor="item-unit">
            <Select
              id="item-unit"
              value={draft.unit}
              onChange={(event) => update('unit', event.target.value as Unit)}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {UNIT_NAMES[unit]} ({unit})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Quantidade">
            <QtyStepper qty={draft.qty} unit={draft.unit} onChange={(qty) => update('qty', qty)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Corredor" htmlFor="item-aisle">
            <Select
              id="item-aisle"
              value={draft.aisle}
              onChange={(event) => update('aisle', event.target.value)}
            >
              {AISLES.map((aisle) => (
                <option key={aisle.name} value={aisle.name}>
                  {aisle.order === 99 ? aisle.name : `${aisle.order}. ${aisle.name}`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipo" htmlFor="item-category">
            <Select
              id="item-category"
              value={draft.category}
              onChange={(event) => update('category', event.target.value)}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {showPrice ? (
          <Field
            label="Preço"
            htmlFor="item-price"
            hint={
              lastPrice
                ? `Última vez: ${money(lastPrice.price)} · ${timeAgo(lastPrice.at)}`
                : 'Opcional. Preencha se quiser acompanhar o histórico de preço.'
            }
          >
            <Input
              id="item-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="tnum"
              value={draft.price ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                update('price', value === '' ? undefined : Number(value));
              }}
            />
          </Field>
        ) : null}

        <Field label="Observação" htmlFor="item-notes">
          <Textarea
            id="item-notes"
            rows={2}
            placeholder="o mais barato, sem lactose, se tiver promoção…"
            value={draft.notes ?? ''}
            onChange={(event) => update('notes', event.target.value)}
          />
        </Field>

        {history && history.timesBought > 1 ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2.5 text-[12.5px] text-text-muted">
            <History size={14} className="shrink-0" />
            <span>
              Comprado <strong className="tnum font-semibold text-text">{history.timesBought}</strong>{' '}
              vezes · última {timeAgo(history.lastBoughtAt)}
            </span>
            {lastPrice ? <Chip tone="muted">{money(lastPrice.price)}</Chip> : null}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

import { normalizeKey } from '@/lib/taxonomy';
import type { Item, SortMode } from '@/types';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export interface ItemGroup {
  key: string;
  label: string;
  items: Item[];
  total: number;
  done: number;
}

function byName(a: Item, b: Item): number {
  return collator.compare(a.name, b.name);
}

function byPending(a: Item, b: Item): number {
  if (a.checked !== b.checked) return a.checked ? 1 : -1;
  if (a.checked && b.checked) {
    const at = b.checkedAt ?? '';
    const bt = a.checkedAt ?? '';
    if (at !== bt) return collator.compare(at, bt);
  }
  return byName(a, b);
}

export function aislePosition(name: string, order: string[]): number {
  const idx = order.indexOf(name);
  return idx === -1 ? order.length : idx;
}

export function sortFlat(items: Item[], mode: SortMode, aisleOrder: string[]): Item[] {
  const sorted = [...items];
  if (mode === 'alpha') return sorted.sort(byPending);

  return sorted.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (mode === 'aisle') {
      const diff = aislePosition(a.aisle, aisleOrder) - aislePosition(b.aisle, aisleOrder);
      if (diff !== 0) return diff;
    }
    if (mode === 'category') {
      const cmp = collator.compare(a.category, b.category);
      if (cmp !== 0) return cmp;
    }
    return byPending(a, b);
  });
}

export function groupItems(items: Item[], mode: SortMode, aisleOrder: string[]): ItemGroup[] {
  if (mode === 'alpha') {
    return [
      {
        key: 'all',
        label: 'Todos os itens',
        items: [...items].sort(byPending),
        total: items.length,
        done: items.filter((i) => i.checked).length,
      },
    ];
  }

  const buckets = new Map<string, { label: string; items: Item[] }>();

  for (const item of items) {
    const label = mode === 'aisle' ? item.aisle : item.category;
    const key = normalizeKey(label);

    const bucket = buckets.get(key);
    if (bucket) bucket.items.push(item);
    else buckets.set(key, { label, items: [item] });
  }

  const groups: ItemGroup[] = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    items: bucket.items.sort(byPending),
    total: bucket.items.length,
    done: bucket.items.filter((i) => i.checked).length,
  }));

  return groups.sort((a, b) => {
    const aDone = a.done === a.total;
    const bDone = b.done === b.total;
    if (aDone !== bDone) return aDone ? 1 : -1;

    if (mode === 'aisle') {
      const diff = aislePosition(a.label, aisleOrder) - aislePosition(b.label, aisleOrder);
      if (diff !== 0) return diff;
    }
    return collator.compare(a.label, b.label);
  });
}

export function filterItems(items: Item[], query: string, onlyPending: boolean): Item[] {
  let result = items;

  if (onlyPending) result = result.filter((item) => !item.checked);

  const needle = normalizeKey(query);
  if (needle) {
    result = result.filter((item) => {
      const haystack = normalizeKey(
        `${item.name} ${item.category} ${item.aisle} ${item.notes ?? ''}`,
      );
      return haystack.includes(needle);
    });
  }

  return result;
}

export interface ListStats {
  total: number;
  done: number;
  pending: number;
  needsReview: number;
  spent: number;
  pricedItems: number;
  progress: number;
}

export function statsOf(items: Item[]): ListStats {
  let done = 0;
  let needsReview = 0;
  let spent = 0;
  let pricedItems = 0;

  for (const item of items) {
    if (item.checked) done++;
    if (item.needsReview && !item.checked) needsReview++;
    if (typeof item.price === 'number' && item.price > 0) {
      pricedItems++;
      // un/pct/cx/dz: preço é por unidade, multiplica pela quantidade.
      // kg/g/l/ml: preço já é o total pesado na balança, não multiplica.
      const countable = item.unit === 'un' || item.unit === 'pct' || item.unit === 'cx' || item.unit === 'dz';
      spent += countable ? item.price * item.qty : item.price;
    }
  }

  return {
    total: items.length,
    done,
    pending: items.length - done,
    needsReview,
    spent,
    pricedItems,
    progress: items.length ? done / items.length : 0,
  };
}

import { normalizeKey } from '@/lib/taxonomy';
import type { Item } from '@/types';

export function itemKey(item: Item): string {
  return `${normalizeKey(item.name)}::${item.unit}`;
}

export interface MergePreview {
  added: Item[];
  merged: { existing: Item; incoming: Item; resultQty: number }[];
}

export function previewMerge(current: Item[], incoming: Item[]): MergePreview {
  const index = new Map<string, Item>();
  for (const item of current) index.set(itemKey(item), item);

  const added: Item[] = [];
  const merged: MergePreview['merged'] = [];

  for (const item of incoming) {
    const existing = index.get(itemKey(item));
    if (existing) {
      merged.push({ existing, incoming: item, resultQty: existing.qty + item.qty });
    } else {
      added.push(item);
    }
  }

  return { added, merged };
}

export function applyMerge(current: Item[], incoming: Item[]): Item[] {
  const now = new Date().toISOString();
  const result = current.map((item) => ({ ...item }));
  const index = new Map<string, Item>();
  for (const item of result) index.set(itemKey(item), item);

  for (const item of incoming) {
    const existing = index.get(itemKey(item));
    if (existing) {
      existing.qty = Math.round((existing.qty + item.qty) * 1000) / 1000;
      existing.qtyAssumed = existing.qtyAssumed && item.qtyAssumed;
      existing.updatedAt = now;
      if (existing.checked) {
        existing.checked = false;
        existing.checkedAt = undefined;
      }
      if (!existing.notes && item.notes) existing.notes = item.notes;
    } else {
      const copy = { ...item };
      result.push(copy);
      index.set(itemKey(copy), copy);
    }
  }

  return result;
}

export function mergeRemote(local: Item[], remote: Item[]): Item[] {
  const byId = new Map<string, Item>();

  for (const item of local) byId.set(item.id, item);

  for (const item of remote) {
    const mine = byId.get(item.id);
    if (!mine) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, item.updatedAt > mine.updatedAt ? item : mine);
  }

  return [...byId.values()];
}

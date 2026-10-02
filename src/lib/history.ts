import { normalizeKey } from '@/lib/taxonomy';
import type { Item, PriceObservation, ProductHistory, ShoppingList } from '@/types';

export function productKey(name: string): string {
  return normalizeKey(name);
}

function observationOf(item: Item, list: ShoppingList): PriceObservation | null {
  if (typeof item.price !== 'number' || item.price <= 0) return null;
  return {
    listId: list.id,
    at: item.checkedAt ?? list.completedAt ?? list.updatedAt,
    price: item.price,
    qty: item.qty,
    unit: item.unit,
    market: list.market,
  };
}

export function buildHistory(lists: ShoppingList[]): Map<string, ProductHistory> {
  const index = new Map<string, ProductHistory>();
  const finished = lists.filter((list) => list.status === 'concluida');

  for (const list of finished) {
    for (const item of list.items) {
      if (!item.checked) continue;

      const key = productKey(item.name);
      const at = item.checkedAt ?? list.completedAt ?? list.updatedAt;
      const entry = index.get(key);

      if (entry) {
        entry.timesBought++;
        entry.label = item.name;
        entry.aisle = item.aisle;
        entry.category = item.category;
        if (!entry.lastBoughtAt || at > entry.lastBoughtAt) entry.lastBoughtAt = at;
        if (at < entry.firstSeenAt) entry.firstSeenAt = at;
      } else {
        index.set(key, {
          key,
          label: item.name,
          aisle: item.aisle,
          category: item.category,
          timesBought: 1,
          firstSeenAt: at,
          lastBoughtAt: at,
          prices: [],
        });
      }

      const observation = observationOf(item, list);
      if (observation) index.get(key)!.prices.push(observation);
    }
  }

  for (const entry of index.values()) {
    entry.prices.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  }

  return index;
}

export interface PriceComparison {
  previous: PriceObservation;
  delta: number;
  percent: number;
  direction: 'up' | 'down' | 'flat';
}

export function comparePrice(
  history: Map<string, ProductHistory>,
  item: Item,
  currentListId: string,
): PriceComparison | null {
  if (typeof item.price !== 'number' || item.price <= 0) return null;

  const entry = history.get(productKey(item.name));
  if (!entry) return null;

  const previous = entry.prices.find((p) => p.listId !== currentListId && p.unit === item.unit);
  if (!previous) return null;

  const delta = Math.round((item.price - previous.price) * 100) / 100;
  const percent = Math.round((delta / previous.price) * 1000) / 10;

  return {
    previous,
    delta,
    percent,
    direction: Math.abs(delta) < 0.01 ? 'flat' : delta > 0 ? 'up' : 'down',
  };
}

export function recurrenceOf(
  history: Map<string, ProductHistory>,
  name: string,
): ProductHistory | null {
  return history.get(productKey(name)) ?? null;
}

export interface MonthSummary {
  key: string;
  lists: number;
  items: number;
  spent: number;
  spentUnknown: boolean;
}

export interface AisleSummary {
  label: string;
  order: number;
  items: number;
  spent: number;
}

export interface TopProduct {
  key: string;
  label: string;
  aisle: string;
  timesBought: number;
  lastBoughtAt?: string;
  lastPrice?: number;
  firstPrice?: number;
  priceTrend: number | null;
}

export interface DashboardData {
  totalLists: number;
  totalItemsBought: number;
  totalSpent: number;
  trackedProducts: number;
  months: MonthSummary[];
  aisles: AisleSummary[];
  topProducts: TopProduct[];
  biggestRises: TopProduct[];
  avgItemsPerList: number;
  completionRate: number;
}

function monthKeyOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildDashboard(lists: ShoppingList[]): DashboardData {
  const finished = lists.filter((list) => list.status === 'concluida');
  const history = buildHistory(lists);

  const monthMap = new Map<string, MonthSummary>();
  const aisleMap = new Map<string, AisleSummary>();

  let totalItemsBought = 0;
  let totalSpent = 0;
  let totalItemsPlanned = 0;

  for (const list of finished) {
    const key = monthKeyOf(list.completedAt ?? list.updatedAt);
    const month =
      monthMap.get(key) ?? { key, lists: 0, items: 0, spent: 0, spentUnknown: true };
    month.lists++;
    totalItemsPlanned += list.items.length;

    for (const item of list.items) {
      if (!item.checked) continue;
      totalItemsBought++;
      month.items++;

      const countable =
        item.unit === 'un' || item.unit === 'pct' || item.unit === 'cx' || item.unit === 'dz';
      const value =
        typeof item.price === 'number' && item.price > 0
          ? countable
            ? item.price * item.qty
            : item.price
          : 0;

      if (value > 0) {
        month.spent += value;
        month.spentUnknown = false;
        totalSpent += value;
      }

      const aisle =
        aisleMap.get(item.aisle) ?? { label: item.aisle, order: item.aisleOrder, items: 0, spent: 0 };
      aisle.items++;
      aisle.spent += value;
      aisleMap.set(item.aisle, aisle);
    }

    monthMap.set(key, month);
  }

  const toTopProduct = (entry: ProductHistory): TopProduct => {
    const last = entry.prices[0];
    const first = entry.prices.at(-1);
    const trend =
      last && first && first.price > 0 && last !== first
        ? Math.round(((last.price - first.price) / first.price) * 1000) / 10
        : null;

    return {
      key: entry.key,
      label: entry.label,
      aisle: entry.aisle,
      timesBought: entry.timesBought,
      lastBoughtAt: entry.lastBoughtAt,
      lastPrice: last?.price,
      firstPrice: first?.price,
      priceTrend: trend,
    };
  };

  const products = [...history.values()].map(toTopProduct);

  return {
    totalLists: finished.length,
    totalItemsBought,
    totalSpent,
    trackedProducts: history.size,
    months: [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    aisles: [...aisleMap.values()].sort((a, b) => b.items - a.items),
    topProducts: [...products]
      .sort((a, b) => b.timesBought - a.timesBought || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 12),
    biggestRises: products
      .filter((p) => p.priceTrend !== null && p.priceTrend > 0)
      .sort((a, b) => (b.priceTrend ?? 0) - (a.priceTrend ?? 0))
      .slice(0, 6),
    avgItemsPerList: finished.length ? Math.round((totalItemsBought / finished.length) * 10) / 10 : 0,
    completionRate: totalItemsPlanned ? totalItemsBought / totalItemsPlanned : 0,
  };
}

export function priceSeries(
  history: Map<string, ProductHistory>,
  key: string,
): PriceObservation[] {
  const entry = history.get(key);
  if (!entry) return [];
  return [...entry.prices].reverse();
}

export type Unit = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'pct' | 'cx' | 'dz' | 'bdj' | 'fd';

export type SortMode = 'aisle' | 'category' | 'alpha';

export interface Item {
  id: string;
  name: string;
  rawText?: string;
  qty: number;
  unit: Unit;
  qtyAssumed: boolean;
  aisle: string;
  aisleOrder: number;
  category: string;
  notes?: string;
  checked: boolean;
  checkedAt?: string;
  checkedBy?: string;
  price?: number;
  confidence?: number;
  needsReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  market?: string;
  status: 'ativa' | 'concluida' | 'arquivada' | 'modelo';
  items: Item[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  shareCode?: string;
  remoteId?: string;
  revision?: number;
}

export interface PriceObservation {
  listId: string;
  at: string;
  price: number;
  qty: number;
  unit: Unit;
  market?: string;
}

export interface ProductHistory {
  key: string;
  label: string;
  aisle: string;
  category: string;
  timesBought: number;
  firstSeenAt: string;
  lastBoughtAt?: string;
  prices: PriceObservation[];
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  trackPrices: boolean;
  marketMode: boolean;
  sortMode: SortMode;
  hideChecked: boolean;
  userName?: string;
}

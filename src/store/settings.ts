import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AISLES } from '@/lib/taxonomy';
import type { Settings, SortMode } from '@/types';

const DEFAULT_AISLE_ORDER = AISLES.map((aisle) => aisle.name);

interface SettingsState extends Settings {
  aisleOrder: string[];
  setTheme: (theme: Settings['theme']) => void;
  setTrackPrices: (value: boolean) => void;
  setMarketMode: (value: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  setHideChecked: (value: boolean) => void;
  setUserName: (name: string) => void;
  moveAisle: (name: string, direction: 'up' | 'down') => void;
  resetAisleOrder: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      trackPrices: false,
      marketMode: false,
      sortMode: 'aisle',
      hideChecked: false,
      userName: undefined,
      aisleOrder: DEFAULT_AISLE_ORDER,

      setTheme: (theme) => set({ theme }),
      setTrackPrices: (trackPrices) => set({ trackPrices }),
      setMarketMode: (marketMode) => set({ marketMode }),
      setSortMode: (sortMode) => set({ sortMode }),
      setHideChecked: (hideChecked) => set({ hideChecked }),
      setUserName: (userName) => set({ userName: userName.trim() || undefined }),

      moveAisle: (name, direction) =>
        set((state) => {
          const order = [...state.aisleOrder];
          const index = order.indexOf(name);
          if (index === -1) return state;

          const target = direction === 'up' ? index - 1 : index + 1;
          if (target < 0 || target >= order.length) return state;
          if (order[index] === 'Outros' || order[target] === 'Outros') return state;

          [order[index], order[target]] = [order[target]!, order[index]!];
          return { aisleOrder: order };
        }),

      resetAisleOrder: () => set({ aisleOrder: DEFAULT_AISLE_ORDER }),
    }),
    {
      name: 'compras:settings:v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState>;
        return { ...state, aisleOrder: state.aisleOrder ?? DEFAULT_AISLE_ORDER } as SettingsState;
      },
    },
  ),
);

export function applyDocumentFlags(theme: Settings['theme'], marketMode: boolean): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  if (marketMode) root.setAttribute('data-market', 'on');
  else root.removeAttribute('data-market');
}

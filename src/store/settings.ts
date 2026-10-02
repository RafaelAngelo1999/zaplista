import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Settings, SortMode } from '@/types';

interface SettingsState extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setTrackPrices: (value: boolean) => void;
  setMarketMode: (value: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  setHideChecked: (value: boolean) => void;
  setUserName: (name: string) => void;
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

      setTheme: (theme) => set({ theme }),
      setTrackPrices: (trackPrices) => set({ trackPrices }),
      setMarketMode: (marketMode) => set({ marketMode }),
      setSortMode: (sortMode) => set({ sortMode }),
      setHideChecked: (hideChecked) => set({ hideChecked }),
      setUserName: (userName) => set({ userName: userName.trim() || undefined }),
    }),
    {
      name: 'compras:settings:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
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

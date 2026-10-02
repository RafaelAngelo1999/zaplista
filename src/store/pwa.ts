import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateSW: ((reloadPage?: boolean) => Promise<void>) | null;
  installPromptDismissed: boolean;
  setNeedRefresh: (value: boolean) => void;
  setOfflineReady: (value: boolean) => void;
  setUpdateSW: (fn: (reloadPage?: boolean) => Promise<void>) => void;
  dismissInstallPrompt: () => void;
}

export const usePwa = create<PwaState>()(
  persist(
    (set) => ({
      needRefresh: false,
      offlineReady: false,
      updateSW: null,
      installPromptDismissed: false,
      setNeedRefresh: (needRefresh) => set({ needRefresh }),
      setOfflineReady: (offlineReady) => set({ offlineReady }),
      setUpdateSW: (updateSW) => set({ updateSW }),
      dismissInstallPrompt: () => set({ installPromptDismissed: true }),
    }),
    {
      name: 'compras:pwa:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ installPromptDismissed: state.installPromptDismissed }),
    },
  ),
);

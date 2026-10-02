import { registerSW } from 'virtual:pwa-register';
import { usePwa } from '@/store/pwa';

export function setupPWA(): void {
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      usePwa.getState().setNeedRefresh(true);
    },
    onOfflineReady() {
      usePwa.getState().setOfflineReady(true);
    },
  });

  usePwa.getState().setUpdateSW(updateSW);
}

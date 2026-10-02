import { create } from 'zustand';
import type { SyncState } from '@/hooks/useShareSync';

interface SyncStatusState {
  state: SyncState;
  error?: string;
}

export const useSyncStatus = create<SyncStatusState>(() => ({ state: 'idle' }));

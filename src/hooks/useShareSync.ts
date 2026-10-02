import * as React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSharingAvailable } from '@/lib/supabase';
import { fetchShare, pushShare, type RemoteList } from '@/lib/share';
import { mergeRemote } from '@/lib/merge';
import { useLists } from '@/store/lists';
import type { ShoppingList } from '@/types';

export type SyncState = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

const PUSH_DEBOUNCE_MS = 900;

export function useShareSync(list: ShoppingList | null): { state: SyncState; error?: string } {
  const applyRemote = useLists((s) => s.applyRemote);

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const revisionRef = React.useRef(list?.revision ?? 0);
  // Setado antes de adotar um estado remoto, para esse update não disparar um
  // push de volta — senão vira eco infinito entre as duas pontas.
  const skipNextPushRef = React.useRef(false);
  const pushTimerRef = React.useRef<number | null>(null);

  const [status, setStatus] = React.useState<{ state: SyncState; error?: string }>({
    state: isSharingAvailable() ? 'idle' : 'disabled',
  });

  const remoteId = list?.remoteId;
  const shareCode = list?.shareCode;
  const listId = list?.id;
  revisionRef.current = list?.revision ?? 0;

  React.useEffect(() => {
    if (!remoteId || !listId) return;
    let cancelled = false;

    getSupabase()
      .then((client) => {
        if (cancelled) return;
        const channel = client.channel(`list:${remoteId}`);
        channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
          const remote = payload as RemoteList;
          if (remote.revision <= revisionRef.current) return;
          skipNextPushRef.current = true;
          applyRemote(listId, remote);
          setStatus({ state: 'synced' });
        });
        channel.subscribe();
        channelRef.current = channel;
      })
      .catch(() => setStatus({ state: 'disabled' }));

    return () => {
      cancelled = true;
      const channel = channelRef.current;
      if (channel) {
        getSupabase()
          .then((client) => client.removeChannel(channel))
          .catch(() => {});
        channelRef.current = null;
      }
    };
  }, [remoteId, listId, applyRemote]);

  const itemsSignature = list ? JSON.stringify(list.items) : '';

  React.useEffect(() => {
    if (!remoteId || !shareCode || !listId || !list) return;

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    setStatus({ state: 'syncing' });

    pushTimerRef.current = window.setTimeout(async () => {
      try {
        let remote = await pushShare(shareCode, list.items, revisionRef.current, list.title);

        if (remote.status === 'conflict') {
          const merged = mergeRemote(list.items, remote.items);
          remote = await pushShare(shareCode, merged, remote.revision, list.title);
        }

        skipNextPushRef.current = true;
        applyRemote(listId, remote);
        channelRef.current?.send({ type: 'broadcast', event: 'sync', payload: remote });
        setStatus({ state: 'synced' });
      } catch (err) {
        setStatus({
          state: 'error',
          error: err instanceof Error ? err.message : 'Falha ao sincronizar',
        });
      }
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [remoteId, shareCode, listId, itemsSignature, list?.title, applyRemote]);

  React.useEffect(() => {
    if (!remoteId || !shareCode || !listId) return;

    const refetch = async () => {
      try {
        const remote = await fetchShare(shareCode);
        if (remote.revision > revisionRef.current) {
          skipNextPushRef.current = true;
          applyRemote(listId, remote);
          setStatus({ state: 'synced' });
        }
      } catch {}
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };

    window.addEventListener('online', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [remoteId, shareCode, listId, applyRemote]);

  return status;
}

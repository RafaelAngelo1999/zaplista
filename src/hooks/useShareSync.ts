import * as React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSharingAvailable } from '@/lib/supabase';
import { fetchShare, pushShare, type RemoteList } from '@/lib/share';
import { describeListChange, mergeRemote } from '@/lib/merge';
import { useLists } from '@/store/lists';
import { useSyncStatus } from '@/store/sync';
import type { ShoppingList } from '@/types';

export type SyncState = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

const PUSH_DEBOUNCE_MS = 900;
const POLL_FALLBACK_MS = 8000;

export function useShareSync(
  list: ShoppingList | null,
  onRemoteUpdate?: (message: string) => void,
): void {
  const applyRemote = useLists((s) => s.applyRemote);
  const onRemoteUpdateRef = React.useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const revisionRef = React.useRef(list?.revision ?? 0);
  const itemsRef = React.useRef(list?.items ?? []);
  // Setado antes de adotar um estado remoto, para esse update não disparar um
  // push de volta — senão vira eco infinito entre as duas pontas.
  const skipNextPushRef = React.useRef(false);
  const pushTimerRef = React.useRef<number | null>(null);

  const setStatus = React.useCallback((next: { state: SyncState; error?: string }) => {
    useSyncStatus.setState(next);
  }, []);

  React.useEffect(() => {
    setStatus({ state: isSharingAvailable() ? 'idle' : 'disabled' });
  }, [setStatus]);

  const remoteId = list?.remoteId;
  const shareCode = list?.shareCode;
  const listId = list?.id;
  revisionRef.current = list?.revision ?? 0;
  itemsRef.current = list?.items ?? [];

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
          const message = describeListChange(itemsRef.current, remote.items);
          skipNextPushRef.current = true;
          applyRemote(listId, remote);
          setStatus({ state: 'synced' });
          onRemoteUpdateRef.current?.(message);
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
  }, [remoteId, listId, applyRemote, setStatus]);

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
  }, [remoteId, shareCode, listId, itemsSignature, list?.title, applyRemote, setStatus]);

  React.useEffect(() => {
    if (!remoteId || !shareCode || !listId) return;

    const refetch = async () => {
      try {
        const remote = await fetchShare(shareCode);
        if (remote.revision > revisionRef.current) {
          const message = describeListChange(itemsRef.current, remote.items);
          skipNextPushRef.current = true;
          applyRemote(listId, remote);
          setStatus({ state: 'synced' });
          onRemoteUpdateRef.current?.(message);
        }
      } catch {}
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };

    // O broadcast do Supabase Realtime é "best effort" (sem confirmação de
    // entrega) — se o canal cair ou a assinatura não tiver completado a
    // tempo, a outra ponta nunca fica sabendo. Esse polling é a rede de
    // segurança que garante consistência mesmo com broadcast perdido,
    // sem depender de trocar de aba ou perder conexão.
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refetch();
    }, POLL_FALLBACK_MS);

    window.addEventListener('online', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('online', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [remoteId, shareCode, listId, applyRemote, setStatus]);
}

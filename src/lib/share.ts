import { getSupabase } from '@/lib/supabase';
import type { Item } from '@/types';

export interface RemoteList {
  status: 'ok' | 'conflict';
  id: string;
  shareCode: string;
  title: string;
  items: Item[];
  revision: number;
  updatedAt: string;
}

export async function createShare(title: string, items: Item[]): Promise<RemoteList> {
  const client = await getSupabase();
  const { data, error } = await client.rpc('list_create', { p_title: title, p_items: items });
  if (error) throw new Error(error.message);
  return data as RemoteList;
}

export async function fetchShare(code: string): Promise<RemoteList> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error('Digite o código da lista.');

  const client = await getSupabase();
  const { data, error } = await client.rpc('list_get', { p_code: normalized });
  if (error) throw new Error('Código não encontrado. Confira e tente de novo.');
  return data as RemoteList;
}

export async function pushShare(
  code: string,
  items: Item[],
  baseRevision: number,
  title: string,
): Promise<RemoteList> {
  const client = await getSupabase();
  const { data, error } = await client.rpc('list_push', {
    p_code: code,
    p_items: items,
    p_base_revision: baseRevision,
    p_title: title,
  });
  if (error) throw new Error(error.message);
  return data as RemoteList;
}

export function shareLink(code: string): string {
  return `${window.location.origin}/entrar/${code}`;
}

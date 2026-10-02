import type { SupabaseClient } from '@supabase/supabase-js';

// NUNCA colocar a "secret key" aqui — ela ignora RLS, e este arquivo roda no
// navegador de quem usa o app. Só a publishable key.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSharingAvailable = (): boolean => Boolean(url && key);

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!url || !key) {
    return Promise.reject(
      new Error('Compartilhamento não configurado: faltam as variáveis do Supabase.'),
    );
  }

  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    }),
  );

  return clientPromise;
}

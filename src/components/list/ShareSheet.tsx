import * as React from 'react';
import QRCode from 'qrcode';
import { Check, Copy, LogIn, Share2, Users, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Input, Sheet } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { createShare, fetchShare, shareLink } from '@/lib/share';
import { copyToClipboard, cn } from '@/lib/cn';
import { useLists } from '@/store/lists';
import type { SyncState } from '@/hooks/useShareSync';
import type { ShoppingList } from '@/types';

export function ShareSheet({
  list,
  open,
  onOpenChange,
  syncStatus,
}: {
  list: ShoppingList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncStatus: { state: SyncState; error?: string };
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const linkShare = useLists((s) => s.linkShare);
  const unlinkShare = useLists((s) => s.unlinkShare);
  const createList = useLists((s) => s.createList);

  const [creating, setCreating] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<'code' | 'link' | null>(null);

  const shared = Boolean(list?.remoteId && list?.shareCode);

  React.useEffect(() => {
    if (!list?.shareCode) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(shareLink(list.shareCode), {
      width: 220,
      margin: 1,
      color: { dark: '#16321f', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [list?.shareCode]);

  const handleCreate = async () => {
    if (!list) return;
    setCreating(true);
    try {
      const remote = await createShare(list.title, list.items);
      linkShare(list.id, remote);
      toast.show('Lista compartilhada — mande o código para a outra pessoa');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Não consegui compartilhar agora');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    setJoinError(null);
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const remote = await fetchShare(joinCode);
      const newId = createList(remote.title, remote.items);
      linkShare(newId, remote);
      toast.show(`Entrou em "${remote.title}" — sincronizando`);
      setJoinCode('');
      onOpenChange(false);
      navigate('/');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Não consegui entrar com esse código');
    } finally {
      setJoining(false);
    }
  };

  const copy = async (text: string, which: 'code' | 'link') => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.show('Não consegui copiar. Selecione e copie à mão.');
      return;
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={shared ? 'Lista compartilhada' : 'Compartilhar lista'}
      description={
        shared
          ? 'Quem tiver o código vê as mesmas marcações, em tempo real.'
          : 'Gere um código para outra pessoa acompanhar esta lista com você.'
      }
    >
      {shared && list?.shareCode ? (
        <div className="space-y-4">
          <SyncBadge status={syncStatus} />

          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface-2 px-4 py-5">
            {qr ? (
              <img
                src={qr}
                alt={`QR code para entrar com o código ${list.shareCode}`}
                className="size-[160px] rounded-[12px] bg-white p-2 shadow-[var(--shadow-card)]"
              />
            ) : (
              <div className="size-[160px] animate-pulse rounded-[12px] bg-surface-3" />
            )}

            <button
              type="button"
              onClick={() => copy(list.shareCode!, 'code')}
              className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border-strong bg-surface px-4 py-2 font-mono text-[20px] font-bold tracking-[0.2em] transition-colors hover:bg-surface-2"
            >
              {list.shareCode}
              {copied === 'code' ? (
                <Check size={16} className="text-accent" />
              ) : (
                <Copy size={16} className="text-text-faint" />
              )}
            </button>
          </div>

          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => copy(shareLink(list.shareCode!), 'link')}
          >
            {copied === 'link' ? <Check size={16} /> : <Share2 size={16} />}
            {copied === 'link' ? 'Link copiado' : 'Copiar link para mandar no WhatsApp'}
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full text-danger"
            onClick={() => {
              unlinkShare(list.id);
              toast.show('A lista parou de sincronizar — continua salva aqui');
            }}
          >
            Parar de compartilhar
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-accent-soft px-3.5 py-3">
            <Users size={18} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[13px] leading-relaxed text-text">
              Gera um código de 6 letras. Quem entrar com ele vê a sua lista e as marcações
              aparecem dos dois lados, quase na hora.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!list || creating}
            onClick={handleCreate}
          >
            <Share2 size={17} />
            {creating ? 'Gerando código…' : 'Compartilhar esta lista'}
          </Button>

          <div className="flex items-center gap-3 text-[11.5px] font-medium uppercase tracking-wide text-text-faint">
            <div className="h-px flex-1 bg-border" />
            ou entrar numa lista
            <div className="h-px flex-1 bg-border" />
          </div>

          <Field label="Código de 6 letras" htmlFor="join-code" hint={joinError ?? undefined}>
            <div className="flex gap-2">
              <Input
                id="join-code"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="K7P2QM"
                maxLength={6}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleJoin();
                }}
                className={cn('font-mono tracking-[0.15em]', joinError && 'border-danger')}
              />
              <Button variant="secondary" size="md" disabled={joining} onClick={handleJoin}>
                <LogIn size={16} />
              </Button>
            </div>
          </Field>
        </div>
      )}
    </Sheet>
  );
}

function SyncBadge({ status }: { status: { state: SyncState; error?: string } }) {
  if (status.state === 'disabled' || status.state === 'idle') return null;

  if (status.state === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-warning">
        <WifiOff size={13} />
        Sem conexão — vai sincronizar assim que voltar
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-[12px] font-medium',
        status.state === 'syncing' ? 'text-text-muted' : 'text-accent',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status.state === 'syncing' ? 'animate-pulse bg-text-faint' : 'bg-accent',
        )}
      />
      {status.state === 'syncing' ? 'Sincronizando…' : 'Sincronizado'}
    </div>
  );
}

import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, LogIn } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui/primitives';
import { PageHeader } from '@/pages/ListaAtiva';
import { useToast } from '@/components/ui/Toast';
import { fetchShare } from '@/lib/share';
import { requestNotificationPermission } from '@/lib/notify';
import { useLists } from '@/store/lists';

export function Entrar() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const createList = useLists((s) => s.createList);
  const linkShare = useLists((s) => s.linkShare);

  const [code, setCode] = React.useState(codeFromUrl?.toUpperCase() ?? '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const join = React.useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const remote = await fetchShare(value);
        const id = createList(remote.title, remote.items);
        linkShare(id, remote);
        requestNotificationPermission();
        toast.show(`Entrou em "${remote.title}" — sincronizando`);
        navigate('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não consegui entrar com esse código');
      } finally {
        setLoading(false);
      }
    },
    [createList, linkShare, navigate, toast],
  );

  React.useEffect(() => {
    if (codeFromUrl) void join(codeFromUrl);
  }, [codeFromUrl, join]);

  return (
    <>
      <PageHeader title="Entrar em uma lista" subtitle="Cole o código de 6 letras que te mandaram" />

      <div className="px-3.5 py-3.5">
        <Card className="space-y-4 p-4">
          <Field label="Código" htmlFor="entrar-code" hint={error ?? undefined}>
            <div className="flex gap-2">
              <Input
                id="entrar-code"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="K7P2QM"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void join(code);
                }}
                className="font-mono text-[18px] tracking-[0.2em]"
              />
            </div>
          </Field>

          {error ? (
            <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-warning-border bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed">
              <AlertTriangle size={15} className="mt-px shrink-0 text-warning" />
              {error}
            </div>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading || !code.trim()}
            onClick={() => void join(code)}
          >
            <LogIn size={17} />
            {loading ? 'Entrando…' : 'Entrar na lista'}
          </Button>
        </Card>
      </div>
    </>
  );
}

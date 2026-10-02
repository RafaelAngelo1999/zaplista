import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCopy,
  CornerDownRight,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/cn';
import { Button, Card, Chip, Field, SectionLabel, Textarea } from '@/components/ui/primitives';
import { PageHeader } from '@/pages/ListaAtiva';
import { useToast } from '@/components/ui/Toast';
import { buildEmptyPrompt, buildPrompt, buildShortPrompt } from '@/lib/prompt';
import { extractJson } from '@/lib/parse';
import { validatePayload, type ParsedPayload } from '@/lib/schema';
import { previewMerge } from '@/lib/merge';
import { useActiveList, useLists } from '@/store/lists';
import { qtyLabel, pluralize } from '@/lib/format';

export function Importar() {
  const navigate = useNavigate();
  const toast = useToast();
  const activeList = useActiveList();
  const createList = useLists((state) => state.createList);
  const importIntoActive = useLists((state) => state.importIntoActive);

  const [raw, setRaw] = React.useState('');
  const [json, setJson] = React.useState('');
  const [short, setShort] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [repaired, setRepaired] = React.useState(false);
  const [truncated, setTruncated] = React.useState(false);

  const prompt = short ? buildShortPrompt(raw) : buildPrompt(raw);

  const copyPrompt = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.show('Não consegui copiar. Selecione o texto e copie à mão.');
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
    toast.show('Prompt copiado — cole na IA');
  };

  const analyze = (text: string) => {
    setJson(text);
    setParsed(null);
    setError(null);
    setRepaired(false);
    setTruncated(false);

    if (!text.trim()) return;

    const extracted = extractJson(text);
    if (!extracted.ok) {
      setError(
        extracted.position
          ? `${extracted.error} (linha ${extracted.position.line}, coluna ${extracted.position.column})`
          : (extracted.error ?? 'Não foi possível ler o JSON.'),
      );
      return;
    }

    const validated = validatePayload(extracted.value);
    if (!validated.ok || !validated.data) {
      setError(validated.error ?? 'JSON em formato inesperado.');
      return;
    }

    setRepaired(Boolean(extracted.repaired));
    setTruncated(Boolean(extracted.truncated));
    setParsed(validated.data);
  };

  const merge = parsed && activeList ? previewMerge(activeList.items, parsed.items) : null;
  const reviewCount = parsed?.items.filter((item) => item.needsReview).length ?? 0;

  const commit = (mode: 'replace' | 'merge' | 'new') => {
    if (!parsed) return;

    if (mode === 'new' || !activeList) {
      createList(parsed.title, parsed.items);
    } else {
      importIntoActive(parsed.items, mode);
    }

    toast.show(
      `${parsed.items.length} ${pluralize(parsed.items.length, 'item importado', 'itens importados')}`,
    );
    setRaw('');
    setJson('');
    setParsed(null);
    navigate('/');
  };

  return (
    <>
      <PageHeader title="Importar lista" subtitle="Três passos: colar, gerar o prompt, trazer o JSON." />

      <div className="space-y-3.5 px-3.5 py-3.5">
        <Card className="p-4">
          <StepLabel step={1} title="Cole o que você mandou no WhatsApp" />
          <Field label="Texto cru" htmlFor="raw-list">
            <Textarea
              id="raw-list"
              rows={6}
              placeholder={'2kg tomate\nleite\nptt o mais barato\ndetergente, sabão em pó\nmeio quilo de queijo'}
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
          <p className="mt-2 text-[12px] text-text-muted">
            Pode colar a conversa inteira, com horário e nome de quem mandou — a IA ignora o que não
            for item.
          </p>
        </Card>

        <Card className="p-4">
          <StepLabel step={2} title="Copie o prompt e cole na IA" />

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!raw.trim()}
            onClick={() => copyPrompt(prompt)}
          >
            {copied ? <Check size={18} /> : <ClipboardCopy size={18} />}
            {copied ? 'Copiado' : 'Copiar prompt com a minha lista'}
          </Button>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text-muted">
              <input
                type="checkbox"
                checked={short}
                onChange={(event) => setShort(event.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              Versão curta (celular)
            </label>
            <Button variant="ghost" size="sm" onClick={() => copyPrompt(buildEmptyPrompt())}>
              Prompt vazio
            </Button>
          </div>

          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="mt-3 flex w-full items-center gap-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:text-text"
              >
                <ChevronDown size={14} />
                Ver o prompt
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <pre className="mt-2 max-h-72 overflow-auto rounded-[var(--radius-control)] border border-border bg-surface-2 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                {prompt}
              </pre>
            </Collapsible.Content>
          </Collapsible.Root>
        </Card>

        <Card className="p-4">
          <StepLabel step={3} title="Cole aqui o JSON que a IA devolveu" />
          <Field label="JSON" htmlFor="json-input">
            <Textarea
              id="json-input"
              rows={5}
              placeholder='{ "version": 1, "items": [ … ] }'
              value={json}
              onChange={(event) => analyze(event.target.value)}
              className="font-mono text-[12.5px]"
            />
          </Field>

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-warning-border bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed">
              <AlertTriangle size={15} className="mt-px shrink-0 text-warning" />
              <div>
                <p>{error}</p>
                <p className="mt-1 text-text-muted">
                  Dica: peça à IA "responda só o JSON, sem markdown". Cercas de código e texto em
                  volta eu já removo sozinho.
                </p>
              </div>
            </div>
          ) : null}

          {truncated && parsed ? (
            <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-warning-border bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed">
              <AlertTriangle size={15} className="mt-px shrink-0 text-warning" />
              <span>
                A resposta da IA foi <strong>cortada no meio</strong> — provavelmente bateu no limite
                de tamanho. Descartei o último item incompleto, mas confira se não falta nada. Se
                faltar, peça para a IA continuar ou divida a lista em duas partes.
              </span>
            </div>
          ) : repaired && parsed ? (
            <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-[12.5px] text-text-muted">
              <Wand2 size={14} className="shrink-0" />
              O JSON vinha com erro de sintaxe e eu consertei antes de ler.
            </div>
          ) : null}
        </Card>

        {parsed ? (
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-accent-soft/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-accent" />
                <SectionLabel className="text-accent">Pronto para importar</SectionLabel>
              </div>
              <p className="mt-1.5 text-[14.5px] font-semibold">
                <span className="tnum">{parsed.items.length}</span>{' '}
                {pluralize(parsed.items.length, 'item', 'itens')}
                {parsed.title ? ` · ${parsed.title}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {reviewCount ? <Chip tone="warning">{reviewCount} a revisar</Chip> : null}
                {parsed.coerced ? <Chip tone="default">{parsed.coerced} foram para "Outros"</Chip> : null}
                {parsed.skipped ? <Chip tone="default">{parsed.skipped} ignorados</Chip> : null}
                {merge?.merged.length ? (
                  <Chip tone="accent">{merge.merged.length} já estão na lista</Chip>
                ) : null}
              </div>
            </div>

            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {parsed.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="tnum w-5 shrink-0 text-center text-[11px] font-semibold text-text-faint">
                    {item.aisleOrder === 99 ? '—' : item.aisleOrder}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{item.name}</p>
                    <p className="truncate text-[11.5px] text-text-muted">
                      {item.aisle} · {item.category}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                  </div>
                  {item.needsReview ? <AlertTriangle size={13} className="shrink-0 text-warning" /> : null}
                  <span
                    className={cn(
                      'tnum shrink-0 text-[12.5px] font-semibold',
                      item.qtyAssumed && 'font-normal text-text-faint',
                    )}
                  >
                    {qtyLabel(item.qty, item.unit)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-border p-4">
              {activeList ? (
                <>
                  <Button variant="primary" size="lg" className="w-full" onClick={() => commit('merge')}>
                    <CornerDownRight size={17} />
                    Mesclar em "{activeList.title}"
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="md" onClick={() => commit('replace')}>
                      Substituir a lista
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => commit('new')}>
                      Criar nova lista
                    </Button>
                  </div>
                  {merge?.merged.length ? (
                    <p className="pt-1 text-[12px] leading-relaxed text-text-muted">
                      Mesclando, {merge.merged.length}{' '}
                      {pluralize(merge.merged.length, 'item repetido soma', 'itens repetidos somam')} a
                      quantidade (ex.:{' '}
                      {merge.merged[0] ? (
                        <>
                          {merge.merged[0].existing.name} →{' '}
                          <span className="tnum font-medium text-text">
                            {qtyLabel(merge.merged[0].resultQty, merge.merged[0].existing.unit)}
                          </span>
                        </>
                      ) : null}
                      ).
                    </p>
                  ) : null}
                </>
              ) : (
                <Button variant="primary" size="lg" className="w-full" onClick={() => commit('new')}>
                  Criar lista com {parsed.items.length} {pluralize(parsed.items.length, 'item', 'itens')}
                </Button>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function StepLabel({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="tnum grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
        {step}
      </span>
      <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h2>
    </div>
  );
}

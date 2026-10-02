import * as React from 'react';
import { Mic } from 'lucide-react';
import { Button, Field, Input, Select, Sheet } from '@/components/ui/primitives';
import { QtyStepper } from '@/components/list/QtyStepper';
import { AISLES, CATEGORIES, UNITS, UNIT_NAMES } from '@/lib/taxonomy';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { cn } from '@/lib/cn';
import type { NewItemInput } from '@/store/lists';
import type { ProductHistory, Unit } from '@/types';
import { productKey } from '@/lib/history';

export function AddItemSheet({
  open,
  onOpenChange,
  history,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: Map<string, ProductHistory>;
  onAdd: (input: NewItemInput) => void;
}) {
  const [name, setName] = React.useState('');
  const [qty, setQty] = React.useState(1);
  const [unit, setUnit] = React.useState<Unit>('un');
  const [aisle, setAisle] = React.useState('Outros');
  const [category, setCategory] = React.useState('Outros');
  const [touchedTaxonomy, setTouchedTaxonomy] = React.useState(false);

  const voice = useSpeechInput((transcript) => {
    setName(transcript.charAt(0).toUpperCase() + transcript.slice(1));
  });

  const reset = () => {
    setName('');
    setQty(1);
    setUnit('un');
    setAisle('Outros');
    setCategory('Outros');
    setTouchedTaxonomy(false);
  };

  React.useEffect(() => {
    if (touchedTaxonomy) return;
    const known = history.get(productKey(name));
    if (!known) return;
    setAisle(known.aisle);
    setCategory(known.category);
    const lastUnit = known.prices[0]?.unit;
    if (lastUnit) setUnit(lastUnit);
  }, [name, history, touchedTaxonomy]);

  const suggestions = React.useMemo(() => {
    const needle = productKey(name);
    if (needle.length < 2) return [];
    return [...history.values()]
      .filter((entry) => entry.key.includes(needle))
      .sort((a, b) => b.timesBought - a.timesBought)
      .slice(0, 5);
  }, [name, history]);

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name, qty, unit, aisle, category });
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Adicionar item"
      description="Para o que você lembrou no corredor."
      footer={
        <Button variant="primary" size="md" className="flex-1" disabled={!name.trim()} onClick={submit}>
          Adicionar
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Descrição" htmlFor="add-name">
          <div className="flex gap-2">
            <Input
              id="add-name"
              autoFocus
              autoComplete="off"
              placeholder="Ex.: Café moído 500g"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              className="flex-1"
            />
            {voice.supported ? (
              <button
                type="button"
                aria-label={voice.listening ? 'Parar ditado' : 'Ditar por voz'}
                onClick={() => (voice.listening ? voice.stop() : voice.start())}
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] border transition-colors',
                  voice.listening
                    ? 'border-accent bg-accent text-accent-fg'
                    : 'border-border bg-surface text-text-muted hover:bg-surface-2',
                )}
              >
                <Mic size={18} className={voice.listening ? 'animate-pulse' : undefined} />
              </button>
            ) : null}
          </div>
        </Field>

        {suggestions.length ? (
          <div className="space-y-1.5">
            <p className="label">Você já comprou</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    setName(entry.label);
                    setAisle(entry.aisle);
                    setCategory(entry.category);
                    setTouchedTaxonomy(false);
                  }}
                  className="rounded-[var(--radius-pill)] border border-border bg-surface px-2.5 py-1 text-[12.5px] transition-colors hover:border-accent-border hover:bg-accent-soft"
                >
                  {entry.label}
                  <span className="tnum ml-1.5 text-[11px] text-text-faint">{entry.timesBought}×</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Field label="Unidade" htmlFor="add-unit">
            <Select id="add-unit" value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
              {UNITS.map((option) => (
                <option key={option} value={option}>
                  {UNIT_NAMES[option]} ({option})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Quantidade">
            <QtyStepper qty={qty} unit={unit} onChange={setQty} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Corredor" htmlFor="add-aisle">
            <Select
              id="add-aisle"
              value={aisle}
              onChange={(event) => {
                setAisle(event.target.value);
                setTouchedTaxonomy(true);
              }}
            >
              {AISLES.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.order === 99 ? option.name : `${option.order}. ${option.name}`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipo" htmlFor="add-category">
            <Select
              id="add-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setTouchedTaxonomy(true);
              }}
            >
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

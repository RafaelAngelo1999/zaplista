import * as React from 'react';
import { Button, Field, Input, Sheet } from '@/components/ui/primitives';
import type { ShoppingList } from '@/types';

export function ListMetaSheet({
  list,
  open,
  onOpenChange,
  onSave,
}: {
  list: ShoppingList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, market: string) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [market, setMarket] = React.useState('');

  React.useEffect(() => {
    if (list) {
      setTitle(list.title);
      setMarket(list.market ?? '');
    }
  }, [list]);

  if (!list) return null;

  const submit = () => {
    onSave(title, market);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Editar lista"
      footer={
        <Button variant="primary" size="md" className="flex-1" onClick={submit}>
          Salvar
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nome da lista" htmlFor="list-title">
          <Input
            id="list-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </Field>

        <Field
          label="Onde você compra"
          htmlFor="list-market"
          hint="Opcional. Usado para comparar preço entre mercados no Dashboard."
        >
          <Input
            id="list-market"
            placeholder="Ex.: Carrefour, Assaí…"
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </Field>
      </div>
    </Sheet>
  );
}

import * as React from 'react';
import { Download, Monitor, Moon, ShieldAlert, Sun, Upload } from 'lucide-react';
import { Button, Card, Field, Input, SegmentedControl, Switch } from '@/components/ui/primitives';
import { PageHeader } from '@/pages/ListaAtiva';
import { useToast } from '@/components/ui/Toast';
import { useSettings } from '@/store/settings';
import { useLists } from '@/store/lists';
import type { Settings, ShoppingList } from '@/types';

export function Config() {
  const toast = useToast();
  const settings = useSettings();
  const lists = useLists((state) => state.lists);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [wipeArmed, setWipeArmed] = React.useState(false);

  const exportBackup = () => {
    const payload = {
      app: 'compras',
      version: 1,
      exportedAt: new Date().toISOString(),
      lists,
      settings: {
        theme: settings.theme,
        trackPrices: settings.trackPrices,
        sortMode: settings.sortMode,
        userName: settings.userName,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compras-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.show('Backup baixado');
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { lists?: ShoppingList[] };
      if (!Array.isArray(payload.lists)) throw new Error('formato inesperado');

      useLists.setState((state) => {
        const known = new Set(state.lists.map((list) => list.id));
        const incoming = payload.lists!.filter((list) => list?.id && !known.has(list.id));
        return { lists: [...state.lists, ...incoming] };
      });

      toast.show(`Backup restaurado: ${payload.lists.length} listas no arquivo`);
    } catch {
      toast.show('Não consegui ler esse arquivo de backup');
    }
  };

  return (
    <>
      <PageHeader title="Ajustes" />

      <div className="space-y-3.5 px-3.5 py-3.5">
        <Card className="space-y-4 p-4">
          <Field label="Tema">
            <SegmentedControl<Settings['theme']>
              ariaLabel="Tema da interface"
              value={settings.theme}
              onChange={settings.setTheme}
              options={[
                { value: 'system', label: 'Sistema', icon: <Monitor size={14} /> },
                { value: 'light', label: 'Claro', icon: <Sun size={14} /> },
                { value: 'dark', label: 'Escuro', icon: <Moon size={14} /> },
              ]}
            />
          </Field>

          <ToggleRow
            label="Modo mercado"
            hint="Fonte maior e alvos de toque mais generosos, para usar com uma mão no corredor."
            checked={settings.marketMode}
            onChange={settings.setMarketMode}
          />
        </Card>

        <Card className="p-4">
          <ToggleRow
            label="Registrar preços"
            hint="Desligado, a lista é só marcar item. Ligado, aparece um campo de preço por item, o total da compra e a comparação com a última vez."
            checked={settings.trackPrices}
            onChange={settings.setTrackPrices}
          />
        </Card>

        <Card className="p-4">
          <Field
            label="Seu nome"
            htmlFor="user-name"
            hint="Usado para mostrar quem marcou cada item quando a lista for compartilhada."
          >
            <Input
              id="user-name"
              placeholder="Como te chamar"
              autoComplete="given-name"
              value={settings.userName ?? ''}
              onChange={(event) => settings.setUserName(event.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-3 p-4">
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">Backup</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
              Tudo fica salvo só neste navegador. Limpar os dados do site apaga o histórico, então
              vale baixar um backup de vez em quando.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" onClick={exportBackup}>
              <Download size={16} />
              Baixar
            </Button>
            <Button variant="secondary" size="md" onClick={() => fileInput.current?.click()}>
              <Upload size={16} />
              Restaurar
            </Button>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
              event.target.value = '';
            }}
          />
        </Card>

        <Card className="space-y-3 border-danger/25 p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">Apagar tudo</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
                Remove todas as listas e o histórico deste navegador. Não tem como desfazer — baixe
                um backup antes.
              </p>
            </div>
          </div>

          <Button
            variant="danger"
            size="md"
            className="w-full"
            onClick={() => {
              if (!wipeArmed) {
                setWipeArmed(true);
                window.setTimeout(() => setWipeArmed(false), 4000);
                return;
              }
              useLists.setState({ lists: [], activeId: null });
              setWipeArmed(false);
              toast.show('Tudo apagado');
            }}
          >
            {wipeArmed ? 'Toque de novo para confirmar' : `Apagar ${lists.length} listas`}
          </Button>
        </Card>

        <p className="px-1 pb-2 text-center text-[11.5px] text-text-faint">
          Compras · dados locais, sem conta e sem servidor
        </p>
      </div>
    </>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[14px] font-medium">
          {label}
        </label>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{hint}</p>
      </div>
      <div className="pt-0.5">
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

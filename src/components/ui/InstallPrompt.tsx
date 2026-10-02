import * as React from 'react';
import { Download, Share, Sparkles } from 'lucide-react';
import { Button, Sheet } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePwa } from '@/store/pwa';
import { cn } from '@/lib/cn';

function InstallSheetBody({ onInstalled }: { onInstalled: () => void }) {
  const { ios, canPrompt, promptInstall } = useInstallPrompt();
  const toast = useToast();

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.show('App instalado — já pode abrir pela tela de início');
      onInstalled();
    }
  };

  if (ios) {
    return (
      <ol className="space-y-3 text-[14px] text-text-muted">
        <li className="flex items-center gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            1
          </span>
          Toque no ícone de compartilhar <Share size={15} className="inline text-text" /> na barra
          do Safari
        </li>
        <li className="flex items-center gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            2
          </span>
          Escolha <strong className="font-semibold text-text">Adicionar à Tela de Início</strong>
        </li>
      </ol>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-text-muted">
        Instale o ZapLista no aparelho: abre direto da tela de início em tela cheia, e funciona
        mesmo sem internet no mercado.
      </p>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={install}
        disabled={!canPrompt}
      >
        <Download size={17} />
        Instalar agora
      </Button>
    </div>
  );
}

export function InstallHeaderButton() {
  const [open, setOpen] = React.useState(false);
  const { installed, ios, canPrompt } = useInstallPrompt();

  if (installed || !(ios || canPrompt)) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Instalar aplicativo"
        onClick={() => setOpen(true)}
        className={cn(
          'relative grid size-10 shrink-0 place-items-center rounded-full',
          'bg-accent-soft text-accent transition-transform active:scale-[0.94]',
        )}
      >
        <Sparkles size={18} />
        <span className="absolute right-1 top-1 size-2 animate-pulse rounded-full bg-accent" />
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Instalar o ZapLista"
        description="Vira um appzinho de verdade no seu celular"
      >
        <InstallSheetBody onInstalled={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

export function InstallAutoPrompt() {
  const [open, setOpen] = React.useState(false);
  const { installed, ios, canPrompt } = useInstallPrompt();
  const dismissed = usePwa((state) => state.installPromptDismissed);
  const dismissInstallPrompt = usePwa((state) => state.dismissInstallPrompt);

  React.useEffect(() => {
    if (installed || dismissed || !(ios || canPrompt)) return;
    const timer = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(timer);
  }, [installed, dismissed, ios, canPrompt]);

  if (installed || dismissed) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) dismissInstallPrompt();
      }}
      title="Instalar o ZapLista"
      description="Vira um appzinho de verdade no seu celular"
    >
      <InstallSheetBody
        onInstalled={() => {
          setOpen(false);
          dismissInstallPrompt();
        }}
      />
    </Sheet>
  );
}

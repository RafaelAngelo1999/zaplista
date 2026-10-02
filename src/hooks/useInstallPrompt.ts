import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

// iOS/iPadOS nunca dispara beforeinstallprompt — a instalação lá é manual,
// pelo botão de compartilhar do Safari.
function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIPhoneFamily = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIPadOnMacUA = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIPhoneFamily || isIPadOnMacUA;
}

export interface InstallPromptState {
  installed: boolean;
  ios: boolean;
  canPrompt: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(detectStandalone);
  const ios = React.useMemo(detectIOS, []);

  React.useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setInstalled(true);
    return outcome;
  }, [deferred]);

  return { installed, ios, canPrompt: Boolean(deferred), promptInstall };
}

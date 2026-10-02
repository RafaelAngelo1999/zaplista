import * as React from 'react';
import { cn } from '@/lib/cn';

interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface ToastContextValue {
  show: (text: string, action?: ToastMessage['action']) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DURATION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);
  const timers = React.useRef(new Map<number, number>());

  const dismiss = React.useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = React.useCallback<ToastContextValue['show']>(
    (text, action) => {
      const id = Date.now() + Math.random();
      setMessages((current) => [...current.slice(-2), { id, text, action }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), DURATION));
    },
    [dismiss],
  );

  React.useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
    },
    [],
  );

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-[420px] items-center gap-3',
              'rounded-[var(--radius-control)] border border-border-strong bg-surface px-3.5 py-2.5',
              'shadow-[var(--shadow-raised)]',
            )}
            style={{ animation: 'fade-up 180ms var(--ease-out-soft)' }}
          >
            <span className="flex-1 text-[13.5px]">{message.text}</span>
            {message.action ? (
              <button
                type="button"
                className="shrink-0 text-[13px] font-semibold text-accent"
                onClick={() => {
                  message.action?.run();
                  dismiss(message.id);
                }}
              >
                {message.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return context;
}

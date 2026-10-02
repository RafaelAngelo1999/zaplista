import * as React from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Download, History, BarChart3, Settings2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { InstallAutoPrompt } from '@/components/ui/InstallPrompt';
import { applyDocumentFlags, useSettings } from '@/store/settings';
import { usePwa } from '@/store/pwa';
import { useActiveList } from '@/store/lists';
import { useShareSync } from '@/hooks/useShareSync';
import { requestNotificationPermission, showLocalNotification } from '@/lib/notify';
import { ListaAtiva } from '@/pages/ListaAtiva';
import { Importar } from '@/pages/Importar';

const Historico = React.lazy(() =>
  import('@/pages/Historico').then((m) => ({ default: m.Historico })),
);
const Dashboard = React.lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const Config = React.lazy(() => import('@/pages/Config').then((m) => ({ default: m.Config })));
const Entrar = React.lazy(() => import('@/pages/Entrar').then((m) => ({ default: m.Entrar })));

const NAV = [
  { to: '/', label: 'Lista', icon: ClipboardList },
  { to: '/importar', label: 'Importar', icon: Download },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/config', label: 'Ajustes', icon: Settings2 },
] as const;

export default function App() {
  const theme = useSettings((state) => state.theme);
  const marketMode = useSettings((state) => state.marketMode);

  React.useEffect(() => {
    applyDocumentFlags(theme, marketMode);
  }, [theme, marketMode]);

  return (
    <ToastProvider>
      <PwaUpdateBridge />
      <ShareSyncBridge />
      <InstallAutoPrompt />
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col">
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+68px)]">
          <React.Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<ListaAtiva />} />
              <Route path="/importar" element={<Importar />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/config" element={<Config />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/entrar/:code" element={<Entrar />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}

function ShareSyncBridge() {
  const list = useActiveList();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const locationRef = React.useRef(location.pathname);
  locationRef.current = location.pathname;

  const remoteId = list?.remoteId;
  React.useEffect(() => {
    if (remoteId) requestNotificationPermission();
  }, [remoteId]);

  useShareSync(list, (message) => {
    if (document.hidden) {
      showLocalNotification('Lista atualizada', message);
      return;
    }
    if (locationRef.current === '/') {
      toast.show(message);
      return;
    }
    toast.show(message, { label: 'Ver', run: () => navigate('/') });
  });

  return null;
}

function PwaUpdateBridge() {
  const toast = useToast();
  const needRefresh = usePwa((state) => state.needRefresh);
  const offlineReady = usePwa((state) => state.offlineReady);
  const updateSW = usePwa((state) => state.updateSW);
  const setNeedRefresh = usePwa((state) => state.setNeedRefresh);
  const setOfflineReady = usePwa((state) => state.setOfflineReady);

  React.useEffect(() => {
    if (!needRefresh) return;
    toast.show('Nova versão disponível', { label: 'Atualizar', run: () => void updateSW?.(true) });
    setNeedRefresh(false);
  }, [needRefresh, updateSW, toast, setNeedRefresh]);

  React.useEffect(() => {
    if (!offlineReady) return;
    toast.show('Pronto para usar sem internet');
    setOfflineReady(false);
  }, [offlineReady, toast, setOfflineReady]);

  return null;
}

function RouteSkeleton() {
  return (
    <div className="space-y-3 px-3.5 pt-14">
      <div className="h-7 w-1/2 animate-pulse rounded-[8px] bg-surface-2" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
    </div>
  );
}

function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[640px]',
        'border-t border-border bg-surface/92 backdrop-blur-xl',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={cn(
                  'flex h-[62px] flex-col items-center justify-center gap-1',
                  'transition-colors duration-150 ease-[var(--ease-out-soft)]',
                  active ? 'text-accent' : 'text-text-faint hover:text-text-muted',
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
                <span className={cn('text-[10.5px]', active ? 'font-semibold' : 'font-medium')}>
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

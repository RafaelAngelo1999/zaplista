import * as React from 'react';
import { Link } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  ArrowDownAZ,
  ChevronDown,
  Download,
  LogIn,
  Plus,
  Search,
  Share2,
  ShoppingCart,
  Store,
  Tags,
  CheckCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  AmountDisplay,
  Button,
  Card,
  EmptyState,
  Input,
  ProgressBar,
  SegmentedControl,
  StatTile,
} from '@/components/ui/primitives';
import { ItemRow } from '@/components/list/ItemRow';
import { GroupHeader } from '@/components/list/GroupHeader';
import { ItemSheet } from '@/components/list/ItemSheet';
import { AddItemSheet } from '@/components/list/AddItemSheet';
import { useToast } from '@/components/ui/Toast';
import { InstallHeaderButton } from '@/components/ui/InstallPrompt';
import { useShareSync } from '@/hooks/useShareSync';
import { useActiveList, useAllLists, useLists } from '@/store/lists';
import { useSettings } from '@/store/settings';
import { isSharingAvailable } from '@/lib/supabase';
import { buildHistory, comparePrice, productKey } from '@/lib/history';
import { filterItems, groupItems, statsOf } from '@/lib/sort';
import { pluralize } from '@/lib/format';
import type { Item, SortMode } from '@/types';

const ShareSheet = React.lazy(() =>
  import('@/components/list/ShareSheet').then((m) => ({ default: m.ShareSheet })),
);

const SORT_OPTIONS = [
  { value: 'aisle' as SortMode, label: 'Corredor', icon: <Store size={14} /> },
  { value: 'category' as SortMode, label: 'Tipo', icon: <Tags size={14} /> },
  { value: 'alpha' as SortMode, label: 'A–Z', icon: <ArrowDownAZ size={14} /> },
];

export function ListaAtiva() {
  const list = useActiveList();
  const allLists = useAllLists();
  const toast = useToast();

  const sortMode = useSettings((state) => state.sortMode);
  const setSortMode = useSettings((state) => state.setSortMode);
  const trackPrices = useSettings((state) => state.trackPrices);
  const userName = useSettings((state) => state.userName);

  const toggleItem = useLists((state) => state.toggleItem);
  const updateItem = useLists((state) => state.updateItem);
  const removeItem = useLists((state) => state.removeItem);
  const restoreItem = useLists((state) => state.restoreItem);
  const addItem = useLists((state) => state.addItem);
  const completeList = useLists((state) => state.completeList);

  const [query, setQuery] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [showDone, setShowDone] = React.useState(false);

  const history = React.useMemo(() => buildHistory(allLists), [allLists]);

  const syncStatus = useShareSync(list);
  const shared = Boolean(list?.remoteId);

  if (!list) {
    return (
      <>
        <PageHeader title="Lista de compras" />
        <EmptyState
          icon={<ShoppingCart size={22} />}
          title="Nenhuma lista aberta"
          description="Cole o que você mandou no WhatsApp, gere o prompt, e traga o JSON da IA de volta para cá."
          action={
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/importar"
                className={cn(
                  'inline-flex h-13 items-center gap-2 rounded-[var(--radius-control)] px-5',
                  'bg-accent text-[15px] font-semibold text-accent-fg shadow-[var(--shadow-card)]',
                  'transition-transform duration-150 ease-[var(--ease-out-soft)] active:scale-[0.985]',
                )}
              >
                <Download size={17} />
                Importar uma lista
              </Link>
              {isSharingAvailable() ? (
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text"
                >
                  <LogIn size={14} />
                  Ou entrar com um código compartilhado
                </Link>
              ) : null}
            </div>
          }
        />
      </>
    );
  }

  const stats = statsOf(list.items);
  const visible = filterItems(list.items, query, false);
  const pending = visible.filter((item) => !item.checked);
  const done = visible.filter((item) => item.checked);
  const groups = groupItems(pending, sortMode);

  const handleRemove = (item: Item) => {
    const index = list.items.findIndex((candidate) => candidate.id === item.id);
    removeItem(list.id, item.id);
    toast.show(`"${item.name}" removido`, {
      label: 'Desfazer',
      run: () => restoreItem(list.id, item, index),
    });
  };

  return (
    <>
      <PageHeader
        title={list.title}
        subtitle={
          <span className="tnum">
            {stats.pending} {pluralize(stats.pending, 'item restante', 'itens restantes')}
            {stats.done > 0 ? ` · ${stats.done} no carrinho` : ''}
          </span>
        }
        action={
          <div className="flex items-center gap-0.5">
            {isSharingAvailable() ? (
              <button
                type="button"
                aria-label={shared ? 'Lista compartilhada' : 'Compartilhar lista'}
                onClick={() => setSharing(true)}
                className={cn(
                  'relative grid size-10 place-items-center rounded-full transition-colors',
                  shared
                    ? 'text-accent hover:bg-accent-soft'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                {shared ? <Users size={19} /> : <Share2 size={19} />}
                {shared && syncStatus.state === 'syncing' ? (
                  <span className="absolute right-1.5 top-1.5 size-2 animate-pulse rounded-full bg-accent" />
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={searchOpen ? 'Fechar busca' : 'Buscar item'}
              onClick={() => {
                setSearchOpen((open) => !open);
                if (searchOpen) setQuery('');
              }}
              className="grid size-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
          </div>
        }
      >
        <ProgressBar value={stats.progress} className="mt-3" />
      </PageHeader>

      <div className="space-y-3 px-3.5 pt-3.5">
        {searchOpen ? (
          <Input
            autoFocus
            placeholder="Buscar na lista…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Faltam"
            value={<span className="tnum">{stats.pending}</span>}
            hint={`de ${stats.total}`}
          />
          <StatTile
            label="No carrinho"
            value={<span className="tnum">{stats.done}</span>}
            hint={`${Math.round(stats.progress * 100)}%`}
            tone={stats.progress === 1 ? 'accent' : 'default'}
          />
          {trackPrices ? (
            <StatTile
              label="Total"
              value={<AmountDisplay value={stats.spent} size="md" />}
              hint={
                stats.pricedItems
                  ? `${stats.pricedItems} com preço`
                  : 'nenhum preço ainda'
              }
            />
          ) : (
            <StatTile
              label="A revisar"
              value={<span className="tnum">{stats.needsReview}</span>}
              hint={stats.needsReview ? 'a IA ficou na dúvida' : 'tudo conferido'}
              tone={stats.needsReview ? 'warning' : 'default'}
            />
          )}
        </div>

        <SegmentedControl
          ariaLabel="Ordenar a lista por"
          value={sortMode}
          onChange={setSortMode}
          options={SORT_OPTIONS}
        />
      </div>

      <div className="mt-3.5 space-y-3 px-3.5">
        {pending.length === 0 ? (
          <Card className="px-4 py-8 text-center">
            <CheckCheck size={22} className="mx-auto text-accent" />
            <p className="mt-3 text-[15px] font-semibold">
              {query ? 'Nada encontrado' : 'Compra concluída'}
            </p>
            <p className="mt-1 text-[13px] text-text-muted">
              {query
                ? 'Nenhum item pendente corresponde à busca.'
                : 'Todos os itens estão no carrinho.'}
            </p>
            {!query ? (
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                onClick={() => {
                  completeList(list.id);
                  toast.show('Compra encerrada e guardada no histórico');
                }}
              >
                Encerrar compra
              </Button>
            ) : null}
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.key}>
              <GroupHeader
                label={group.label}
                done={group.done}
                total={group.total}
                index={
                  sortMode === 'aisle' && group.items[0]?.aisleOrder !== 99
                    ? group.items[0]?.aisleOrder
                    : undefined
                }
              />
              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      item={item}
                      showPrice={trackPrices}
                      comparison={trackPrices ? comparePrice(history, item, list.id) : null}
                      recurrence={history.get(productKey(item.name))?.timesBought ?? null}
                      onToggle={() => toggleItem(list.id, item.id, userName)}
                      onOpen={() => setEditing(item)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}

        {done.length ? (
          <Collapsible.Root open={showDone} onOpenChange={setShowDone}>
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-[var(--radius-card)] border border-border',
                  'bg-surface-2 px-3.5 py-3 text-left transition-colors hover:bg-surface-3',
                )}
              >
                <ChevronDown
                  size={16}
                  className={cn(
                    'shrink-0 text-text-muted transition-transform duration-200 ease-[var(--ease-out-soft)]',
                    showDone && 'rotate-180',
                  )}
                />
                <span className="flex-1 text-[13.5px] font-semibold">
                  Concluídos <span className="tnum font-medium text-text-muted">({done.length})</span>
                </span>
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <Card className="mt-2 overflow-hidden">
                <ul className="divide-y divide-border">
                  {done.map((item) => (
                    <li key={item.id}>
                      <ItemRow
                        item={item}
                        showPrice={trackPrices}
                        comparison={trackPrices ? comparePrice(history, item, list.id) : null}
                        recurrence={null}
                        onToggle={() => toggleItem(list.id, item.id, userName)}
                        onOpen={() => setEditing(item)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            </Collapsible.Content>
          </Collapsible.Root>
        ) : null}

        {pending.length > 0 && stats.done > 0 ? (
          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={() => {
              completeList(list.id);
              toast.show('Compra encerrada e guardada no histórico');
            }}
          >
            Encerrar compra com {stats.pending} {pluralize(stats.pending, 'item pendente', 'itens pendentes')}
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Adicionar item"
        onClick={() => setAdding(true)}
        className={cn(
          'fixed bottom-[calc(env(safe-area-inset-bottom)+78px)] right-4 z-30 grid size-14 place-items-center',
          'rounded-full bg-accent text-accent-fg shadow-[var(--shadow-raised)]',
          'transition-transform duration-150 ease-[var(--ease-out-soft)] active:scale-92',
          'sm:right-[calc(50%-320px+1rem)]',
        )}
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <ItemSheet
        item={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        showPrice={trackPrices}
        history={editing ? (history.get(productKey(editing.name)) ?? null) : null}
        onSave={(patch) => editing && updateItem(list.id, editing.id, patch)}
        onDelete={() => editing && handleRemove(editing)}
      />

      <AddItemSheet
        open={adding}
        onOpenChange={setAdding}
        history={history}
        onAdd={(input) => {
          addItem(list.id, input);
          toast.show(`"${input.name}" adicionado`);
        }}
      />

      {isSharingAvailable() ? (
        <React.Suspense fallback={null}>
          <ShareSheet list={list} open={sharing} onOpenChange={setSharing} syncStatus={syncStatus} />
        </React.Suspense>
      ) : null}
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const publish = () =>
      document.documentElement.style.setProperty('--header-h', `${element.offsetHeight}px`);

    const observer = new ResizeObserver(publish);
    observer.observe(element);
    publish();

    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      className="sticky top-0 z-30 border-b border-border bg-bg/92 px-3.5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] backdrop-blur-xl"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em]">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[13px] text-text-muted">{subtitle}</p> : null}
        </div>
        <InstallHeaderButton />
        {action}
      </div>
      {children}
    </header>
  );
}

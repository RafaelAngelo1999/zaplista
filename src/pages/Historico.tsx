import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkPlus,
  Check,
  Copy,
  History as HistoryIcon,
  Play,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/cn';
import { AmountDisplay, Button, Card, Chip, EmptyState } from '@/components/ui/primitives';
import { PageHeader } from '@/pages/ListaAtiva';
import { useToast } from '@/components/ui/Toast';
import { useAllLists, useLists, useTemplates } from '@/store/lists';
import { useSettings } from '@/store/settings';
import { statsOf, groupItems } from '@/lib/sort';
import { fullDate, pluralize, timeAgo, qtyLabel } from '@/lib/format';
import type { ShoppingList } from '@/types';

export function Historico() {
  const lists = useAllLists();
  const templates = useTemplates();
  const aisleOrder = useSettings((state) => state.aisleOrder);
  const navigate = useNavigate();
  const toast = useToast();

  const setActive = useLists((state) => state.setActive);
  const deleteList = useLists((state) => state.deleteList);
  const duplicateList = useLists((state) => state.duplicateList);
  const reopenList = useLists((state) => state.reopenList);
  const saveAsTemplate = useLists((state) => state.saveAsTemplate);
  const useTemplateAction = useLists((state) => state.useTemplate);

  const [confirming, setConfirming] = React.useState<string | null>(null);

  const active = lists.filter((list) => list.status === 'ativa');
  const finished = lists.filter((list) => list.status === 'concluida' || list.status === 'arquivada');

  if (!lists.length) {
    return (
      <>
        <PageHeader title="Histórico" />
        <EmptyState
          icon={<HistoryIcon size={22} />}
          title="Nenhuma lista ainda"
          description="Suas compras ficam guardadas aqui, no seu navegador. Dá para duplicar uma antiga para comprar de novo."
        />
      </>
    );
  }

  const shareAsText = async (list: ShoppingList) => {
    const groups = groupItems(list.items, 'aisle', aisleOrder);
    const text = [
      `*${list.title}*`,
      '',
      ...groups.flatMap((group) => [
        `*${group.label}*`,
        ...group.items.map(
          (item) => `${item.checked ? '✅' : '▫️'} ${item.name} — ${qtyLabel(item.qty, item.unit)}`,
        ),
        '',
      ]),
    ].join('\n');

    const ok = await copyToClipboard(text.trim());
    toast.show(ok ? 'Lista copiada — cole no WhatsApp' : 'Não consegui copiar');
  };

  const handleSaveAsTemplate = (list: ShoppingList) => {
    saveAsTemplate(list.id);
    toast.show(`"${list.title}" salva como modelo`);
  };

  return (
    <>
      <PageHeader
        title="Histórico"
        subtitle={`${lists.length} ${pluralize(lists.length, 'lista guardada', 'listas guardadas')} neste navegador`}
      />

      <div className="space-y-3.5 px-3.5 py-3.5">
        {active.length ? (
          <section className="space-y-2">
            <p className="label px-1">Em andamento</p>
            {active.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                confirming={confirming === list.id}
                onOpen={() => {
                  setActive(list.id);
                  navigate('/');
                }}
                onDuplicate={() => {
                  duplicateList(list.id);
                  toast.show('Lista duplicada');
                  navigate('/');
                }}
                onShare={() => shareAsText(list)}
                onSaveAsTemplate={() => handleSaveAsTemplate(list)}
                onDelete={() => {
                  if (confirming !== list.id) {
                    setConfirming(list.id);
                    window.setTimeout(() => setConfirming(null), 4000);
                    return;
                  }
                  deleteList(list.id);
                  setConfirming(null);
                  toast.show('Lista apagada');
                }}
              />
            ))}
          </section>
        ) : null}

        {templates.length ? (
          <section className="space-y-2">
            <p className="label px-1">Modelos</p>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => {
                  useTemplateAction(template.id);
                  toast.show(`Nova lista criada a partir de "${template.title}"`);
                  navigate('/');
                }}
                onDelete={() => {
                  deleteList(template.id);
                  toast.show('Modelo apagado');
                }}
              />
            ))}
          </section>
        ) : null}

        {finished.length ? (
          <section className="space-y-2">
            <p className="label px-1">Compras encerradas</p>
            {finished.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                confirming={confirming === list.id}
                onOpen={() => {
                  reopenList(list.id);
                  navigate('/');
                }}
                onDuplicate={() => {
                  duplicateList(list.id);
                  toast.show('Nova lista criada a partir desta');
                  navigate('/');
                }}
                onShare={() => shareAsText(list)}
                onSaveAsTemplate={() => handleSaveAsTemplate(list)}
                onDelete={() => {
                  if (confirming !== list.id) {
                    setConfirming(list.id);
                    window.setTimeout(() => setConfirming(null), 4000);
                    return;
                  }
                  deleteList(list.id);
                  setConfirming(null);
                  toast.show('Lista apagada');
                }}
              />
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

function ListCard({
  list,
  confirming,
  onOpen,
  onDuplicate,
  onShare,
  onSaveAsTemplate,
  onDelete,
}: {
  list: ShoppingList;
  confirming: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
}) {
  const stats = statsOf(list.items);
  const finished = list.status !== 'ativa';

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full px-4 pb-3 pt-3.5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{list.title}</h3>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              {finished
                ? `Encerrada ${timeAgo(list.completedAt)} · ${fullDate(list.completedAt)}`
                : `Atualizada ${timeAgo(list.updatedAt)}`}
            </p>
          </div>
          {stats.spent > 0 ? <AmountDisplay value={stats.spent} size="md" /> : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Chip tone={finished ? 'default' : 'accent'}>
            <span className="tnum">
              {stats.done}/{stats.total}
            </span>{' '}
            {pluralize(stats.total, 'item', 'itens')}
          </Chip>
          {list.market ? <Chip tone="default">{list.market}</Chip> : null}
          {!finished && stats.pending > 0 ? (
            <Chip tone="muted">
              <span className="tnum">{stats.pending}</span> faltando
            </Chip>
          ) : null}
        </div>
      </button>

      <div className="flex border-t border-border">
        <CardAction icon={finished ? <Undo2 size={15} /> : undefined} label={finished ? 'Reabrir' : 'Abrir'} onClick={onOpen} />
        <CardAction icon={<Copy size={15} />} label="Duplicar" onClick={onDuplicate} />
        <CardAction icon={<BookmarkPlus size={15} />} label="Salvar como modelo" onClick={onSaveAsTemplate} />
        <CardAction icon={<Share2 size={15} />} label="Copiar como texto" onClick={onShare} />
        <CardAction
          icon={confirming ? <Check size={15} /> : <Trash2 size={15} />}
          label={confirming ? 'Confirmar exclusão' : 'Apagar'}
          tone={confirming ? 'danger' : 'default'}
          onClick={onDelete}
        />
      </div>
    </Card>
  );
}

function TemplateCard({
  template,
  onUse,
  onDelete,
}: {
  template: ShoppingList;
  onUse: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{template.title}</h3>
          <p className="mt-0.5 text-[12.5px] text-text-muted">
            {pluralize(template.items.length, 'item', 'itens')}
          </p>
        </div>
      </div>

      <div className="flex border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUse}
          className="flex-1 rounded-none border-r border-border font-semibold text-accent"
        >
          <Play size={14} />
          Usar esta lista
        </Button>
        <CardAction icon={<Trash2 size={15} />} label="Apagar modelo" onClick={onDelete} />
      </div>
    </Card>
  );
}

function CardAction({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-none border-r border-border last:border-r-0',
        tone === 'danger' && 'bg-danger-soft text-danger',
      )}
    >
      {icon}
    </Button>
  );
}

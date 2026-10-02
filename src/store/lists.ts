import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { applyMerge } from '@/lib/merge';
import { aisleOrderOf } from '@/lib/taxonomy';
import type { RemoteList } from '@/lib/share';
import type { Item, ShoppingList, Unit } from '@/types';

interface ListsState {
  lists: ShoppingList[];
  activeId: string | null;

  createList: (title?: string, items?: Item[]) => string;
  deleteList: (id: string) => void;
  setActive: (id: string) => void;
  renameList: (id: string, title: string) => void;
  setMarket: (id: string, market: string) => void;
  completeList: (id: string) => void;
  reopenList: (id: string) => void;
  duplicateList: (id: string, options?: { onlyUnchecked?: boolean }) => string;

  importIntoActive: (items: Item[], mode: 'replace' | 'merge') => void;

  toggleItem: (listId: string, itemId: string, by?: string) => void;
  updateItem: (listId: string, itemId: string, patch: Partial<Item>) => void;
  removeItem: (listId: string, itemId: string) => Item | null;
  restoreItem: (listId: string, item: Item, index: number) => void;
  addItem: (listId: string, input: NewItemInput) => void;
  uncheckAll: (listId: string) => void;
  clearChecked: (listId: string) => void;
  confirmReview: (listId: string, itemId: string) => void;

  linkShare: (listId: string, remote: RemoteList) => void;
  applyRemote: (listId: string, remote: RemoteList) => void;
  unlinkShare: (listId: string) => void;
}

export interface NewItemInput {
  name: string;
  qty: number;
  unit: Unit;
  aisle: string;
  category: string;
  notes?: string;
}

const now = () => new Date().toISOString();

function touch(list: ShoppingList): ShoppingList {
  return { ...list, updatedAt: now() };
}

function mapList(
  lists: ShoppingList[],
  id: string,
  fn: (list: ShoppingList) => ShoppingList,
): ShoppingList[] {
  return lists.map((list) => (list.id === id ? fn(list) : list));
}

function mapItems(
  list: ShoppingList,
  fn: (items: Item[]) => Item[],
): ShoppingList {
  return touch({ ...list, items: fn(list.items) });
}

export const useLists = create<ListsState>()(
  persist(
    (set, get) => ({
      lists: [],
      activeId: null,

      createList: (title, items = []) => {
        const id = nanoid(10);
        const timestamp = now();
        const list: ShoppingList = {
          id,
          title: title?.trim() || defaultTitle(),
          status: 'ativa',
          items,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({ lists: [list, ...state.lists], activeId: id }));
        return id;
      },

      deleteList: (id) =>
        set((state) => {
          const lists = state.lists.filter((list) => list.id !== id);
          const activeId =
            state.activeId === id ? (lists.find((l) => l.status === 'ativa')?.id ?? null) : state.activeId;
          return { lists, activeId };
        }),

      setActive: (id) => set({ activeId: id }),

      renameList: (id, title) =>
        set((state) => ({
          lists: mapList(state.lists, id, (list) => touch({ ...list, title: title.trim() || list.title })),
        })),

      setMarket: (id, market) =>
        set((state) => ({
          lists: mapList(state.lists, id, (list) => touch({ ...list, market: market.trim() || undefined })),
        })),

      completeList: (id) =>
        set((state) => ({
          lists: mapList(state.lists, id, (list) =>
            touch({ ...list, status: 'concluida', completedAt: now() }),
          ),
        })),

      reopenList: (id) =>
        set((state) => ({
          lists: mapList(state.lists, id, (list) =>
            touch({ ...list, status: 'ativa', completedAt: undefined }),
          ),
          activeId: id,
        })),

      duplicateList: (id, options) => {
        const source = get().lists.find((list) => list.id === id);
        if (!source) return '';

        const timestamp = now();
        const picked = options?.onlyUnchecked
          ? source.items.filter((item) => !item.checked)
          : source.items;

        const items: Item[] = picked.map((item) => ({
          ...item,
          id: nanoid(10),
          checked: false,
          checkedAt: undefined,
          checkedBy: undefined,
          price: undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        }));

        return get().createList(`${source.title} (cópia)`, items);
      },

      importIntoActive: (items, mode) =>
        set((state) => {
          const id = state.activeId;
          if (!id) return state;
          return {
            lists: mapList(state.lists, id, (list) =>
              mapItems(list, (current) => (mode === 'replace' ? items : applyMerge(current, items))),
            ),
          };
        }),

      toggleItem: (listId, itemId, by) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) =>
              items.map((item) => {
                if (item.id !== itemId) return item;
                const checked = !item.checked;
                return {
                  ...item,
                  checked,
                  checkedAt: checked ? now() : undefined,
                  checkedBy: checked ? by : undefined,
                  updatedAt: now(),
                };
              }),
            ),
          ),
        })),

      updateItem: (listId, itemId, patch) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) =>
              items.map((item) => {
                if (item.id !== itemId) return item;
                const next: Item = { ...item, ...patch, updatedAt: now() };
                if (patch.qty !== undefined && patch.qty !== item.qty) next.qtyAssumed = false;
                if (patch.aisle !== undefined) next.aisleOrder = aisleOrderOf(patch.aisle);
                return next;
              }),
            ),
          ),
        })),

      removeItem: (listId, itemId) => {
        const list = get().lists.find((l) => l.id === listId);
        const removed = list?.items.find((item) => item.id === itemId) ?? null;
        set((state) => ({
          lists: mapList(state.lists, listId, (l) =>
            mapItems(l, (items) => items.filter((item) => item.id !== itemId)),
          ),
        }));
        return removed;
      },

      restoreItem: (listId, item, index) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) => {
              const next = [...items];
              next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
              return next;
            }),
          ),
        })),

      addItem: (listId, input) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) => [
              ...items,
              {
                id: nanoid(10),
                name: input.name.trim(),
                qty: input.qty,
                unit: input.unit,
                qtyAssumed: false,
                aisle: input.aisle,
                aisleOrder: aisleOrderOf(input.aisle),
                category: input.category,
                notes: input.notes?.trim() || undefined,
                checked: false,
                createdAt: now(),
                updatedAt: now(),
              },
            ]),
          ),
        })),

      uncheckAll: (listId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) =>
              items.map((item) => ({
                ...item,
                checked: false,
                checkedAt: undefined,
                updatedAt: now(),
              })),
            ),
          ),
        })),

      clearChecked: (listId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) => items.filter((item) => !item.checked)),
          ),
        })),

      confirmReview: (listId, itemId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            mapItems(list, (items) =>
              items.map((item) =>
                item.id === itemId ? { ...item, needsReview: false, updatedAt: now() } : item,
              ),
            ),
          ),
        })),

      linkShare: (listId, remote) => get().applyRemote(listId, remote),

      applyRemote: (listId, remote) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) => ({
            ...list,
            title: remote.title,
            items: remote.items,
            remoteId: remote.id,
            shareCode: remote.shareCode,
            revision: remote.revision,
            updatedAt: remote.updatedAt,
          })),
        })),

      unlinkShare: (listId) =>
        set((state) => ({
          lists: mapList(state.lists, listId, (list) =>
            touch({
              ...list,
              remoteId: undefined,
              shareCode: undefined,
              revision: undefined,
            }),
          ),
        })),
    }),
    {
      name: 'compras:lists:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lists: state.lists, activeId: state.activeId }),
    },
  ),
);

function defaultTitle(): string {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
  return `Compra de ${label}`;
}

export function useActiveList(): ShoppingList | null {
  return useLists((state) => state.lists.find((list) => list.id === state.activeId) ?? null);
}

export function useAllLists(): ShoppingList[] {
  return useLists((state) => state.lists);
}

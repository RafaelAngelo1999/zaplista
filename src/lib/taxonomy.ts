import type { Unit } from '@/types';

export interface Aisle {
  order: number;
  name: string;
}

export const AISLES: readonly Aisle[] = [
  { order: 1, name: 'Hortifruti' },
  { order: 2, name: 'Padaria' },
  { order: 3, name: 'Frios e Laticínios' },
  { order: 4, name: 'Carnes e Peixes' },
  { order: 5, name: 'Congelados' },
  { order: 6, name: 'Mercearia Salgada' },
  { order: 7, name: 'Mercearia Doce' },
  { order: 8, name: 'Matinais' },
  { order: 9, name: 'Bebidas' },
  { order: 10, name: 'Limpeza' },
  { order: 11, name: 'Higiene e Beleza' },
  { order: 12, name: 'Bebê' },
  { order: 13, name: 'Pet' },
  { order: 14, name: 'Utilidades e Bazar' },
  { order: 15, name: 'Farmácia' },
  { order: 99, name: 'Outros' },
] as const;

export const FALLBACK_AISLE: Aisle = { order: 99, name: 'Outros' };

export const CATEGORIES: readonly string[] = [
  'Frutas',
  'Legumes',
  'Verduras',
  'Carnes vermelhas',
  'Aves',
  'Peixes',
  'Leite e derivados',
  'Queijos e embutidos',
  'Pães',
  'Grãos e cereais',
  'Massas',
  'Molhos e conservas',
  'Óleos e temperos',
  'Biscoitos e snacks',
  'Doces e sobremesas',
  'Café e chá',
  'Bebidas não alcoólicas',
  'Bebidas alcoólicas',
  'Limpeza de casa',
  'Limpeza de roupas',
  'Higiene pessoal',
  'Beleza',
  'Papelaria e utilidades',
  'Descartáveis',
  'Pet',
  'Bebê',
  'Medicamentos',
  'Outros',
] as const;

export const FALLBACK_CATEGORY = 'Outros';

export const UNITS: readonly Unit[] = ['un', 'kg', 'g', 'l', 'ml', 'pct', 'cx', 'dz', 'bdj', 'fd'];

export const UNIT_LABELS: Record<Unit, string> = {
  un: 'un',
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  pct: 'pct',
  cx: 'cx',
  dz: 'dz',
  bdj: 'bdj',
  fd: 'fd',
};

export const UNIT_NAMES: Record<Unit, string> = {
  un: 'unidade',
  kg: 'quilo',
  g: 'grama',
  l: 'litro',
  ml: 'mililitro',
  pct: 'pacote',
  cx: 'caixa',
  dz: 'dúzia',
  bdj: 'bandeja',
  fd: 'fardo',
};

const aisleByNormalizedName = new Map<string, Aisle>();
const aisleByOrder = new Map<number, Aisle>();

for (const aisle of AISLES) {
  aisleByNormalizedName.set(normalizeKey(aisle.name), aisle);
  aisleByOrder.set(aisle.order, aisle);
}

const categoryByNormalizedName = new Map<string, string>();
for (const category of CATEGORIES) {
  categoryByNormalizedName.set(normalizeKey(category), category);
}

export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveAisle(name?: unknown, order?: unknown): Aisle {
  if (typeof name === 'string' && name.trim()) {
    const byName = aisleByNormalizedName.get(normalizeKey(name));
    if (byName) return byName;
  }
  if (typeof order === 'number' && Number.isFinite(order)) {
    const byOrder = aisleByOrder.get(order);
    if (byOrder) return byOrder;
  }
  return FALLBACK_AISLE;
}

export function resolveCategory(name?: unknown): string {
  if (typeof name === 'string' && name.trim()) {
    const found = categoryByNormalizedName.get(normalizeKey(name));
    if (found) return found;
  }
  return FALLBACK_CATEGORY;
}

export function resolveUnit(value?: unknown): Unit {
  if (typeof value !== 'string') return 'un';
  const key = normalizeKey(value).replace(/\./g, '');
  const direct = UNITS.find((u) => u === key);
  if (direct) return direct;

  const synonyms: Record<string, Unit> = {
    unidade: 'un',
    unidades: 'un',
    u: 'un',
    quilo: 'kg',
    quilos: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    k: 'kg',
    grama: 'g',
    gramas: 'g',
    gr: 'g',
    litro: 'l',
    litros: 'l',
    lt: 'l',
    mililitro: 'ml',
    mililitros: 'ml',
    pacote: 'pct',
    pacotes: 'pct',
    pc: 'pct',
    pack: 'pct',
    caixa: 'cx',
    caixas: 'cx',
    duzia: 'dz',
    duzias: 'dz',
    bandeja: 'bdj',
    bandejas: 'bdj',
    fardo: 'fd',
    fardos: 'fd',
    garrafa: 'un',
    lata: 'un',
    sache: 'un',
  };
  return synonyms[key] ?? 'un';
}

export function aisleOrderOf(name: string): number {
  return aisleByNormalizedName.get(normalizeKey(name))?.order ?? FALLBACK_AISLE.order;
}

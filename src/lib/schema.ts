import { z } from 'zod';
import { nanoid } from 'nanoid';
import { resolveAisle, resolveCategory, resolveUnit } from '@/lib/taxonomy';
import type { Item } from '@/types';

const rawItemSchema = z
  .object({
    name: z.unknown(),
    rawText: z.unknown().optional(),
    qty: z.unknown().optional(),
    unit: z.unknown().optional(),
    qtyAssumed: z.unknown().optional(),
    aisle: z.unknown().optional(),
    aisleOrder: z.unknown().optional(),
    category: z.unknown().optional(),
    notes: z.unknown().optional(),
    confidence: z.unknown().optional(),
    needsReview: z.unknown().optional(),
    checked: z.unknown().optional(),
    price: z.unknown().optional(),
  })
  .loose();

const itemsSchema = z.array(rawItemSchema);

function pickItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.itens)) return record.itens;
    if (Array.isArray(record.produtos)) return record.produtos;
  }
  return null;
}

function pickTitle(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return toText(record.title) ?? toText(record.titulo) ?? toText(record.nome);
}

const WORD_NUMBERS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  dozena: 12,
  duzia: 12,
  meio: 0.5,
  meia: 0.5,
};

function toQty(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 1000) / 1000;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;

    const word = WORD_NUMBERS[trimmed.normalize('NFD').replace(/[̀-ͯ]/g, '')];
    if (word) return word;

    const numeric = trimmed.replace(',', '.').match(/-?\d+(\.\d+)?/);
    if (numeric) {
      const parsed = Number(numeric[0]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function toText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    if (key === 'true' || key === 'sim' || key === '1') return true;
    if (key === 'false' || key === 'nao' || key === 'não' || key === '0') return false;
  }
  return undefined;
}

function toConfidence(value: unknown): number | undefined {
  const num = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) return undefined;
  const normalized = num > 1 ? num / 100 : num;
  return Math.min(1, Math.max(0, Math.round(normalized * 100) / 100));
}

function toPrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface ParsedPayload {
  title?: string;
  items: Item[];
  skipped: number;
  coerced: number;
}

export interface ValidationResult {
  ok: boolean;
  data?: ParsedPayload;
  error?: string;
}

export function validatePayload(value: unknown): ValidationResult {
  const candidate = pickItems(value);
  if (!candidate) {
    return {
      ok: false,
      error:
        'O JSON foi lido, mas não tem o formato esperado. Precisa ser { "items": [...] } ou uma lista de itens.',
    };
  }

  const parsed = itemsSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: 'A lista de itens do JSON tem entradas que não são objetos.' };
  }

  const rawItems = parsed.data;
  const title = pickTitle(value);

  const now = new Date().toISOString();
  const items: Item[] = [];
  let skipped = 0;
  let coerced = 0;

  for (const raw of rawItems) {
    const name = toText(raw.name);
    if (!name) {
      skipped++;
      continue;
    }

    const aisle = resolveAisle(raw.aisle, raw.aisleOrder);
    const category = resolveCategory(raw.category);

    const aisleMissed = Boolean(toText(raw.aisle)) && aisle.name === 'Outros';
    const categoryMissed = Boolean(toText(raw.category)) && category === 'Outros';
    if (aisleMissed || categoryMissed) coerced++;

    const qty = toQty(raw.qty);
    const confidence = toConfidence(raw.confidence);
    const explicitReview = toBool(raw.needsReview);

    items.push({
      id: nanoid(10),
      name: capitalize(name),
      rawText: toText(raw.rawText),
      qty: qty ?? 1,
      unit: resolveUnit(raw.unit),
      qtyAssumed: toBool(raw.qtyAssumed) ?? qty === null,
      aisle: aisle.name,
      aisleOrder: aisle.order,
      category,
      notes: toText(raw.notes),
      checked: toBool(raw.checked) ?? false,
      price: toPrice(raw.price),
      confidence,
      needsReview:
        explicitReview ?? (confidence !== undefined ? confidence < 0.7 : aisleMissed || categoryMissed),
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!items.length) {
    return { ok: false, error: 'Nenhum item aproveitável no JSON. Confira se o campo "name" está preenchido.' };
  }

  return { ok: true, data: { title, items, skipped, coerced } };
}

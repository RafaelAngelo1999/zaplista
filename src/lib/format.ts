import { UNIT_LABELS } from '@/lib/taxonomy';
import type { Unit } from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  return brl.format(value);
}

export function moneyParts(value: number | undefined | null): { symbol: string; amount: string } {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return { symbol: 'R$', amount: '—' };
  }
  return { symbol: 'R$', amount: brlCompact.format(value) };
}

export function qtyLabel(qty: number, unit: Unit): string {
  const rounded = Math.round(qty * 1000) / 1000;
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(rounded < 1 ? 1 : 2).replace('.', ',').replace(/,?0+$/, '');
  return `${formatted} ${UNIT_LABELS[unit]}`;
}

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function timeAgo(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.round(diff / 86_400_000);

  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / 3_600_000);
    if (Math.abs(hours) < 1) return 'agora';
    return relative.format(-hours, 'hour');
  }
  if (Math.abs(days) < 30) return relative.format(-days, 'day');
  if (Math.abs(days) < 365) return relative.format(-Math.round(days / 30), 'month');
  return relative.format(-Math.round(days / 365), 'year');
}

const dateShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const dateFull = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

export function shortDate(iso: string | undefined): string {
  if (!iso) return '—';
  return dateShort.format(new Date(iso));
}

export function fullDate(iso: string | undefined): string {
  if (!iso) return '—';
  return dateFull.format(new Date(iso));
}

export function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthName(key: string): string {
  const [year, month] = key.split('-');
  return monthLabel.format(new Date(Number(year), Number(month) - 1, 1));
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

import * as React from 'react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

function Tooltip({
  x,
  y,
  children,
  width,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  width: number;
}) {
  const clamped = Math.min(Math.max(x, 70), Math.max(width - 70, 70));
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[10px] border border-border-strong bg-surface px-2.5 py-1.5 text-[12px] shadow-[var(--shadow-raised)]"
      style={{ left: clamped, top: y - 8 }}
    >
      {children}
    </div>
  );
}

export function ChartFrame({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h2>
          {hint ? <p className="mt-0.5 text-[12px] text-text-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-8 text-center text-[13px] leading-relaxed text-text-muted">{children}</p>
  );
}

export interface MonthlyPoint {
  label: string;
  value: number;
}

export function MonthlyBars({
  data,
  formatValue,
  valueLabel,
}: {
  data: MonthlyPoint[];
  formatValue: (value: number) => string;
  valueLabel: string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  const height = 160;
  const padBottom = 22;
  const padTop = 18;
  const plotHeight = height - padBottom - padTop;
  const max = Math.max(...data.map((d) => d.value), 1);

  const gap = 2;
  const slot = width > 0 ? width / data.length : 0;
  const barWidth = Math.max(6, Math.min(44, slot - gap * 2));

  const maxIndex = data.reduce((best, point, index) => (point.value > (data[best]?.value ?? 0) ? index : best), 0);
  const labelled = new Set([maxIndex, data.length - 1]);

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={`${valueLabel} por mês`}>
          {[0, 0.5, 1].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={width}
              y1={padTop + plotHeight * fraction}
              y2={padTop + plotHeight * fraction}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray={fraction === 1 ? undefined : '3 4'}
            />
          ))}

          {data.map((point, index) => {
            const barHeight = Math.max(point.value > 0 ? 3 : 0, (point.value / max) * plotHeight);
            const x = slot * index + (slot - barWidth) / 2;
            const y = padTop + plotHeight - barHeight;
            const active = hover === index;

            return (
              <g key={point.label}>
                <rect
                  x={slot * index}
                  y={0}
                  width={slot}
                  height={height}
                  fill="transparent"
                  onPointerEnter={() => setHover(index)}
                  onPointerLeave={() => setHover(null)}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill="var(--color-accent)"
                  opacity={hover === null || active ? 1 : 0.45}
                  className="transition-opacity duration-150"
                  pointerEvents="none"
                />
                {labelled.has(index) && point.value > 0 ? (
                  <text
                    x={slot * index + slot / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="tnum"
                    fontSize={10.5}
                    fontWeight={600}
                    fill="var(--color-text-muted)"
                    pointerEvents="none"
                  >
                    {formatValue(point.value)}
                  </text>
                ) : null}
                <text
                  x={slot * index + slot / 2}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill="var(--color-text-faint)"
                  pointerEvents="none"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}

      {hover !== null && data[hover] ? (
        <Tooltip x={slot * hover + slot / 2} y={padTop} width={width}>
          <span className="font-semibold">{data[hover].label}</span>
          <span className="tnum ml-2">{formatValue(data[hover].value)}</span>
          <span className="ml-1 text-text-muted">{valueLabel}</span>
        </Tooltip>
      ) : null}
    </div>
  );
}

export interface RankedBar {
  label: string;
  value: number;
  secondary?: string;
}

export function RankedBars({
  data,
  formatValue,
}: {
  data: RankedBar[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((bar) => (
        <li key={bar.label} className="group">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium">{bar.label}</span>
            <span className="tnum shrink-0 text-[12.5px] font-semibold">
              {formatValue(bar.value)}
              {bar.secondary ? (
                <span className="ml-1.5 font-normal text-text-faint">{bar.secondary}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-[var(--ease-out-soft)]"
              style={{ width: `${Math.max(2, (bar.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface PricePoint {
  at: string;
  price: number;
  label: string;
}

export function PriceLine({ data }: { data: PricePoint[] }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  const height = 150;
  const padX = 14;
  const padTop = 22;
  const padBottom = 24;
  const plotHeight = height - padTop - padBottom;
  const plotWidth = Math.max(width - padX * 2, 1);

  const values = data.map((d) => d.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  const low = min - span * 0.12;
  const high = max + span * 0.12;

  const xAt = (index: number) =>
    data.length === 1 ? padX + plotWidth / 2 : padX + (index / (data.length - 1)) * plotWidth;
  const yAt = (price: number) => padTop + plotHeight - ((price - low) / (high - low)) * plotHeight;

  const path = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(point.price)}`).join(' ');
  const area = `${path} L ${xAt(data.length - 1)} ${padTop + plotHeight} L ${xAt(0)} ${padTop + plotHeight} Z`;

  const lastIndex = data.length - 1;

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Preço registrado ao longo do tempo"
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <line
            x1={0}
            x2={width}
            y1={padTop + plotHeight}
            y2={padTop + plotHeight}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {data.length > 1 ? <path d={area} fill="url(#price-fill)" /> : null}

          <path
            d={path}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((point, index) => {
            const cx = xAt(index);
            const cy = yAt(point.price);
            const active = hover === index;
            const isEdge = index === 0 || index === lastIndex;

            return (
              <g key={`${point.at}-${index}`}>
                <rect
                  x={cx - 16}
                  y={0}
                  width={32}
                  height={height}
                  fill="transparent"
                  onPointerEnter={() => setHover(index)}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 5.5 : 4}
                  fill="var(--color-accent)"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  pointerEvents="none"
                  className="transition-all duration-150"
                />
                {isEdge ? (
                  <text
                    x={cx}
                    y={cy - 11}
                    textAnchor={index === 0 ? 'start' : 'end'}
                    className="tnum"
                    fontSize={10.5}
                    fontWeight={600}
                    fill="var(--color-text-muted)"
                    pointerEvents="none"
                  >
                    {money(point.price)}
                  </text>
                ) : null}
                {isEdge ? (
                  <text
                    x={cx}
                    y={height - 6}
                    textAnchor={index === 0 ? 'start' : 'end'}
                    fontSize={10.5}
                    fill="var(--color-text-faint)"
                    pointerEvents="none"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}

      {hover !== null && data[hover] ? (
        <Tooltip x={xAt(hover)} y={yAt(data[hover].price)} width={width}>
          <span className="tnum font-semibold">{money(data[hover].price)}</span>
          <span className="ml-2 text-text-muted">{data[hover].label}</span>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function TrendBadge({ percent, className }: { percent: number; className?: string }) {
  const up = percent > 0;
  const flat = Math.abs(percent) < 0.1;

  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[11.5px] font-semibold',
        flat && 'bg-surface-2 text-text-muted',
        !flat && up && 'bg-danger-soft text-danger',
        !flat && !up && 'bg-accent-soft text-accent',
        className,
      )}
    >
      <span aria-hidden>{flat ? '→' : up ? '↑' : '↓'}</span>
      {flat ? 'estável' : `${Math.abs(percent).toFixed(1).replace('.', ',')}%`}
    </span>
  );
}

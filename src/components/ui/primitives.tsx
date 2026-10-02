import * as React from 'react';
import * as RadixToggleGroup from '@radix-ui/react-toggle-group';
import * as RadixSwitch from '@radix-ui/react-switch';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moneyParts } from '@/lib/format';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover shadow-[var(--shadow-card)] font-semibold',
  secondary:
    'bg-surface text-text border border-border hover:border-border-strong hover:bg-surface-2 font-medium',
  ghost: 'text-text-muted hover:text-text hover:bg-surface-2 font-medium',
  danger: 'bg-danger-soft text-danger hover:brightness-95 font-medium',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-4 text-[14px] gap-2 rounded-[var(--radius-control)]',
  lg: 'h-13 px-5 text-[15px] gap-2 rounded-[var(--radius-control)]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap',
        'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-soft)]',
        'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
        buttonSizes[size],
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('label', className)}>{children}</p>;
}

export function AmountDisplay({
  value,
  size = 'md',
  className,
  muted,
}: {
  value: number | undefined | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  muted?: boolean;
}) {
  const { symbol, amount } = moneyParts(value);
  const sizes = {
    sm: { amount: 'text-[13px]', symbol: 'text-[10px]' },
    md: { amount: 'text-[15px]', symbol: 'text-[11px]' },
    lg: { amount: 'text-[22px]', symbol: 'text-[12px]' },
    xl: { amount: 'text-[32px] leading-none', symbol: 'text-[14px]' },
  }[size];

  return (
    <span
      className={cn(
        'tnum inline-flex items-baseline gap-1 font-semibold',
        muted && 'text-text-muted',
        className,
      )}
    >
      <span className={cn(sizes.symbol, 'font-medium text-text-faint')}>{symbol}</span>
      <span className={sizes.amount}>{amount}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'accent' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border px-3.5 py-3',
        tone === 'accent' && 'border-accent-border bg-accent-soft',
        tone === 'warning' && 'border-warning-border bg-warning-soft',
        tone === 'default' && 'border-border bg-surface',
      )}
    >
      <p className="label">{label}</p>
      <div className="tnum mt-1.5 text-[20px] font-semibold leading-none">{value}</div>
      {hint ? <p className="mt-1.5 text-[12px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = 'accent',
}: {
  value: number;
  className?: string;
  tone?: 'accent' | 'warning';
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out-soft)]',
          tone === 'accent' ? 'bg-accent' : 'bg-warning',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <RadixToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className={cn(
        'inline-flex w-full gap-0.5 rounded-[var(--radius-control)] border border-border bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <RadixToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5',
            'text-[13px] font-medium text-text-muted',
            'transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-out-soft)]',
            'data-[state=on]:bg-surface data-[state=on]:text-text',
            'data-[state=on]:shadow-[0_1px_2px_oklch(0%_0_0_/_0.06)] data-[state=on]:font-semibold',
          )}
        >
          {option.icon}
          {option.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  id?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full border border-border bg-surface-3',
        'transition-colors duration-150 ease-[var(--ease-out-soft)]',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block size-4.5 translate-x-[2px] rounded-full bg-surface shadow-sm',
          'transition-transform duration-150 ease-[var(--ease-out-soft)]',
          'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-fg',
        )}
      />
    </RadixSwitch.Root>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label block" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-[12px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputClass = cn(
  'w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5',
  'text-[14px] placeholder:text-text-faint',
  'transition-colors duration-150 focus:border-accent focus:outline-none',
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, 'leading-relaxed', className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputClass, 'appearance-none pr-8', className)} {...props} />;
});

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
          style={{ animation: 'overlay-in 150ms var(--ease-out-soft)' }}
        />
        <RadixDialog.Content
          className={cn(
            'fixed z-50 flex flex-col border border-border bg-surface shadow-[var(--shadow-raised)]',
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[22px]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[440px]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-card)]',
          )}
          style={{ animation: 'sheet-in 180ms var(--ease-out-soft)' }}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div>
              <RadixDialog.Title className="text-[17px] font-semibold tracking-[-0.01em]">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-[13px] text-text-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="-mr-1.5 -mt-1 grid size-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X size={18} />
              </button>
            </RadixDialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer ? (
            <div className="flex gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-text-faint">
        {icon}
      </div>
      <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'muted';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11.5px] font-medium',
        tone === 'default' && 'bg-surface-2 text-text-muted',
        tone === 'muted' && 'bg-transparent text-text-faint',
        tone === 'accent' && 'bg-accent-soft text-accent',
        tone === 'warning' && 'bg-warning-soft text-warning',
        className,
      )}
    >
      {children}
    </span>
  );
}

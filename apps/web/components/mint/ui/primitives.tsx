'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

/* ── Button ───────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'chrome';

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  full,
  className = '',
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  full?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const base =
    'mint-focus inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none';
  const sizing = 'px-5 py-3 text-[15px] min-h-[44px]';
  const styles: Record<ButtonVariant, string> = {
    primary: 'text-[#0A0A0B]',
    outline: 'border text-white/90',
    ghost: 'text-white/80 hover:text-white',
    chrome: 'mint-chrome text-[#0A0A0B]',
  };
  const inline: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--mint-primary)' }
      : variant === 'outline'
        ? { borderColor: 'rgba(255,255,255,0.16)' }
        : {};
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizing} ${styles[variant]} ${full ? 'w-full' : ''} ${className}`}
      style={inline}
    >
      {children}
    </button>
  );
}

/* ── SegmentedControl ─────────────────────────────────── */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-flex items-center rounded-full p-1"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="mint-focus relative z-10 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors min-h-[40px]"
            style={{ color: active ? '#0A0A0B' : 'rgba(255,255,255,0.7)' }}
          >
            {active && (
              <motion.span
                layoutId="mint-segmented-indicator"
                className="absolute inset-0 -z-10 rounded-full"
                style={{ background: 'var(--mint-primary)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toggle ───────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="mint-focus relative inline-flex h-[30px] w-[52px] shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--mint-primary)' : 'rgba(255,255,255,0.16)' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className="block h-[24px] w-[24px] rounded-full bg-white shadow"
        style={{ marginLeft: checked ? 25 : 3 }}
      />
    </button>
  );
}

/* ── Chip ─────────────────────────────────────────────── */

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="mint-focus rounded-full px-4 py-2 text-[13px] font-medium transition-colors min-h-[40px]"
      style={{
        background: selected ? 'var(--mint-primary)' : 'rgba(255,255,255,0.05)',
        color: selected ? '#0A0A0B' : 'rgba(255,255,255,0.8)',
        border: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      {label}
    </button>
  );
}

/* ── Progress ─────────────────────────────────────────── */

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: 'var(--mint-primary)' }}
      />
    </div>
  );
}

/* ── Sheet (bottom sheet / side panel / modal) ────────── */

export function Sheet({
  open,
  onClose,
  children,
  title,
  side = 'bottom',
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  side?: 'bottom' | 'right' | 'center';
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const panelMotion =
    side === 'bottom'
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
      : side === 'right'
        ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
        : { initial: { scale: 0.94, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.94, opacity: 0 } };

  const positionClass =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 rounded-t-3xl mint-safe-bottom max-h-[88vh]'
      : side === 'right'
        ? 'top-0 right-0 h-full w-full max-w-[440px] mint-safe-top'
        : 'left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-3xl max-h-[88vh]';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`absolute overflow-y-auto ${positionClass}`}
            style={{
              background: 'linear-gradient(180deg, #17181b 0%, #101012 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            }}
            {...panelMotion}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            {(title || side === 'bottom') && (
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 pt-4 pb-3"
                style={{ background: 'linear-gradient(180deg, #17181b 70%, transparent)' }}>
                {side === 'bottom' && !title && (
                  <div className="mx-auto h-1.5 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                )}
                {title && (
                  <h2 id={labelledBy} className="text-[17px] font-bold text-white">
                    {title}
                  </h2>
                )}
                {title && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="mint-focus flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <div className="px-5 pb-8 pt-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

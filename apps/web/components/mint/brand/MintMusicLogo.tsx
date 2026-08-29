import type { CSSProperties } from 'react';
import { MintMusicMark } from './MintMusicMark';

/**
 * MintMusicLogo — the horizontal lockup: vinyl mark + lowercase wordmark.
 * `mint` renders in mint green; `music` renders near-white on dark surfaces
 * and near-black on light surfaces. Never distort or recolor arbitrarily.
 */
export function MintMusicLogo({
  size = 28,
  variant = 'dark',
  showMark = true,
  className,
  style,
}: {
  size?: number;
  variant?: 'dark' | 'light';
  showMark?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const musicColor = variant === 'dark' ? 'var(--paper-white)' : 'var(--warm-ink)';
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.32,
        ...style,
      }}
    >
      {showMark && <MintMusicMark size={size} />}
      <span
        style={{
          fontFamily: 'var(--font-manrope), system-ui, sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          fontSize: size * 0.82,
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--mint-primary)' }}>mint</span>
        <span style={{ color: musicColor }}>music</span>
      </span>
    </span>
  );
}

import type { CSSProperties } from 'react';

/**
 * MintMusicMark — the standalone vinyl + leaf symbol.
 * Used for the favicon/app-icon lockup, compact nav, and the loading indicator.
 * NOTE: If official MintMusic mark artwork is added to /public/brand, prefer
 * rendering that asset here instead of this vector recreation.
 */
export function MintMusicMark({
  size = 40,
  className,
  style,
  title = 'MintMusic',
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      style={style}
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id="mkVinyl" cx="42%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#1a1a1d" />
          <stop offset="55%" stopColor="#101012" />
          <stop offset="100%" stopColor="#050506" />
        </radialGradient>
        <linearGradient id="mkLabel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7FE9BC" />
          <stop offset="100%" stopColor="#2FAE7A" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="248" fill="url(#mkVinyl)" />
      <circle cx="256" cy="256" r="248" fill="none" stroke="url(#mkLabel)" strokeWidth="10" />
      <g fill="none" stroke="#ffffff" strokeOpacity="0.06">
        <circle cx="256" cy="256" r="216" strokeWidth="2" />
        <circle cx="256" cy="256" r="188" strokeWidth="2" />
        <circle cx="256" cy="256" r="160" strokeWidth="2" />
        <circle cx="256" cy="256" r="132" strokeWidth="2" />
      </g>
      <ellipse cx="188" cy="180" rx="120" ry="60" fill="#ffffff" fillOpacity="0.05" />
      <circle cx="256" cy="256" r="104" fill="url(#mkLabel)" />
      <circle cx="256" cy="256" r="9" fill="#0A0A0B" />
      <path
        d="M256 178 C 300 212 300 300 256 334 C 212 300 212 212 256 178 Z"
        fill="#0A0A0B"
        fillOpacity="0.9"
      />
      <line x1="256" y1="190" x2="256" y2="322" stroke="#7FE9BC" strokeWidth="3" strokeLinecap="round" />
      <g stroke="#7FE9BC" strokeWidth="7" strokeLinecap="round">
        <line x1="234" y1="270" x2="234" y2="242" />
        <line x1="245" y1="282" x2="245" y2="230" />
        <line x1="267" y1="284" x2="267" y2="228" />
        <line x1="278" y1="272" x2="278" y2="240" />
      </g>
    </svg>
  );
}

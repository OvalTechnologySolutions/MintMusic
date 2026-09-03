'use client';

import type { CSSProperties } from 'react';
import type { Artwork } from '../lib/types';

/**
 * VinylRecord — layered CSS/SVG disc: grooves, soft highlight, center label
 * (album artwork tint + MintMusic leaf) and spindle hole. Rotation is driven by
 * the `spinning` flag and disabled under reduced motion.
 */
export function VinylRecord({
  artwork,
  size = 320,
  spinning = false,
  reducedMotion = false,
  className = '',
  style,
}: {
  artwork: Artwork;
  size?: number;
  spinning?: boolean;
  reducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const label = size * 0.42;
  const animate = spinning && !reducedMotion;

  return (
    <div
      className={`relative rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 42% 38%, #1b1b1e 0%, #101012 55%, #050506 100%)',
        boxShadow:
          '0 30px 60px rgba(0,0,0,0.55), inset 0 2px 6px rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {/* grooves */}
      <div className="mint-grooves absolute inset-[6%] rounded-full" />
      {/* mint outer rim */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: `${Math.max(2, size * 0.012)}px solid var(--mint-deep)`, opacity: 0.55 }}
      />
      {/* soft reflected highlight */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '8%',
          background:
            'radial-gradient(120px 60px at 34% 26%, rgba(255,255,255,0.10), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* rotating group: label + a groove tick so motion is visible */}
      <div
        className={`absolute inset-0 grid place-items-center ${animate ? 'mint-spin' : ''}`}
        style={!animate ? { animationPlayState: 'paused' } : undefined}
      >
        {/* center label */}
        <div
          className="relative grid place-items-center rounded-full overflow-hidden"
          style={{
            width: label,
            height: label,
            background: `linear-gradient(135deg, ${artwork.from} 0%, ${artwork.to} 100%)`,
            boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.15)',
          }}
        >
          {artwork.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          ) : null}
          {/* leaf glyph */}
          <svg
            viewBox="0 0 100 100"
            width={label * 0.5}
            height={label * 0.5}
            className="relative"
            aria-hidden="true"
          >
            <path
              d="M50 18 C 70 34 70 70 50 84 C 30 70 30 34 50 18 Z"
              fill="rgba(10,10,11,0.85)"
            />
            <line x1="50" y1="24" x2="50" y2="78" stroke="#7FE9BC" strokeWidth="2" strokeLinecap="round" />
            <g stroke="#7FE9BC" strokeWidth="3.4" strokeLinecap="round">
              <line x1="42" y1="58" x2="42" y2="46" />
              <line x1="47" y1="64" x2="47" y2="40" />
              <line x1="53" y1="65" x2="53" y2="39" />
              <line x1="58" y1="59" x2="58" y2="45" />
            </g>
          </svg>
          {/* spindle hole */}
          <div
            className="absolute rounded-full"
            style={{ width: size * 0.03, height: size * 0.03, background: '#050506' }}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Tonearm } from './Tonearm';

/** Responsive turntable size: dominant on mobile, larger and cinematic on desktop. */
export function useTurntableSize(): number {
  const [size, setSize] = useState(320);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const desktop = vw >= 1024;
      const ideal = desktop ? Math.min(vw * 0.4, 560) : vw * 0.72;
      const capped = Math.min(ideal, vh * 0.5);
      setSize(Math.max(250, Math.min(capped, desktop ? 560 : 360)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return size;
}

/**
 * Turntable — the plinth, platter, spindle, tonearm and status LED. The active
 * record is provided via a render-prop so callers can make it draggable
 * (Discover) or static (Collection) while keeping consistent sizing.
 */
export function Turntable({
  active,
  reducedMotion = false,
  children,
}: {
  active: boolean;
  reducedMotion?: boolean;
  children: (size: number) => ReactNode;
}) {
  const size = useTurntableSize();
  const platter = size * 1.08;

  return (
    <div
      className="relative grid place-items-center"
      style={{
        width: platter,
        height: platter,
        borderRadius: '50%',
      }}
    >
      {/* platter */}
      <div
        className="absolute rounded-full"
        style={{
          width: platter,
          height: platter,
          background: 'radial-gradient(circle at 40% 34%, #26262a 0%, #171719 60%, #0c0c0e 100%)',
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.06), inset 0 -8px 24px rgba(0,0,0,0.5)',
        }}
      />
      {/* platter mat ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: platter * 0.94,
          height: platter * 0.94,
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      />

      {/* status LED */}
      <div
        className="absolute rounded-full"
        style={{
          width: 8,
          height: 8,
          left: '8%',
          bottom: '10%',
          background: active ? 'var(--mint-primary)' : 'rgba(255,255,255,0.15)',
          boxShadow: active ? '0 0 10px var(--mint-primary)' : 'none',
          transition: 'all 0.3s ease',
        }}
      />

      <Tonearm active={active} size={size} reducedMotion={reducedMotion} />

      {/* record slot */}
      <div className="absolute grid place-items-center" style={{ width: size, height: size }}>
        {children(size)}
      </div>
    </div>
  );
}

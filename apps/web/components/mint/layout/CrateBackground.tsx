'use client';

/** Restrained record-crate environment: dark wood + charcoal shelves, low
 *  contrast, shallow depth. Simplified aggressively so it never harms FPS. */
export function CrateBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden mint-grain" style={{ background: 'var(--onyx)' }}>
      {/* ambient mint glow */}
      <div
        className="absolute left-1/2 top-[38%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(127,233,188,0.10), transparent 62%)', filter: 'blur(20px)' }}
      />
      {/* left crate stack */}
      <div className="absolute -left-10 bottom-0 hidden h-[62vh] w-56 sm:block" style={{ perspective: 600 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-full rounded-r-lg"
            style={{
              bottom: i * 118,
              height: 104,
              background: 'linear-gradient(180deg, #201a14 0%, #14100c 100%)',
              borderTop: '2px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.5)',
              transform: 'rotateY(14deg)',
            }}
          >
            <div className="absolute inset-2 flex gap-1 overflow-hidden">
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="h-full w-2 rounded-sm" style={{ background: `hsl(${(i * 40 + j * 12) % 360} 8% ${10 + (j % 3) * 4}%)` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* right crate stack */}
      <div className="absolute -right-10 bottom-0 hidden h-[62vh] w-56 lg:block" style={{ perspective: 600 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute right-0 w-full rounded-l-lg"
            style={{
              bottom: i * 118,
              height: 104,
              background: 'linear-gradient(180deg, #1b1d1f 0%, #101214 100%)',
              borderTop: '2px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.5)',
              transform: 'rotateY(-14deg)',
            }}
          >
            <div className="absolute inset-2 flex gap-1 overflow-hidden">
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="h-full w-2 rounded-sm" style={{ background: `hsl(${(i * 30 + j * 18) % 360} 6% ${12 + (j % 4) * 3}%)` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* floor vignette */}
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))' }} />
    </div>
  );
}

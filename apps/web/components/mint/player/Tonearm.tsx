'use client';

import { motion } from 'motion/react';

/** Tonearm that swings onto the record while playing and lifts when idle. */
export function Tonearm({
  active,
  size = 320,
  reducedMotion = false,
}: {
  active: boolean;
  size?: number;
  reducedMotion?: boolean;
}) {
  const armLen = size * 0.52;
  return (
    <motion.div
      className="absolute"
      style={{
        top: -size * 0.06,
        right: -size * 0.04,
        width: size * 0.18,
        height: size * 0.18,
        transformOrigin: 'top right',
        zIndex: 5,
        pointerEvents: 'none',
      }}
      initial={false}
      animate={{ rotate: active ? 22 : -6 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18 }}
    >
      {/* pivot base */}
      <div
        className="absolute right-0 top-0 rounded-full"
        style={{
          width: size * 0.16,
          height: size * 0.16,
          background: 'linear-gradient(135deg, #303034, #17171a)',
          boxShadow: '0 6px 14px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.12)',
        }}
      />
      {/* arm */}
      <div
        className="absolute"
        style={{
          right: size * 0.07,
          top: size * 0.07,
          width: Math.max(6, size * 0.02),
          height: armLen,
          transformOrigin: 'top',
          transform: 'rotate(28deg)',
          background: 'linear-gradient(180deg, #d9d9dd, #9a9aa0)',
          borderRadius: 999,
          boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
        }}
      >
        {/* headshell */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2"
          style={{
            width: size * 0.05,
            height: size * 0.045,
            background: 'linear-gradient(135deg, #2b2b2d, #131315)',
            borderRadius: 4,
          }}
        />
      </div>
    </motion.div>
  );
}

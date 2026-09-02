'use client';

import { AnimatePresence, motion } from 'motion/react';

/** Subtle first-run coaching. Fades away permanently after the first swipe. */
export function GestureCoach({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 items-center justify-between px-6"
        >
          <motion.span
            animate={{ x: [-2, -8, -2] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="text-[13px] font-medium lowercase tracking-wide"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            ← skip
          </motion.span>
          <motion.span
            animate={{ x: [2, 8, 2] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="text-[13px] font-medium lowercase tracking-wide"
            style={{ color: 'var(--mint-primary)' }}
          >
            collect →
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

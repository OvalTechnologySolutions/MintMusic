'use client';

import { useReducedMotion as useSystemReducedMotion } from 'motion/react';
import { useMint } from './store';

/** True when either the OS setting or the in-app toggle requests reduced motion. */
export function useMintReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const { a11y } = useMint();
  return Boolean(system) || a11y.reducedMotion;
}

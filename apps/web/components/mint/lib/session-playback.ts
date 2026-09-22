import type { MintSession } from './types';

/**
 * After hydration, a missing mint session means AuthLanding is on screen.
 * That surface has no play/pause control, so the shared PlaybackEngine
 * must be silent.
 */
export function sessionRequiresSilentEngine(
  hydrated: boolean,
  session: MintSession | null,
): boolean {
  return hydrated && session == null;
}

/** Pause the engine when the listener is signed out or deleted. */
export function haltPlaybackIfSignedOut(
  hydrated: boolean,
  session: MintSession | null,
  pause: () => void,
): boolean {
  if (!sessionRequiresSilentEngine(hydrated, session)) return false;
  pause();
  return true;
}

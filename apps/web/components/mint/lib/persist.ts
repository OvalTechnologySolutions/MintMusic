import type {
  AccessibilitySettings,
  ArtistProfile,
  ListenerProfile,
  PlaybackSettings,
} from './types';

export const STORAGE_KEYS = {
  session: 'mint:session',
  listener: 'mint:listener',
  artist: 'mint:artist',
  collection: 'mint:collection',
  uploads: 'mint:uploads',
  events: 'mint:events',
  playback: 'mint:playback',
  a11y: 'mint:a11y',
  tutorial: 'mint:tutorialSeen',
  wallet: 'mint:wallet',
} as const;

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const DEFAULT_LISTENER: ListenerProfile = {
  displayName: '',
  favoriteGenres: [],
  favoriteArtists: [],
  onboarded: false,
};

export const DEFAULT_ARTIST: ArtistProfile = {
  enabled: false,
  stageName: '',
  bio: '',
  genres: [],
  links: [],
};

export const DEFAULT_PLAYBACK: PlaybackSettings = {
  audioQuality: 'standard',
  autoplay: true,
  allowExplicit: true,
};

export const DEFAULT_A11Y: AccessibilitySettings = { reducedMotion: false };

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function load<T>(key: string, fallback: T, storage: StorageLike | null = browserStorage()): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T, storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Write only slices whose identity changed. A settings keystroke in one tab
 * must not rewrite a stale collection/uploads snapshot from that tab.
 */
export function persistChangedSlices(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  storage: StorageLike | null = browserStorage(),
): string[] {
  const written: string[] = [];
  for (const [key, value] of Object.entries(next)) {
    if (Object.is(previous[key], value)) continue;
    save(key, value, storage);
    written.push(key);
  }
  return written;
}

/** Keep the current React value when another tab wrote identical JSON (stops echo loops). */
export function acceptExternalJson<T>(current: T, incomingRaw: string): T {
  try {
    if (JSON.stringify(current) === incomingRaw) return current;
    return JSON.parse(incomingRaw) as T;
  } catch {
    return current;
  }
}

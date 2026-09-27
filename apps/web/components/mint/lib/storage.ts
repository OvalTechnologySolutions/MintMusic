/**
 * localStorage helpers for the record player.
 *
 * Account-owned slices (crate, uploads, profiles) are keyed by email so two
 * people on the same browser cannot read or delete each other's library.
 * Device preferences (playback, a11y, tutorial) stay shared.
 */

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

/** Slices that belong to a signed-in identity, not the device. */
export const ACCOUNT_SCOPED_KEY_NAMES = [
  'listener',
  'artist',
  'collection',
  'uploads',
  'events',
  'wallet',
] as const;

export type AccountScopedKeyName = (typeof ACCOUNT_SCOPED_KEY_NAMES)[number];

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function scopedStorageKey(
  baseKey: string,
  email: string | null | undefined,
): string {
  const id = email?.trim().toLowerCase();
  return id ? `${baseKey}:${id}` : `${baseKey}:guest`;
}

export function readStorage<T>(key: string, fallback: T): T {
  const store = getLocalStorage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  const store = getLocalStorage();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function removeStorage(key: string): void {
  const store = getLocalStorage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function hasStorage(key: string): boolean {
  const store = getLocalStorage();
  if (!store) return false;
  try {
    return store.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Load an account-scoped slice.
 *
 * If this email has no scoped value yet, claim the pre-namespacing key once so
 * an existing crate survives the upgrade. The first signed-in user on a device
 * that still has legacy data receives it; later users do not.
 */
export function loadAccountSlice<T>(
  baseKey: string,
  email: string | null | undefined,
  fallback: T,
): T {
  const scoped = scopedStorageKey(baseKey, email);
  if (hasStorage(scoped)) {
    return readStorage(scoped, fallback);
  }

  const identity = email?.trim().toLowerCase();
  if (identity && hasStorage(baseKey)) {
    const legacy = readStorage(baseKey, fallback);
    writeStorage(scoped, legacy);
    removeStorage(baseKey);
    return legacy;
  }

  return fallback;
}

export function saveAccountSlice<T>(
  baseKey: string,
  email: string | null | undefined,
  value: T,
): void {
  writeStorage(scopedStorageKey(baseKey, email), value);
}

/** Drop this account's scoped keys and any leftover unscoped legacy keys. */
export function deleteAccountSlices(email: string | null | undefined): void {
  for (const name of ACCOUNT_SCOPED_KEY_NAMES) {
    const base = STORAGE_KEYS[name];
    removeStorage(scopedStorageKey(base, email));
    if (email?.trim()) {
      removeStorage(base);
    }
  }
}

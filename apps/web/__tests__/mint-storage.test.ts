import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  deleteAccountSlices,
  hasStorage,
  loadAccountSlice,
  readStorage,
  saveAccountSlice,
  scopedStorageKey,
} from '../components/mint/lib/storage';

class MemoryStorage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('account-scoped mint storage', () => {
  beforeEach(() => {
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: memory },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('namespaces keys by lowercase email and isolates guest data', () => {
    expect(scopedStorageKey(STORAGE_KEYS.collection, 'Alice@MintMusic.app')).toBe(
      'mint:collection:alice@mintmusic.app',
    );
    expect(scopedStorageKey(STORAGE_KEYS.collection, null)).toBe('mint:collection:guest');
  });

  it('keeps two listeners crates from overwriting each other', () => {
    const alice = [{ songId: 'seed-nightbloom', collectedAt: '2026-09-15T00:00:00.000Z' }];
    const bob: typeof alice = [];

    saveAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', alice);
    saveAccountSlice(STORAGE_KEYS.collection, 'bob@example.com', bob);

    expect(
      loadAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', []),
    ).toEqual(alice);
    expect(loadAccountSlice(STORAGE_KEYS.collection, 'bob@example.com', [])).toEqual(
      [],
    );
  });

  it('does not wipe another account when deleteAccount runs', () => {
    const aliceUploads = [{ id: 'up-1', title: 'Keep me' }];
    saveAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', [
      { songId: 'seed-nightbloom' },
    ]);
    saveAccountSlice(STORAGE_KEYS.uploads, 'alice@example.com', aliceUploads);
    saveAccountSlice(STORAGE_KEYS.collection, 'bob@example.com', [
      { songId: 'seed-terracotta' },
    ]);

    deleteAccountSlices('bob@example.com');

    expect(
      loadAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', []),
    ).toEqual([{ songId: 'seed-nightbloom' }]);
    expect(
      loadAccountSlice(STORAGE_KEYS.uploads, 'alice@example.com', []),
    ).toEqual(aliceUploads);
    expect(loadAccountSlice(STORAGE_KEYS.collection, 'bob@example.com', [])).toEqual(
      [],
    );
  });

  it('claims legacy unscoped crate once, then hides it from the next user', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.collection,
      JSON.stringify([{ songId: 'legacy-hit' }]),
    );

    expect(
      loadAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', []),
    ).toEqual([{ songId: 'legacy-hit' }]);
    expect(hasStorage(STORAGE_KEYS.collection)).toBe(false);
    expect(
      loadAccountSlice(STORAGE_KEYS.collection, 'bob@example.com', []),
    ).toEqual([]);
  });

  it('writing guest state after sign-out leaves the signed-in crate on disk', () => {
    saveAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', [
      { songId: 'seed-nightbloom' },
    ]);
    saveAccountSlice(STORAGE_KEYS.collection, null, []);

    expect(
      readStorage(scopedStorageKey(STORAGE_KEYS.collection, 'alice@example.com'), []),
    ).toEqual([{ songId: 'seed-nightbloom' }]);
    expect(
      loadAccountSlice(STORAGE_KEYS.collection, 'alice@example.com', []),
    ).toEqual([{ songId: 'seed-nightbloom' }]);
  });
});

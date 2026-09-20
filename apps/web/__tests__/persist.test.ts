import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LISTENER,
  STORAGE_KEYS,
  acceptExternalJson,
  load,
  persistChangedSlices,
  save,
  type StorageLike,
} from '../components/mint/lib/persist';
import type { CollectionItem, ListenerProfile } from '../components/mint/lib/types';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const listenerA: ListenerProfile = { ...DEFAULT_LISTENER, displayName: 'A', onboarded: true };
const listenerB: ListenerProfile = { ...DEFAULT_LISTENER, displayName: 'B', onboarded: true };
const crate: CollectionItem[] = [
  { songId: 'seed-nightbloom', collectedAt: '2026-09-20T11:00:00.000Z' },
  { songId: 'seed-terracotta', collectedAt: '2026-09-20T11:01:00.000Z' },
];

describe('per-slice localStorage persist', () => {
  it('does not clobber collection when another tab only updates listener', () => {
    const storage = new MemoryStorage();
    save(STORAGE_KEYS.collection, crate, storage);
    save(STORAGE_KEYS.listener, listenerA, storage);

    const tabBMemory = {
      [STORAGE_KEYS.collection]: crate,
      [STORAGE_KEYS.listener]: listenerA,
    };
    const tabBAfterRename = {
      [STORAGE_KEYS.collection]: crate,
      [STORAGE_KEYS.listener]: listenerB,
    };

    const written = persistChangedSlices(tabBMemory, tabBAfterRename, storage);

    expect(written).toEqual([STORAGE_KEYS.listener]);
    expect(load(STORAGE_KEYS.collection, [] as CollectionItem[], storage)).toEqual(crate);
    expect(load(STORAGE_KEYS.listener, DEFAULT_LISTENER, storage).displayName).toBe('B');
  });

  it('adopts a foreign collection write and ignores identical JSON to stop echo loops', () => {
    const current = crate;
    expect(acceptExternalJson(current, JSON.stringify(current))).toBe(current);

    const incoming: CollectionItem[] = [
      ...crate,
      { songId: 'seed-glasshour', collectedAt: '2026-09-20T11:02:00.000Z' },
    ];
    const adopted = acceptExternalJson(current, JSON.stringify(incoming));
    expect(adopted).toEqual(incoming);
    expect(adopted).not.toBe(current);
  });

  it('keeps the current value when foreign JSON is corrupt', () => {
    expect(acceptExternalJson(crate, '{not-json')).toBe(crate);
  });
});

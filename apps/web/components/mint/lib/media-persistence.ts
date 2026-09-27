import type { Song } from './types';

const DB_NAME = 'mintmusic';
const DB_VERSION = 1;
const STORE = 'audio';

/** Object URLs and other session-only schemes cannot be replayed after reload. */
export function isDurableMediaUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /^(data:|https?:|file:)/i.test(url);
}

export function isSessionObjectUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('blob:'));
}

export function isPlayableFileUrl(url: string | undefined): url is string {
  return isDurableMediaUrl(url) || isSessionObjectUrl(url);
}

/** Strip session-only audio URLs so localStorage never stores a dead blob: link. */
export function toDurableUpload(song: Song): Song {
  if (!isSessionObjectUrl(song.audioUrl)) return song;
  return { ...song, audioUrl: undefined };
}

export function toDurableUploads(songs: Song[]): Song[] {
  return songs.map(toDurableUpload);
}

export async function reviveUploads(
  songs: Song[],
  deps: {
    getBlob: (id: string) => Promise<Blob | undefined>;
    objectUrl: (blob: Blob) => string;
  } = {
    getBlob: getAudioBlob,
    objectUrl: (blob) => URL.createObjectURL(blob),
  }
): Promise<Song[]> {
  return Promise.all(
    songs.map(async (song) => {
      if (song.audioKind !== 'file') return toDurableUpload(song);
      const blob = await deps.getBlob(song.id);
      if (blob) return { ...song, audioUrl: deps.objectUrl(blob) };
      return toDurableUpload(song);
    })
  );
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open audio store'));
  });
}

export async function putAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to store audio'));
      tx.objectStore(STORE).put(blob, id);
    });
  } finally {
    db.close();
  }
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  try {
    const db = await openDb();
    try {
      return await new Promise<Blob | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = () => {
          const value = req.result;
          resolve(value instanceof Blob ? value : undefined);
        };
        req.onerror = () => reject(req.error ?? new Error('Failed to read audio'));
      });
    } finally {
      db.close();
    }
  } catch {
    return undefined;
  }
}

export async function clearAudioBlobs(): Promise<void> {
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to clear audio'));
        tx.objectStore(STORE).clear();
      });
    } finally {
      db.close();
    }
  } catch {
    /* private mode / unsupported */
  }
}

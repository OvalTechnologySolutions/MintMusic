import { describe, expect, it } from 'vitest';
import type { Song } from '../components/mint/lib/types';
import {
  isDurableMediaUrl,
  isPlayableFileUrl,
  isSessionObjectUrl,
  reviveUploads,
  toDurableUpload,
  toDurableUploads,
} from '../components/mint/lib/media-persistence';

function fileSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'up-1',
    title: 'Demo',
    artist: 'Test',
    artistSlug: 'test',
    artwork: { from: '#000', to: '#111' },
    genres: ['Pop'],
    explicit: false,
    version: 'original',
    credits: [{ role: 'Primary Artist', name: 'Test' }],
    durationSec: 24,
    audioKind: 'file',
    audioUrl: 'blob:http://localhost:3000/dead',
    synthSeed: 220,
    status: 'published',
    eligibleForDiscovery: true,
    uploadedByUser: true,
    ...overrides,
  };
}

describe('media persistence', () => {
  it('treats blob: URLs as session-only and data/https as durable', () => {
    expect(isSessionObjectUrl('blob:http://localhost:3000/abc')).toBe(true);
    expect(isDurableMediaUrl('blob:http://localhost:3000/abc')).toBe(false);
    expect(isDurableMediaUrl('data:audio/mpeg;base64,abc')).toBe(true);
    expect(isDurableMediaUrl('https://cdn.example/track.mp3')).toBe(true);
    expect(isDurableMediaUrl(undefined)).toBe(false);
    expect(isPlayableFileUrl('blob:http://localhost:3000/abc')).toBe(true);
    expect(isPlayableFileUrl('data:audio/mpeg;base64,abc')).toBe(true);
    expect(isPlayableFileUrl(undefined)).toBe(false);
  });

  it('strips blob: audio URLs before localStorage write so reload cannot keep a dead link', () => {
    const stored = toDurableUpload(fileSong());
    expect(stored.audioUrl).toBeUndefined();
    expect(stored.audioKind).toBe('file');
    expect(stored.id).toBe('up-1');

    const dataSong = fileSong({ audioUrl: 'data:audio/mpeg;base64,abc' });
    expect(toDurableUpload(dataSong).audioUrl).toBe('data:audio/mpeg;base64,abc');
  });

  it('revives file uploads from the blob store and drops unrecovered blob: URLs', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' });
    const blobs = new Map<string, Blob>([['up-live', blob]]);

    const revived = await reviveUploads(
      [
        fileSong({ id: 'up-live' }),
        fileSong({ id: 'up-dead' }),
        fileSong({
          id: 'seed-ish',
          audioKind: 'synth',
          audioUrl: undefined,
        }),
      ],
      {
        getBlob: async (id) => blobs.get(id),
        objectUrl: (b) => `blob:revived/${b.size}`,
      }
    );

    expect(revived[0].audioUrl).toBe('blob:revived/3');
    expect(revived[1].audioUrl).toBeUndefined();
    expect(revived[2].audioKind).toBe('synth');
    expect(toDurableUploads(revived)[0].audioUrl).toBeUndefined();
  });

  it('cannot resurrect a blob: URL through a JSON localStorage round-trip', () => {
    const persisted = JSON.parse(JSON.stringify(toDurableUploads([fileSong()]))) as Song[];
    expect(persisted[0].audioUrl).toBeUndefined();
    expect(isPlayableFileUrl(persisted[0].audioUrl)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { toJsonSafe } from './json-safe.js';

describe('toJsonSafe', () => {
  it('converts Prisma MediaAsset.byteSize BigInt so res.json can serialize albums', () => {
    const releases = [
      {
        id: 'rel_album',
        type: 'album',
        title: 'Night Drive',
        tracks: [
          {
            id: 'trk_1',
            title: 'Side A',
            trackNumber: 1,
            mediaAsset: {
              id: 'asset_1',
              filename: 'side-a.mp3',
              mimeType: 'audio/mpeg',
              byteSize: BigInt(3_000_000),
              processingStatus: 'ready',
            },
          },
        ],
      },
    ];

    expect(() => JSON.stringify({ releases })).toThrow(
      /Do not know how to serialize a BigInt/
    );

    const payload = toJsonSafe({ releases });
    expect(() => JSON.stringify(payload)).not.toThrow();
    expect(payload.releases[0].tracks[0].mediaAsset.byteSize).toBe(3_000_000);
    expect(typeof payload.releases[0].tracks[0].mediaAsset.byteSize).toBe(
      'number'
    );
  });

  it('leaves payloads without BigInt unchanged', () => {
    const body = { releases: [{ id: 'rel_single', tracks: [] as unknown[] }] };
    expect(toJsonSafe(body)).toEqual(body);
  });
});

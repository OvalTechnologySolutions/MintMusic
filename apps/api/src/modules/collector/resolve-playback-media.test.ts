import { describe, expect, it } from 'vitest';
import { resolvePlaybackMedia } from './resolve-playback-media.js';

const asset = (id: string) => ({ id });

describe('resolvePlaybackMedia', () => {
  it('uses the release-level asset for a single without trackId', () => {
    const resolved = resolvePlaybackMedia(
      {
        mediaAsset: asset('single-audio'),
        tracks: [],
      },
      undefined
    );
    expect(resolved.trackMissing).toBe(false);
    expect(resolved.mediaAsset).toEqual(asset('single-audio'));
    expect(resolved.trackId).toBeUndefined();
  });

  it('falls back to the first album track when trackId is omitted', () => {
    const resolved = resolvePlaybackMedia(
      {
        mediaAsset: null,
        tracks: [
          { id: 't2', trackNumber: 2, mediaAsset: asset('b') },
          { id: 't1', trackNumber: 1, mediaAsset: asset('a') },
        ],
      },
      undefined
    );
    expect(resolved.trackMissing).toBe(false);
    expect(resolved.trackId).toBe('t1');
    expect(resolved.mediaAsset).toEqual(asset('a'));
  });

  it('uses the requested track when trackId is provided', () => {
    const resolved = resolvePlaybackMedia(
      {
        mediaAsset: null,
        tracks: [
          { id: 't1', trackNumber: 1, mediaAsset: asset('a') },
          { id: 't2', trackNumber: 2, mediaAsset: asset('b') },
        ],
      },
      't2'
    );
    expect(resolved.trackMissing).toBe(false);
    expect(resolved.trackId).toBe('t2');
    expect(resolved.mediaAsset).toEqual(asset('b'));
  });

  it('flags an unknown trackId instead of falling back', () => {
    const resolved = resolvePlaybackMedia(
      {
        mediaAsset: null,
        tracks: [{ id: 't1', trackNumber: 1, mediaAsset: asset('a') }],
      },
      'missing'
    );
    expect(resolved.trackMissing).toBe(true);
    expect(resolved.mediaAsset).toBeNull();
  });

  it('returns no media for an album with empty tracks', () => {
    const resolved = resolvePlaybackMedia(
      { mediaAsset: null, tracks: [] },
      undefined
    );
    expect(resolved.trackMissing).toBe(false);
    expect(resolved.mediaAsset).toBeNull();
  });
});

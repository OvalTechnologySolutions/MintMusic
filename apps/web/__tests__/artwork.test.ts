import { describe, expect, it } from 'vitest';
import {
  dataUrlBytes,
  isStoredArtworkUrl,
  MAX_ARTWORK_SOURCE_BYTES,
  MAX_ARTWORK_STORED_BYTES,
  prepareArtworkDataUrl,
  validateArtworkFile,
} from '../components/mint/lib/artwork';

describe('artwork persistence guards', () => {
  it('rejects non-PNG files', () => {
    expect(
      validateArtworkFile({ type: 'image/jpeg', name: 'cover.jpg', size: 1000 }),
    ).toBe('Artwork must be a PNG.');
    expect(
      validateArtworkFile({ type: 'image/png', name: 'cover.PNG', size: 1000 }),
    ).toBeNull();
    expect(
      validateArtworkFile({ type: '', name: 'cover.png', size: 1000 }),
    ).toBeNull();
  });

  it('rejects source files that would OOM or blow the quota as raw data URLs', () => {
    expect(
      validateArtworkFile({
        type: 'image/png',
        name: 'master.png',
        size: MAX_ARTWORK_SOURCE_BYTES + 1,
      }),
    ).toBe('Artwork is too large (max 8MB).');
    expect(
      validateArtworkFile({
        type: 'image/png',
        name: 'cover.png',
        size: MAX_ARTWORK_SOURCE_BYTES,
      }),
    ).toBeNull();
  });

  it('treats compressed JPEG data URLs as the durable stored form', () => {
    expect(isStoredArtworkUrl('data:image/jpeg;base64,abc')).toBe(true);
    expect(isStoredArtworkUrl('data:image/png;base64,abc')).toBe(false);
    expect(isStoredArtworkUrl('blob:http://localhost/1')).toBe(false);
    expect(isStoredArtworkUrl(undefined)).toBe(false);
  });

  it('keeps a crate of compressed covers under a typical 5MB localStorage quota', () => {
    const payload = 'A'.repeat(Math.floor((MAX_ARTWORK_STORED_BYTES * 4) / 3));
    const cover = `data:image/jpeg;base64,${payload}`;
    expect(dataUrlBytes(cover)).toBeLessThanOrEqual(MAX_ARTWORK_STORED_BYTES + 4);

    const uploads = Array.from({ length: 12 }, (_, i) => ({
      id: `up-${i}`,
      title: 'Track',
      artwork: { from: '#7FE9BC', to: '#0A0A0B', imageUrl: cover },
    }));
    const json = JSON.stringify(uploads);
    expect(json.length).toBeLessThan(5 * 1024 * 1024);
  });

  it('shows that an uncompressed 4MB PNG data URL alone exceeds localStorage quota', () => {
    const rawPng = 'data:image/png;base64,' + 'A'.repeat(Math.ceil((4 * 1024 * 1024 * 4) / 3));
    expect(rawPng.length).toBeGreaterThan(5 * 1024 * 1024);
  });

  it('does not start decoding when the source file is invalid', async () => {
    const jpeg = new File([new Uint8Array([1, 2, 3])], 'cover.jpg', { type: 'image/jpeg' });
    await expect(prepareArtworkDataUrl(jpeg)).rejects.toThrow('Artwork must be a PNG.');
  });

  it('compresses a decoded bitmap to a JPEG data URL under the stored-size cap', async () => {
    const png = new File([new Uint8Array([137, 80, 78, 71])], 'cover.png', { type: 'image/png' });
    const originalBitmap = globalThis.createImageBitmap;
    const originalDocument = globalThis.document;

    const bitmap = {
      width: 3000,
      height: 3000,
      close() {},
    };
    globalThis.createImageBitmap = async () => bitmap as unknown as ImageBitmap;

    const jpegUrl =
      'data:image/jpeg;base64,' + 'A'.repeat(1000);
    globalThis.document = {
      createElement: () => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: () => undefined,
          }),
          toDataURL: () => jpegUrl,
        };
        return canvas as unknown as HTMLCanvasElement;
      },
    } as unknown as Document;

    try {
      const url = await prepareArtworkDataUrl(png);
      expect(url).toBe(jpegUrl);
      expect(isStoredArtworkUrl(url)).toBe(true);
      expect(dataUrlBytes(url)).toBeLessThanOrEqual(MAX_ARTWORK_STORED_BYTES);
    } finally {
      globalThis.createImageBitmap = originalBitmap;
      globalThis.document = originalDocument;
    }
  });
});

/** Artwork is persisted in localStorage as a data URL on each upload.
 *  Unbounded PNGs (phone exports, 3k masters) exceed the ~5MB quota and
 *  `MintProvider.save` swallows QuotaExceededError, so the published
 *  release vanishes on refresh. Compress to a small JPEG before storage. */

export const MAX_ARTWORK_SOURCE_BYTES = 8 * 1024 * 1024;
export const MAX_ARTWORK_STORED_BYTES = 220 * 1024;
export const MAX_ARTWORK_EDGE = 800;

export function validateArtworkFile(file: {
  type: string;
  name: string;
  size: number;
}): string | null {
  if (file.type !== 'image/png' && !/\.png$/i.test(file.name)) {
    return 'Artwork must be a PNG.';
  }
  if (file.size > MAX_ARTWORK_SOURCE_BYTES) {
    return 'Artwork is too large (max 8MB).';
  }
  return null;
}

/** Approximate decoded byte length of a data URL payload. */
export function dataUrlBytes(url: string): number {
  const comma = url.indexOf(',');
  const payload = comma >= 0 ? url.slice(comma + 1) : url;
  return Math.ceil((payload.length * 3) / 4);
}

export function isStoredArtworkUrl(url: string | undefined): boolean {
  return Boolean(url && /^data:image\/jpeg;base64,/i.test(url));
}

type DrawableImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
};

/**
 * Downscale and JPEG-encode artwork so a crate of releases fits in localStorage.
 * Uses createImageBitmap when available, otherwise HTMLImageElement.
 */
export async function prepareArtworkDataUrl(file: File): Promise<string> {
  const invalid = validateArtworkFile(file);
  if (invalid) throw new Error(invalid);

  const image = await decodeImage(file);
  try {
    const scale = Math.min(
      1,
      MAX_ARTWORK_EDGE / Math.max(image.width, image.height, 1),
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process artwork.');
    ctx.drawImage(image.source, 0, 0, width, height);

    for (const quality of [0.82, 0.64, 0.48, 0.32]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (dataUrlBytes(url) <= MAX_ARTWORK_STORED_BYTES) return url;
    }
    throw new Error(
      'Artwork is too detailed after compression. Try a simpler PNG.',
    );
  } finally {
    image.close();
  }
}

async function decodeImage(file: File): Promise<DrawableImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read artwork.'));
      el.src = objectUrl;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      source: img,
      close: () => undefined,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

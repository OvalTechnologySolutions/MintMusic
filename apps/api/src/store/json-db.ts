import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../data');

/** Serialize read-modify-write cycles per file so concurrent OAuth / application
 *  submissions cannot drop each other's records. */
const tails = new Map<string, Promise<unknown>>();

function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(filename) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  tails.set(
    filename,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const path = join(dataDir, filename);
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    // A truncated / half-written file must not be treated as "empty".
    // Returning `fallback` here used to persist a wipe on the next save.
    throw new Error(
      `Corrupt JSON store "${filename}": refusing to load fallback over existing data`
    );
  }
}

async function writeJsonUnlocked<T>(filename: string, data: T): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, filename);
  const tmp = join(
    dataDir,
    `${filename}.${randomBytes(8).toString('hex')}.tmp`
  );
  try {
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  return withFileLock(filename, () => writeJsonUnlocked(filename, data));
}

/** Locked read → update → atomic write. Use this for every mutation. */
export function updateJson<T>(
  filename: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>
): Promise<T> {
  return withFileLock(filename, async () => {
    const current = await readJson(filename, fallback);
    const next = await updater(current);
    await writeJsonUnlocked(filename, next);
    return next;
  });
}

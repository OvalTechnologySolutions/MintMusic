import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../data');

export async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const path = join(dataDir, filename);
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, filename);
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { readJson, updateJson, writeJson } from '../store/json-db.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../data');
const testFiles: string[] = [];

function testFile(label: string): string {
  const name = `test-json-db-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  testFiles.push(name);
  return name;
}

afterEach(async () => {
  await Promise.all(
    testFiles.splice(0).map((name) => unlink(join(dataDir, name)).catch(() => undefined))
  );
});

describe('json-db', () => {
  it('round-trips JSON through writeJson / readJson', async () => {
    const file = testFile('roundtrip');
    await writeJson(file, [{ id: 'a' }]);
    await expect(readJson(file, [])).resolves.toEqual([{ id: 'a' }]);
  });

  it('returns fallback when the file does not exist', async () => {
    await expect(readJson('test-json-db-missing-no-file.json', ['fallback'])).resolves.toEqual([
      'fallback',
    ]);
  });

  it('refuses to treat a corrupt existing file as empty', async () => {
    const file = testFile('corrupt');
    await mkdir(dataDir, { recursive: true });
    await writeFile(join(dataDir, file), '{truncated', 'utf-8');

    await expect(readJson(file, [])).rejects.toThrow(/Corrupt JSON store/);

    // File must still contain the truncated bytes — not an overwritten [].
    const raw = await readFile(join(dataDir, file), 'utf-8');
    expect(raw).toBe('{truncated');
  });

  it('keeps the previous file if a write is interrupted before rename', async () => {
    const file = testFile('atomic');
    await writeJson(file, { ok: true, n: 1 });
    await mkdir(dataDir, { recursive: true });
    // Simulate a crashed write: leftover tmp next to a complete file.
    await writeFile(join(dataDir, `${file}.deadbeef.tmp`), '{partial', 'utf-8');

    await expect(readJson(file, { ok: false, n: 0 })).resolves.toEqual({ ok: true, n: 1 });
    await unlink(join(dataDir, `${file}.deadbeef.tmp`)).catch(() => undefined);
  });

  it('does not drop concurrent updates to the same file', async () => {
    const file = testFile('concurrent');
    await writeJson(file, [0]);

    await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
        updateJson<number[]>(file, [], (xs) => {
          xs.push(n);
          return xs;
        })
      )
    );

    const result = await readJson<number[]>(file, []);
    expect(result.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

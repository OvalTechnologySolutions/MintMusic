import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Load apps/api/.env for Prisma scripts (seed, migrate-users). */
export function loadApiEnv(): void {
  const apiRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  config({ path: resolve(apiRoot, '.env') });
}

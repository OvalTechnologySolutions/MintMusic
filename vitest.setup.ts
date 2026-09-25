/**
 * Unit tests run without a live database unless CI provides one.
 * GitHub Actions sets CI=true and DATABASE_URL to the test Postgres service.
 * Local billing acceptance: TEST_WITH_DB=true npm test
 */
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

if (process.env.CI === 'true' || process.env.TEST_WITH_DB === 'true') {
  loadDotenv({ path: resolve(process.cwd(), 'apps/api/.env'), override: false });
} else {
  // Empty string prevents apps/api/.env from repopulating via dotenv override:false
  process.env.DATABASE_URL = '';
}

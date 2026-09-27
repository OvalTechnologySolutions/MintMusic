/**
 * Unit tests run without a live database unless CI provides one.
 * GitHub Actions sets CI=true and DATABASE_URL to the test Postgres service.
 */
if (process.env.CI !== 'true' && !process.env.TEST_WITH_DB) {
  // Empty string prevents apps/api/.env from repopulating via dotenv override:false
  process.env.DATABASE_URL = '';
}

const PUBLIC_INTERNAL_SECRETS = new Set([
  'dev-internal-secret',
  'change-me-min-8-chars',
  'change-me-match-web-env',
]);

// env.ts refuses public placeholders. Override before the API config module loads
// so tests do not inherit apps/api/.env.example values (override: false).
if (
  !process.env.INTERNAL_API_SECRET ||
  PUBLIC_INTERNAL_SECRETS.has(process.env.INTERNAL_API_SECRET)
) {
  process.env.INTERNAL_API_SECRET = 'vitest-internal-api-secret-not-for-prod';
}

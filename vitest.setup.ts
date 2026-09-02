/**
 * Unit tests run without a live database unless CI provides one.
 * GitHub Actions sets CI=true and DATABASE_URL to the test Postgres service.
 */
if (process.env.CI !== 'true' && !process.env.TEST_WITH_DB) {
  // Empty string prevents apps/api/.env from repopulating via dotenv override:false
  process.env.DATABASE_URL = '';
}

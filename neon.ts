import { defineConfig } from '@neon/config/v1';

/**
 * Neon infrastructure for MintMusic (project: dark-king-03663821).
 * Branch: production — Lakebase Postgres + private uploads bucket.
 *
 * Manage with:
 *   neon status          # inspect live branch config
 *   neon config plan     # dry-run diff
 *   neon deploy          # apply changes + pull env
 */
export default defineConfig({
  preview: {
    buckets: {
      uploads: {
        access: 'private',
      },
    },
  },
});

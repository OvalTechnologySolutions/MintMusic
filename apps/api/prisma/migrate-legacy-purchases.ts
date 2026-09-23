/**
 * Backfill SongEntitlement + LibraryItem from legacy Purchase rows.
 * No Mint is charged. Safe to run repeatedly (upserts).
 *
 * Usage: npx tsx prisma/migrate-legacy-purchases.ts
 */
import { migrateLegacyPurchasesToEntitlements } from '../src/modules/library/library.service.js';

async function main() {
  const result = await migrateLegacyPurchasesToEntitlements();
  console.log('Legacy purchase migration complete:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

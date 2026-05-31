/**
 * Migrate legacy JSON users (apps/api/data/users.json) into PostgreSQL.
 * Run after DATABASE_URL is set: npm run db:migrate-users -w @mintmusic/api
 */
import 'dotenv/config';
import { exportAllUsers } from '../src/store/users-json.js';
import { importJsonUser } from '../src/services/users-prisma.js';
import { disconnectPrisma } from '../src/lib/prisma.js';
import { isDatabaseConfigured } from '../src/config/env.js';

async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const users = await exportAllUsers();
  if (users.length === 0) {
    console.info('No JSON users to migrate (users.json empty or missing)');
    return;
  }

  let migrated = 0;
  for (const record of users) {
    await importJsonUser(record);
    migrated++;
    console.info(`Migrated ${record.email} (${record.id})`);
  }

  console.info(`Done — migrated ${migrated} user(s) to PostgreSQL`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());

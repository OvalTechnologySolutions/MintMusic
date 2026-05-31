/**
 * Dev helper: approve a user as creator by email.
 * Usage: npm run db:approve-creator -w @mintmusic/api -- you@email.com
 */
import './load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run db:approve-creator -- <email>');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { creatorStatus: 'approved', role: 'creator' },
  });

  console.log(`Approved creator: ${user.name} (${user.email}) id=${user.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

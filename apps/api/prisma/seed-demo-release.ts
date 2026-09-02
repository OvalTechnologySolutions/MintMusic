/**
 * Dev helper: create a published demo release for Stripe checkout testing.
 * Usage: npm run db:seed-demo-release -w @mintmusic/api -- creator@email.com
 */
import './load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run db:seed-demo-release -- <creator-email>');
    process.exit(1);
  }

  const creator = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!creator) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  if (creator.creatorStatus !== 'approved') {
    console.error('User is not an approved creator. Run db:approve-creator first.');
    process.exit(1);
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      creatorId: creator.id,
      filename: 'demo-track.mp3',
      mimeType: 'audio/mpeg',
      format: 'mp3',
      byteSize: BigInt(3_000_000),
      storageKey: `demo/${creator.id}/demo-track.mp3`,
      processingStatus: 'ready',
      drmStatus: 'none',
    },
  });

  const release = await prisma.release.create({
    data: {
      creatorId: creator.id,
      mediaAssetId: asset.id,
      type: 'single',
      title: 'Demo Single — Stripe Test',
      description: 'Test release for MintMusic store checkout',
      genreTags: ['demo', 'indie'],
      priceCents: 999,
      currency: 'usd',
      published: true,
      publishedAt: new Date(),
    },
  });

  console.log('Created demo release:');
  console.log(`  id:    ${release.id}`);
  console.log(`  title: ${release.title}`);
  console.log(`  price: $${(release.priceCents / 100).toFixed(2)}`);
  console.log('Open /collector as a different user to buy it.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

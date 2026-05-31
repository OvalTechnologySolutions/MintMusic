import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const channels = [
  {
    slug: 'indie-discovery',
    name: 'Indie Discovery',
    description: 'Emerging independent artists across genres',
    type: 'editorial' as const,
    genreTags: ['indie', 'alternative'],
  },
  {
    slug: 'hip-hop-fresh',
    name: 'Hip-Hop Fresh',
    description: 'New hip-hop and rap releases',
    type: 'genre' as const,
    genreTags: ['hip-hop', 'rap'],
  },
  {
    slug: 'electronic-pulse',
    name: 'Electronic Pulse',
    description: 'Electronic, house, and techno discovery',
    type: 'genre' as const,
    genreTags: ['electronic', 'house', 'techno'],
  },
  {
    slug: 'us-west-coast',
    name: 'US West Coast Radio',
    description: 'Regional discovery for US West Coast',
    type: 'regional' as const,
    genreTags: [],
    regionCode: 'US-WC',
  },
];

async function main() {
  for (const ch of channels) {
    await prisma.discoveryChannel.upsert({
      where: { slug: ch.slug },
      create: ch,
      update: {
        name: ch.name,
        description: ch.description,
        genreTags: ch.genreTags,
        regionCode: ch.regionCode ?? null,
      },
    });
  }
  console.log(`Seeded ${channels.length} discovery channels`);

  const broadcastLicenses = [
    {
      regionCode: 'US-WC',
      name: 'US West Coast Broadcast',
      licenseType: 'blanket' as const,
      rightsHolder: 'MintMusic Platform (placeholder)',
      territories: ['US'],
      validFrom: new Date('2024-01-01'),
      documentUrl: null,
    },
    {
      regionCode: 'US',
      name: 'United States National',
      licenseType: 'performance' as const,
      rightsHolder: 'MintMusic Platform (placeholder)',
      territories: ['US'],
      validFrom: new Date('2024-01-01'),
      documentUrl: null,
    },
  ];

  for (const lic of broadcastLicenses) {
    const existing = await prisma.broadcastLicense.findFirst({
      where: {
        regionCode: lic.regionCode,
        licenseType: lic.licenseType,
      },
    });
    if (!existing) {
      await prisma.broadcastLicense.create({ data: lic });
    }
  }
  console.log(`Seeded ${broadcastLicenses.length} broadcast licenses`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

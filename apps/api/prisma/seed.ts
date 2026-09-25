import './load-env.js';
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

  const connectorDefaults = [
    {
      id: 'editorial_html',
      enabled: true,
      reason: 'Public editorial HTML retrieval with robots/SSRF checks',
    },
    { id: 'manual_import', enabled: true, reason: 'Admin CSV/JSON/URL import' },
    {
      id: 'musicbrainz',
      enabled: false,
      reason:
        'Disabled: MusicBrainz WS free for non-commercial use only; set MUSICBRAINZ_ENABLED=true after MetaBrainz commercial/supporter agreement',
    },
    {
      id: 'wikidata',
      enabled: true,
      reason: 'SPARQL sameAs / social URL lookup (no contact data)',
    },
    {
      id: 'spotify',
      enabled: false,
      reason: 'Disabled: SPOTIFY_CLIENT_ID/SECRET not configured',
    },
    {
      id: 'tiktok',
      enabled: false,
      reason:
        'Disabled: TikTok Research Tools exclude commercial users; use manual import for On The Radar',
    },
    {
      id: 'instagram',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
    {
      id: 'x',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
    {
      id: 'facebook',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
  ];

  for (const c of connectorDefaults) {
    await prisma.cbConnectorStatus.upsert({
      where: { id: c.id },
      create: c,
      update: { enabled: c.enabled, reason: c.reason },
    });
  }

  const cbSources = [
    {
      name: 'Ones To Watch — Top 26 Artists 2025',
      type: 'editorial_url' as const,
      url: 'https://www.onestowatch.com/en/blog/the-top-26-artists-to-watch-in-2025',
      connectorId: 'editorial_html',
      enabled: true,
    },
    {
      name: 'Ones To Watch — Best Underground Artists 2026',
      type: 'editorial_url' as const,
      url: 'https://resources.onestowatch.com/best-underground-artists-2026/',
      connectorId: 'editorial_html',
      enabled: true,
    },
    {
      name: 'On The Radar Radio (TikTok)',
      type: 'social_account' as const,
      url: 'https://www.tiktok.com/@ontheradarradio',
      connectorId: 'tiktok',
      enabled: true,
      configJson: {
        note: 'Live TikTok fetch disabled for commercial use; import posts/artists manually via CSV/JSON',
      },
    },
  ];

  for (const src of cbSources) {
    const existing = await prisma.cbSource.findFirst({
      where: { url: src.url ?? undefined, name: src.name },
    });
    if (existing) {
      await prisma.cbSource.update({
        where: { id: existing.id },
        data: {
          connectorId: src.connectorId,
          enabled: src.enabled,
          type: src.type,
          configJson: 'configJson' in src ? src.configJson : {},
        },
      });
    } else {
      await prisma.cbSource.create({
        data: {
          name: src.name,
          type: src.type,
          url: src.url,
          connectorId: src.connectorId,
          enabled: src.enabled,
          configJson: 'configJson' in src ? src.configJson : {},
        },
      });
    }
  }
  console.log(`Seeded ${cbSources.length} CrateBuilder sources`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { Router } from 'express';
import type { Request } from 'express';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import type { DiscoverStoreQuery, DiscoverStoreResponse } from '@mintmusic/shared';
import { routeParam } from '../../lib/route-param.js';
import { toPublicArtistDto } from '../cratebuilder/mappers.js';
import type { Prisma } from '@prisma/client';

export const discoverRouter = Router();

/** GET /v1/discover/store — public digital album store + search */
discoverRouter.get(
  '/store',
  ensureDatabase,
  asyncHandler(async (req: Request, res) => {
    const q = req.query as DiscoverStoreQuery;
    const db = await getPrisma();
    const limit = Math.min(Number(q.limit ?? 24), 48);

    const releases = await db.release.findMany({
      where: {
        published: true,
        ...(q.genre ? { genreTags: { has: q.genre } } : {}),
        ...(q.type ? { type: q.type } : {}),
        ...(q.q
          ? { title: { contains: q.q, mode: 'insensitive' } }
          : {}),
        ...(q.cursor ? { id: { lt: q.cursor } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      include: { creator: { select: { name: true } } },
    });

    const hasMore = releases.length > limit;
    const slice = hasMore ? releases.slice(0, limit) : releases;

    const response: DiscoverStoreResponse = {
      releases: slice.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        creatorName: r.creator.name,
        priceCents: r.priceCents,
        coverUrl: r.coverUrl ?? undefined,
        genreTags: r.genreTags,
      })),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
    };

    res.json(response);
  })
);

/**
 * GET /v1/discover/artists — public CrateBuilder discovery allowlist.
 * Never returns contacts, outreach, or evidence.
 */
discoverRouter.get(
  '/artists',
  ensureDatabase,
  asyncHandler(async (req: Request, res) => {
    const db = await getPrisma();
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
    const location = typeof req.query.location === 'string' ? req.query.location : undefined;
    const recent = req.query.recent === 'true' || req.query.recent === '1';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = Math.min(Number(req.query.limit ?? 24), 48);

    const where: Prisma.CbArtistWhereInput = {
      discoveryVisible: true,
      suppressedAt: null,
      ...(q ? { stageName: { contains: q, mode: 'insensitive' } } : {}),
      ...(genre ? { genres: { has: genre } } : {}),
      ...(location
        ? {
            OR: [
              { currentCity: { contains: location, mode: 'insensitive' } },
              { currentRegion: { contains: location, mode: 'insensitive' } },
              { currentCountry: { contains: location, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(recent ? { firstDiscoveredAt: { gte: new Date(Date.now() - 14 * 86400000) } } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const rows = await db.cbArtist.findMany({
      where,
      orderBy: [{ firstDiscoveredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { profiles: true },
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;

    res.json({
      artists: slice.map(toPublicArtistDto),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
    });
  })
);

discoverRouter.use(requireInternalUser, ensureDatabase);

/** GET /v1/discover/channels */
discoverRouter.get(
  '/channels',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const channels = await db.discoveryChannel.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ channels });
  })
);

/** GET /v1/discover/channels/:slug/now-playing */
discoverRouter.get(
  '/channels/:slug/now-playing',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const slug = routeParam(req.params.slug);
    const channel = await db.discoveryChannel.findUnique({
      where: { slug },
    });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const rotation = await db.radioRotation.findFirst({
      where: {
        channelId: channel.id,
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      orderBy: { weight: 'desc' },
    });

    res.json({ channel, rotation });
  })
);

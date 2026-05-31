import { Router } from 'express';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import type { DiscoverStoreQuery, DiscoverStoreResponse } from '@mintmusic/shared';
import { routeParam } from '../../lib/route-param.js';

export const discoverRouter = Router();

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

/** GET /v1/discover/store — digital album store + search */
discoverRouter.get(
  '/store',
  asyncHandler(async (req: AuthedRequest, res) => {
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

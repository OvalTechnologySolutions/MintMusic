import { Router } from 'express';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import type { FeedResponse } from '@mintmusic/shared';
import { routeParam } from '../../lib/route-param.js';

export const feedRouter = Router();

feedRouter.use(requireInternalUser, ensureDatabase);

/** GET /v1/feed?cursor= */
feedRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const cursor = req.query.cursor as string | undefined;

    const follows = await db.follow.findMany({
      where: { collectorId: req.userId! },
      select: { creatorId: true },
    });
    const creatorIds = follows.map((f) => f.creatorId);

    if (creatorIds.length === 0) {
      res.json({ items: [], nextCursor: undefined } satisfies FeedResponse);
      return;
    }

    const posts = await db.post.findMany({
      where: {
        creatorId: { in: creatorIds },
        ...(cursor ? { publishedAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit + 1,
      include: {
        creator: { select: { id: true, name: true, image: true } },
      },
    });

    const hasMore = posts.length > limit;
    const slice = hasMore ? posts.slice(0, limit) : posts;

    const response: FeedResponse = {
      items: slice.map((p) => ({
        id: p.id,
        creatorId: p.creatorId,
        creatorName: p.creator.name,
        creatorImage: p.creator.image ?? undefined,
        type: p.type,
        body: p.body,
        releaseId: p.releaseId ?? undefined,
        mediaUrl: p.mediaUrl ?? undefined,
        publishedAt: p.publishedAt.toISOString(),
      })),
      nextCursor: hasMore
        ? slice[slice.length - 1]?.publishedAt.toISOString()
        : undefined,
    };

    res.json(response);
  })
);

/** POST /v1/feed/follow/:creatorId */
feedRouter.post(
  '/follow/:creatorId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const creatorId = routeParam(req.params.creatorId);
    await db.follow.upsert({
      where: {
        collectorId_creatorId: {
          collectorId: req.userId!,
          creatorId,
        },
      },
      create: {
        collectorId: req.userId!,
        creatorId,
      },
      update: {},
    });
    res.status(201).json({ following: true });
  })
);

/** DELETE /v1/feed/follow/:creatorId */
feedRouter.delete(
  '/follow/:creatorId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const creatorId = routeParam(req.params.creatorId);
    await db.follow.deleteMany({
      where: {
        collectorId: req.userId!,
        creatorId,
      },
    });
    res.json({ following: false });
  })
);

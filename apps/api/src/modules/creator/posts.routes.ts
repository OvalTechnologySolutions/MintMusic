import { Router } from 'express';
import type { CreatePostRequest } from '@mintmusic/shared';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { requireApprovedCreator } from '../../middleware/require-creator.js';

export const postsRouter = Router();

postsRouter.use(requireInternalUser, ensureDatabase, requireApprovedCreator);

/** POST /v1/posts — pushes to collector feeds of followers */
postsRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as CreatePostRequest;
    const db = await getPrisma();

    const post = await db.post.create({
      data: {
        creatorId: req.userId!,
        type: body.type ?? 'announcement',
        body: body.body,
        releaseId: body.releaseId,
        mediaUrl: body.mediaUrl,
      },
    });

    // TODO: fan-out notification job (Redis pub/sub or push queue)
    res.status(201).json({ post });
  })
);

/** GET /v1/posts/mine */
postsRouter.get(
  '/mine',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const posts = await db.post.findMany({
      where: { creatorId: req.userId! },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    res.json({ posts });
  })
);

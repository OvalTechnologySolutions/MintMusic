import { Router } from 'express';
import type {
  CreateReleaseRequest,
  UploadIntentRequest,
  UploadIntentResponse,
} from '@mintmusic/shared';
import { getPrisma } from '../../lib/prisma.js';
import {
  createPresignedUpload,
  mimeToFormat,
} from '../../lib/storage/s3.js';
import { enqueueDrmPackaging } from '../../lib/drm/playback.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { requireApprovedCreator } from '../../middleware/require-creator.js';
import { NotFoundError } from '../../lib/errors.js';
import { routeParam } from '../../lib/route-param.js';

export const mediaRouter = Router();

mediaRouter.use(requireInternalUser, ensureDatabase, requireApprovedCreator);

/** POST /v1/media/upload-intent — presigned URL for mp3/wav/mp4 */
mediaRouter.post(
  '/upload-intent',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as UploadIntentRequest;
    const format = mimeToFormat(body.mimeType);
    if (!format) {
      res.status(400).json({ error: 'Unsupported format. Use mp3, wav, or mp4.' });
      return;
    }

    const presigned = await createPresignedUpload(
      req.userId!,
      body.filename,
      body.mimeType,
      body.byteSize
    );

    const db = await getPrisma();
    const asset = await db.mediaAsset.create({
      data: {
        creatorId: req.userId!,
        filename: body.filename,
        mimeType: body.mimeType,
        format,
        byteSize: BigInt(body.byteSize),
        storageKey: presigned.storageKey,
        processingStatus: 'pending',
      },
    });

    const response: UploadIntentResponse = {
      mediaAssetId: asset.id,
      uploadUrl: presigned.uploadUrl,
      storageKey: presigned.storageKey,
      expiresInSeconds: presigned.expiresInSeconds,
    };
    res.status(201).json(response);
  })
);

/** POST /v1/media/:id/complete — mark upload done, queue transcode */
mediaRouter.post(
  '/:id/complete',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const assetId = routeParam(req.params.id);
    const asset = await db.mediaAsset.findFirst({
      where: { id: assetId, creatorId: req.userId! },
    });
    if (!asset) throw new NotFoundError('Media asset not found');

    await db.mediaAsset.update({
      where: { id: asset.id },
      data: { processingStatus: 'ready' },
    });

    const drmJob = await enqueueDrmPackaging(asset.id);
    res.json({ mediaAssetId: asset.id, status: 'ready', drm: drmJob });
  })
);

export const catalogRouter = Router();

catalogRouter.use(requireInternalUser, ensureDatabase, requireApprovedCreator);

/** POST /v1/catalog/releases */
catalogRouter.post(
  '/releases',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as CreateReleaseRequest;
    const db = await getPrisma();

    if (body.type === 'album') {
      if (!body.tracks?.length) {
        res.status(400).json({ error: 'Album requires at least one track' });
        return;
      }
      for (const track of body.tracks) {
        const trackAsset = await db.mediaAsset.findFirst({
          where: { id: track.mediaAssetId, creatorId: req.userId! },
        });
        if (!trackAsset || trackAsset.processingStatus !== 'ready') {
          res.status(400).json({
            error: `Track "${track.title}": media asset not ready`,
          });
          return;
        }
      }

      const release = await db.release.create({
        data: {
          creatorId: req.userId!,
          type: body.type,
          title: body.title,
          description: body.description,
          genreTags: body.genreTags ?? [],
          priceCents: body.priceCents,
          currency: body.currency ?? 'usd',
          coverUrl: body.coverUrl,
          published: false,
          tracks: {
            create: body.tracks.map((t) => ({
              title: t.title,
              trackNumber: t.trackNumber,
              durationMs: t.durationMs,
              mediaAssetId: t.mediaAssetId,
            })),
          },
        },
        include: { tracks: true },
      });
      res.status(201).json({ release });
      return;
    }

    if (!body.mediaAssetId) {
      res.status(400).json({
        error: 'mediaAssetId required for single, music_video, and visualizer',
      });
      return;
    }

    const asset = await db.mediaAsset.findFirst({
      where: { id: body.mediaAssetId, creatorId: req.userId! },
    });
    if (!asset || asset.processingStatus !== 'ready') {
      res.status(400).json({ error: 'Media asset not ready' });
      return;
    }

    const release = await db.release.create({
      data: {
        creatorId: req.userId!,
        mediaAssetId: body.mediaAssetId,
        type: body.type,
        title: body.title,
        description: body.description,
        genreTags: body.genreTags ?? [],
        priceCents: body.priceCents,
        currency: body.currency ?? 'usd',
        coverUrl: body.coverUrl,
        published: false,
      },
    });

    res.status(201).json({ release });
  })
);

/** PATCH /v1/catalog/releases/:id/publish */
catalogRouter.patch(
  '/releases/:id/publish',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const releaseId = routeParam(req.params.id);
    const release = await db.release.updateMany({
      where: { id: releaseId, creatorId: req.userId! },
      data: { published: true, publishedAt: new Date() },
    });
    if (release.count === 0) throw new NotFoundError('Release not found');
    res.json({ published: true });
  })
);

/** GET /v1/catalog/releases/mine */
catalogRouter.get(
  '/releases/mine',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const releases = await db.release.findMany({
      where: { creatorId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { tracks: { include: { mediaAsset: true } } },
    });
    res.json({ releases });
  })
);

import { Router } from 'express';
import type {
  PlaybackTokenRequest,
  RecordPlayRequest,
} from '@mintmusic/shared';
import { isDrmConfigured } from '../../config/env.js';
import { getPrisma } from '../../lib/prisma.js';
import {
  createPlaybackToken,
  hashToken,
  newSessionId,
} from '../../lib/playback-token.js';
import { buildDrmPlaybackUrls } from '../../lib/drm/playback.js';
import { getPublicStreamUrl } from '../../lib/storage/s3.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { routeParam } from '../../lib/route-param.js';

export const collectionRouter = Router();

collectionRouter.use(requireInternalUser, ensureDatabase);

/** GET /v1/collection — owned digital assets */
collectionRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const purchases = await db.purchase.findMany({
      where: { collectorId: req.userId! },
      orderBy: { purchasedAt: 'desc' },
      include: {
        release: {
          include: {
            creator: { select: { name: true } },
            tracks: { orderBy: { trackNumber: 'asc' } },
          },
        },
      },
    });

    res.json({
      items: purchases.map((p) => ({
        releaseId: p.releaseId,
        title: p.release.title,
        type: p.release.type,
        coverUrl: p.release.coverUrl,
        creatorName: p.release.creator.name,
        purchasedAt: p.purchasedAt.toISOString(),
        tracks:
          p.release.tracks.length > 0
            ? p.release.tracks.map((t) => ({
                id: t.id,
                title: t.title,
                trackNumber: t.trackNumber,
              }))
            : undefined,
      })),
    });
  })
);

/** POST /v1/collection/playback-token — DRM or fallback stream URL */
collectionRouter.post(
  '/playback-token',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as PlaybackTokenRequest;
    const db = await getPrisma();

    const owned = await db.purchase.findUnique({
      where: {
        collectorId_releaseId: {
          collectorId: req.userId!,
          releaseId: body.releaseId,
        },
      },
      include: {
        release: {
          include: {
            mediaAsset: true,
            tracks: { include: { mediaAsset: true } },
          },
        },
      },
    });
    if (!owned) throw new ForbiddenError('You do not own this release');

    let mediaAsset = owned.release.mediaAsset;
    if (body.trackId) {
      const track = owned.release.tracks.find((t) => t.id === body.trackId);
      if (!track) throw new NotFoundError('Track not found on this release');
      mediaAsset = track.mediaAsset;
    }

    if (!mediaAsset) {
      throw new NotFoundError('No playable media for this release');
    }

    const sessionId = newSessionId();
    const drmSystem = body.drmSystem ?? 'widevine';
    const { token, expiresAt } = createPlaybackToken(
      req.userId!,
      body.releaseId,
      sessionId,
      { trackId: body.trackId, drmSystem }
    );

    await db.playbackSession.create({
      data: {
        userId: req.userId!,
        releaseId: body.releaseId,
        trackId: body.trackId,
        drmSystem,
        tokenHash: hashToken(token),
        expiresAt,
        deviceHint: body.deviceHint,
      },
    });

    const useDrm =
      isDrmConfigured() &&
      mediaAsset.drmStatus === 'ready' &&
      (mediaAsset.widevineReady || mediaAsset.fairplayReady);

    if (useDrm) {
      const drm = buildDrmPlaybackUrls(
        {
          contentKeyId: mediaAsset.contentKeyId,
          hlsManifestKey: mediaAsset.hlsManifestKey,
          dashManifestKey: mediaAsset.dashManifestKey,
          widevineReady: mediaAsset.widevineReady,
          fairplayReady: mediaAsset.fairplayReady,
          mimeType: mediaAsset.mimeType,
        },
        mediaAsset.id,
        token,
        drmSystem
      );
      res.json({
        sessionId,
        streamUrl: drm.manifestUrl,
        expiresAt: expiresAt.toISOString(),
        mimeType: drm.mimeType,
        drm: {
          system: drm.drmSystem,
          manifestUrl: drm.manifestUrl,
          licenseUrl: drm.licenseUrl,
          contentId: drm.contentId,
          fairplayCertificateUrl: drm.fairplayCertificateUrl,
        },
      });
      return;
    }

    const streamUrl = `${getPublicStreamUrl(mediaAsset.storageKey)}?token=${token}`;
    res.json({
      sessionId,
      streamUrl,
      expiresAt: expiresAt.toISOString(),
      mimeType: mediaAsset.mimeType,
    });
  })
);

/** POST /v1/collection/plays — record listen for analytics */
collectionRouter.post(
  '/plays',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as RecordPlayRequest;
    const db = await getPrisma();

    await db.playEvent.create({
      data: {
        userId: req.userId!,
        releaseId: body.releaseId,
        source: body.source,
        listenedMs: body.listenedMs,
        deviceType: body.deviceType,
      },
    });

    res.status(201).json({ recorded: true });
  })
);

/** GET /v1/collection/check/:releaseId */
collectionRouter.get(
  '/check/:releaseId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const releaseId = routeParam(req.params.releaseId);
    const purchase = await db.purchase.findUnique({
      where: {
        collectorId_releaseId: {
          collectorId: req.userId!,
          releaseId,
        },
      },
    });
    res.json({ owned: Boolean(purchase) });
  })
);

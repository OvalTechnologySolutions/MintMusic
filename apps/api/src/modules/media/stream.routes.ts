import { Router } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ForbiddenError, NotFoundError, ServiceUnavailableError } from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';
import { hashToken, verifyPlaybackToken } from '../../lib/playback-token.js';
import { env, isStorageConfigured } from '../../config/env.js';
import { userHasTrackAccess } from '../library/library.service.js';

export const streamRouter = Router();

/**
 * GET /v1/stream/:storageKey
 * Requires ?token= playback JWT. Redirects to a short-lived signed GET URL.
 */
streamRouter.get(
  '/*storageKey',
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? '');
    if (!token) throw new ForbiddenError('Playback token required');

    const payload = verifyPlaybackToken(token);
    if (!payload) throw new ForbiddenError('Invalid or expired playback token');

    const raw = req.params.storageKey;
    const storageKey = decodeURIComponent(
      Array.isArray(raw) ? raw.join('/') : String(raw ?? '')
    ).replace(/^\//, '');
    if (!storageKey) throw new NotFoundError('Media not found');

    const db = await getPrisma();
    const session = await db.playbackSession.findFirst({
      where: {
        tokenHash: hashToken(token),
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) throw new ForbiddenError('Playback session expired');

    if (session.trackId) {
      const ok = await userHasTrackAccess(session.userId, session.trackId);
      if (!ok) throw new ForbiddenError('No entitlement for this track');
    } else {
      const purchase = await db.purchase.findUnique({
        where: {
          collectorId_releaseId: {
            collectorId: session.userId,
            releaseId: session.releaseId,
          },
        },
      });
      if (!purchase) {
        const anyEntitlement = await db.songEntitlement.findFirst({
          where: {
            userId: session.userId,
            track: { releaseId: session.releaseId },
          },
        });
        if (!anyEntitlement) {
          throw new ForbiddenError('No entitlement for this release');
        }
      }
    }

    const asset = await db.mediaAsset.findFirst({ where: { storageKey } });
    if (!asset) throw new NotFoundError('Media not found');

    if (!isStorageConfigured()) {
      throw new ServiceUnavailableError('Object storage not configured');
    }

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: Boolean(env.S3_ENDPOINT),
    });
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: storageKey,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 120 });
    res.redirect(302, url);
  })
);

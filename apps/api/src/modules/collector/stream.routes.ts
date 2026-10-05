import { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getPrisma } from '../../lib/prisma.js';
import { isDatabaseConfigured } from '../../config/env.js';
import {
  hashToken,
  verifyPlaybackToken,
} from '../../lib/playback-token.js';
import { streamStoredObject } from '../../lib/storage/s3.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../lib/errors.js';

export const streamRouter = Router();

function asNodeReadable(body: Readable): Readable {
  if (typeof body.pipe === 'function') return body;
  const withWeb = body as Readable & {
    transformToWebStream?: () => ReadableStream;
  };
  if (typeof withWeb.transformToWebStream === 'function') {
    return Readable.fromWeb(
      withWeb.transformToWebStream() as import('node:stream/web').ReadableStream
    );
  }
  return body;
}

/** GET /v1/stream?token= — token-gated private-bucket playback */
streamRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      throw new UnauthorizedError('Missing playback token');
    }

    const claims = verifyPlaybackToken(token);
    if (!claims) {
      throw new UnauthorizedError('Invalid or expired playback token');
    }

    if (!isDatabaseConfigured()) {
      throw new ServiceUnavailableError(
        'Database not configured. Set DATABASE_URL and run prisma migrate.'
      );
    }

    const db = await getPrisma();
    const session = await db.playbackSession.findFirst({
      where: {
        tokenHash: hashToken(token),
        userId: claims.sub,
        releaseId: claims.releaseId,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) {
      throw new ForbiddenError('Playback session expired');
    }

    const owned = await db.purchase.findUnique({
      where: {
        collectorId_releaseId: {
          collectorId: claims.sub,
          releaseId: claims.releaseId,
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
    if (claims.trackId) {
      const track = owned.release.tracks.find((t) => t.id === claims.trackId);
      if (!track) throw new NotFoundError('Track not found on this release');
      mediaAsset = track.mediaAsset;
    }
    if (!mediaAsset) {
      throw new NotFoundError('No playable media for this release');
    }

    const object = await streamStoredObject(mediaAsset.storageKey);
    res.status(200);
    res.setHeader(
      'Content-Type',
      mediaAsset.mimeType || object.contentType || 'application/octet-stream'
    );
    if (object.contentLength != null) {
      res.setHeader('Content-Length', String(object.contentLength));
    }
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    try {
      await pipeline(asNodeReadable(object.body), res);
    } catch {
      if (!res.headersSent) {
        throw new NotFoundError('Media not found');
      }
      res.destroy();
    }
  })
);

import { Router } from 'express';
import type { SaveSongRequest } from '@mintmusic/shared';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { routeParam } from '../../lib/route-param.js';
import {
  createOfflineLease,
  hideLibraryItem,
  listLibrary,
  restoreLibraryItem,
  revokeOfflineLeases,
  saveSong,
  userHasTrackAccess,
} from './library.service.js';
import { AppError } from '../../lib/errors.js';

export const libraryRouter = Router();
export const offlineRouter = Router();

libraryRouter.use(requireInternalUser, ensureDatabase);
offlineRouter.use(requireInternalUser, ensureDatabase);

libraryRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const includeHidden = req.query.includeHidden === '1';
    const items = await listLibrary(req.userId!, includeHidden);
    res.json({ items });
  })
);

libraryRouter.post(
  '/save',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as SaveSongRequest;
    const result = await saveSong({
      userId: req.userId!,
      trackId: body.trackId,
      idempotencyKey: body.idempotencyKey,
    });
    res.json(result);
  })
);

libraryRouter.delete(
  '/:trackId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const trackId = routeParam(req.params.trackId);
    await hideLibraryItem(req.userId!, trackId);
    res.json({ ok: true });
  })
);

libraryRouter.post(
  '/:trackId/restore',
  asyncHandler(async (req: AuthedRequest, res) => {
    const trackId = routeParam(req.params.trackId);
    const item = await restoreLibraryItem(req.userId!, trackId);
    res.json({ id: item.id, visible: item.visible });
  })
);

libraryRouter.get(
  '/access/:trackId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const trackId = routeParam(req.params.trackId);
    const entitled = await userHasTrackAccess(req.userId!, trackId);
    res.json({ entitled });
  })
);

offlineRouter.post(
  '/lease',
  asyncHandler(async (req: AuthedRequest, res) => {
    const deviceId = String(req.body?.deviceId ?? '').trim();
    if (!deviceId) throw new AppError('deviceId is required', 400);
    const lease = await createOfflineLease(req.userId!, deviceId);
    res.json(lease);
  })
);

offlineRouter.post(
  '/revoke',
  asyncHandler(async (req: AuthedRequest, res) => {
    await revokeOfflineLeases(req.userId!);
    res.json({ ok: true });
  })
);

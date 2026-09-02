import { Router } from 'express';
import type { RadioOptInRequest } from '@mintmusic/shared';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { requireApprovedCreator } from '../../middleware/require-creator.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import {
  activateRadioRotation,
  isRegionLicensed,
  listLicensedRegions,
} from '../../services/broadcast.js';

export const radioRouter = Router();

radioRouter.use(requireInternalUser, ensureDatabase, requireApprovedCreator);

/** GET /v1/radio/regions — licensed broadcast regions */
radioRouter.get(
  '/regions',
  asyncHandler(async (_req, res) => {
    const regions = await listLicensedRegions();
    res.json({ regions });
  })
);

/** POST /v1/radio/opt-in — auto-approved when region is licensed */
radioRouter.post(
  '/opt-in',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = req.body as RadioOptInRequest;
    const regionCode = body.regionCode.toUpperCase();
    const db = await getPrisma();

    const release = await db.release.findFirst({
      where: { id: body.releaseId, creatorId: req.userId!, published: true },
    });
    if (!release) throw new NotFoundError('Published release not found');

    const licensed = await isRegionLicensed(regionCode);
    if (!licensed) {
      throw new ForbiddenError(
        `Region ${regionCode} is not licensed for broadcast. Contact ops to add a BroadcastLicense.`
      );
    }

    const now = new Date();
    const optIn = await db.radioOptIn.upsert({
      where: {
        releaseId_regionCode: {
          releaseId: body.releaseId,
          regionCode,
        },
      },
      create: {
        creatorId: req.userId!,
        releaseId: body.releaseId,
        regionCode,
        status: 'active',
        licensedAt: now,
      },
      update: { status: 'active', licensedAt: now },
    });

    await activateRadioRotation(body.releaseId, regionCode);

    res.status(201).json({ optIn, autoApproved: true });
  })
);

/** GET /v1/radio/opt-ins */
radioRouter.get(
  '/opt-ins',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const optIns = await db.radioOptIn.findMany({
      where: { creatorId: req.userId! },
      orderBy: { optedInAt: 'desc' },
    });
    res.json({ optIns });
  })
);

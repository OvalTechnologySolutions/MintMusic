import type { Response, NextFunction } from 'express';
import { getPrisma } from '../lib/prisma.js';
import type { AuthedRequest } from './internal-auth.js';
import { ForbiddenError } from '../lib/errors.js';
import { userHasArtistFeatureAccess } from '../modules/artist/subscription.service.js';

export async function requireApprovedCreator(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = await getPrisma();
    const user = await db.user.findUnique({
      where: { id: req.userId! },
      select: { creatorStatus: true },
    });
    if (!user || user.creatorStatus !== 'approved') {
      next(new ForbiddenError('Approved creator account required'));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Approved creator with active/trialing artist subscription (or free-year access). */
export async function requireArtistSubscriptionAccess(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = await getPrisma();
    const user = await db.user.findUnique({
      where: { id: req.userId! },
      select: { creatorStatus: true },
    });
    if (!user || user.creatorStatus !== 'approved') {
      next(new ForbiddenError('Approved creator account required'));
      return;
    }
    const ok = await userHasArtistFeatureAccess(req.userId!);
    if (!ok) {
      next(
        new ForbiddenError(
          'Artist subscription required. Activate your free year or renew at $9.99/month.'
        )
      );
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

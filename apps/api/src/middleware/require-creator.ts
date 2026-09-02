import type { Response, NextFunction } from 'express';
import { getPrisma } from '../lib/prisma.js';
import type { AuthedRequest } from './internal-auth.js';
import { ForbiddenError } from '../lib/errors.js';

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

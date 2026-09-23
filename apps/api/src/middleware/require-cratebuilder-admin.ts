import type { Response, NextFunction } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import type { AuthedRequest } from './internal-auth.js';

function adminEmailAllowlist(): Set<string> {
  return new Set(
    env.CRATEBUILDER_ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isCrateBuilderAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().has(email.toLowerCase());
}

/**
 * Requires internal user + admin: User.role === 'admin' OR email in CRATEBUILDER_ADMIN_EMAILS.
 */
export async function requireCrateBuilderAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const secret = req.headers['x-internal-secret'];
  const userId = req.headers['x-user-id'];
  if (
    typeof secret !== 'string' ||
    secret !== env.INTERNAL_API_SECRET ||
    typeof userId !== 'string'
  ) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.userId = userId;

  try {
    const db = await getPrisma();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role === 'admin' || isCrateBuilderAdminEmail(user.email)) {
      next();
      return;
    }
    res.status(403).json({ error: 'CrateBuilder admin access required' });
  } catch (err) {
    next(err);
  }
}

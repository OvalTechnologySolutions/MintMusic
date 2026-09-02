import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

function hasValidInternalSecret(req: Request): boolean {
  const secret = req.headers['x-internal-secret'];
  return typeof secret === 'string' && secret === config.internalApiSecret;
}

/** Server-to-server calls that are not yet tied to a MintMusic user (OAuth sync). */
export function requireInternalSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!hasValidInternalSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireInternalUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers['x-user-id'];

  if (!hasValidInternalSecret(req) || typeof userId !== 'string') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.userId = userId;
  next();
}

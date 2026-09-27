import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { INSECURE_INTERNAL_API_SECRETS } from '../config/env.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

function hasValidInternalSecret(req: Request): boolean {
  const configured = config.internalApiSecret;
  // Never compare against a missing/public secret — `'' === ''` would auth everyone
  // who sends an empty X-Internal-Secret header (same class of bug as an empty
  // Stripe webhook signing secret).
  if (
    !configured ||
    configured.length < 8 ||
    INSECURE_INTERNAL_API_SECRETS.has(configured)
  ) {
    return false;
  }
  const secret = req.headers['x-internal-secret'];
  return typeof secret === 'string' && secret === configured;
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

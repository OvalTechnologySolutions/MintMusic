import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireInternalUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers['x-internal-secret'];
  const userId = req.headers['x-user-id'];

  if (secret !== config.internalApiSecret || typeof userId !== 'string') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.userId = userId;
  next();
}

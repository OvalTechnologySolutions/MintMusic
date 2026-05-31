import type { RequestHandler } from 'express';
import { isDatabaseConfigured } from '../config/env.js';
import { ServiceUnavailableError } from '../lib/errors.js';

export const ensureDatabase: RequestHandler = (_req, _res, next) => {
  if (!isDatabaseConfigured()) {
    next(
      new ServiceUnavailableError(
        'Database not configured. Set DATABASE_URL and run prisma migrate.'
      )
    );
    return;
  }
  next();
};

export function asyncHandler(
  fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

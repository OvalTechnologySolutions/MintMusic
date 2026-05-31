import type { NextFunction, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: unknown,
  _req: unknown,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

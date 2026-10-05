import type { Request } from 'express';

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value !== 'string') return undefined;
  return value.split(',')[0]?.trim();
}

/** Public origin of this API as seen by the caller (honors proxy headers). */
export function publicApiOrigin(req: Request): string {
  const proto =
    firstHeaderValue(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host =
    firstHeaderValue(req.headers['x-forwarded-host']) ||
    firstHeaderValue(req.headers.host) ||
    'localhost';
  return `${proto}://${host}`;
}

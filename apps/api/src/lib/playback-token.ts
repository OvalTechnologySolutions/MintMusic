import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env, isPlaybackConfigured } from '../config/env.js';
import { ServiceUnavailableError } from './errors.js';

export interface PlaybackClaims {
  sub: string;
  releaseId: string;
  trackId?: string;
  drmSystem?: string;
  sessionId: string;
  exp: number;
}

function base64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

export function createPlaybackToken(
  userId: string,
  releaseId: string,
  sessionId: string,
  options?: { trackId?: string; drmSystem?: string }
): { token: string; expiresAt: Date } {
  if (!isPlaybackConfigured() || !env.PLAYBACK_JWT_SECRET) {
    throw new ServiceUnavailableError('Playback is not configured');
  }

  const exp = Math.floor(Date.now() / 1000) + env.PLAYBACK_TOKEN_TTL_SECONDS;
  const payload: PlaybackClaims = {
    sub: userId,
    releaseId,
    sessionId,
    exp,
    ...(options?.trackId ? { trackId: options.trackId } : {}),
    ...(options?.drmSystem ? { drmSystem: options.drmSystem } : {}),
  };
  const body = base64Url(JSON.stringify(payload));
  const sig = createHmac('sha256', env.PLAYBACK_JWT_SECRET)
    .update(body)
    .digest('base64url');
  return {
    token: `${body}.${sig}`,
    expiresAt: new Date(exp * 1000),
  };
}

export function verifyPlaybackToken(token: string): PlaybackClaims | null {
  if (!env.PLAYBACK_JWT_SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', env.PLAYBACK_JWT_SECRET)
    .update(body)
    .digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const claims = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8')
  ) as PlaybackClaims;
  if (claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

export function hashToken(token: string): string {
  return createHmac('sha256', env.PLAYBACK_JWT_SECRET ?? 'dev')
    .update(token)
    .digest('hex');
}

export function newSessionId(): string {
  return randomBytes(16).toString('hex');
}

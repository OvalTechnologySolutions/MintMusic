import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { playbackStreamUrl } from '../lib/playback-token.js';
import { publicApiOrigin } from '../lib/public-origin.js';
import type { Request } from 'express';

describe('playbackStreamUrl', () => {
  it('returns an absolute API stream URL with the token as a query param', () => {
    const url = playbackStreamUrl('https://api.mintmusic.ai', 'abc.def');
    expect(url).toBe('https://api.mintmusic.ai/v1/stream?token=abc.def');
    expect(url.includes('/v1/stream/')).toBe(false);
  });

  it('strips a trailing slash on the origin and encodes the token', () => {
    const url = playbackStreamUrl('https://api.mintmusic.ai/', 'a+b=c');
    expect(url).toBe('https://api.mintmusic.ai/v1/stream?token=a%2Bb%3Dc');
  });
});

describe('publicApiOrigin', () => {
  it('prefers forwarded proto and host so BFF/proxy calls stay browser-reachable', () => {
    const req = {
      protocol: 'http',
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'api.mintmusic.ai',
        host: 'localhost:4000',
      },
    } as unknown as Request;
    expect(publicApiOrigin(req)).toBe('https://api.mintmusic.ai');
  });
});

describe('GET /v1/stream', () => {
  const app = createApp();

  it('rejects a missing token without requiring storage or a database', async () => {
    const res = await request(app).get('/v1/stream');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing playback token');
  });

  it('rejects a forged token', async () => {
    const res = await request(app).get('/v1/stream').query({ token: 'not.a.jwt' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired playback token');
  });
});

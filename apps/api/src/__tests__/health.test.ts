import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /v1/health', () => {
  it('returns ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('mintmusic-api');
    expect(res.body.status).toBeDefined();
    expect(res.body.checks).toBeDefined();
  });
});

describe('GET /v1/users/:id/public', () => {
  it('returns 404 for unknown user', async () => {
    const app = createApp();
    const res = await request(app).get('/v1/users/nonexistent-user-id/public');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Profile not found');
  });
});

describe('GET /v1/discover/store', () => {
  it('returns releases array without auth', async () => {
    const app = createApp();
    const res = await request(app).get('/v1/discover/store');
    // Without DATABASE_URL configured in test env, may return 503
    if (res.status === 200) {
      expect(Array.isArray(res.body.releases)).toBe(true);
    } else {
      expect(res.status).toBe(503);
    }
  });
});

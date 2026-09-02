import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config.js';
import { isDatabaseConfigured } from '../config/env.js';
import { readJson, writeJson } from '../store/json-db.js';

const TEST_EMAIL_PREFIX = 'oauth-authz-test-';

function testEmail(suffix: string): string {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}@example.com`;
}

function authHeaders(secret = config.internalApiSecret) {
  return { 'X-Internal-Secret': secret };
}

describe('POST /v1/auth/oauth', () => {
  const app = createApp();

  it('rejects requests without the internal secret', async () => {
    const res = await request(app).post('/v1/auth/oauth').send({
      email: testEmail('no-secret'),
      name: 'Attacker',
      provider: 'github',
      providerAccountId: 'attacker-1',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects requests with the wrong internal secret', async () => {
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders('wrong-internal-secret'))
      .send({
        email: testEmail('bad-secret'),
        name: 'Attacker',
        provider: 'github',
        providerAccountId: 'attacker-2',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects an invalid payload even with a valid secret', async () => {
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders())
      .send({ email: 'not-enough@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid OAuth payload');
  });

  it('creates a user for a first-time OAuth identity', async () => {
    const email = testEmail('create');
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders())
      .send({
        email,
        name: 'First User',
        provider: 'google',
        providerAccountId: 'google-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.name).toBe('First User');
    expect(res.body.user.id).toBeTruthy();
  });

  it('does not rebind an existing account to a different OAuth identity', async () => {
    const email = testEmail('rebind');

    const created = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders())
      .send({
        email,
        name: 'Victim',
        provider: 'google',
        providerAccountId: 'google-victim',
      });
    expect(created.status).toBe(200);
    const victimId = created.body.user.id as string;

    const takeover = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders())
      .send({
        email,
        name: 'Attacker',
        provider: 'github',
        providerAccountId: 'github-attacker',
      });

    expect(takeover.status).toBe(409);
    expect(takeover.body.code).toBe('CONFLICT');

    const replay = await request(app)
      .post('/v1/auth/oauth')
      .set(authHeaders())
      .send({
        email,
        name: 'Victim Updated',
        provider: 'google',
        providerAccountId: 'google-victim',
      });

    expect(replay.status).toBe(200);
    expect(replay.body.user.id).toBe(victimId);
    expect(replay.body.user.name).toBe('Victim Updated');
  });
});

afterAll(async () => {
  if (isDatabaseConfigured()) return;

  const users = await readJson<Array<{ email: string }>>('users.json', []);
  const remaining = users.filter((user) => !user.email.startsWith(TEST_EMAIL_PREFIX));
  if (remaining.length !== users.length) {
    await writeJson('users.json', remaining);
  }
});

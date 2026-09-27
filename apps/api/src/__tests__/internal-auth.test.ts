import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config.js';
import {
  assertInternalApiSecret,
  INSECURE_INTERNAL_API_SECRETS,
} from '../config/env.js';

function testEmail(suffix: string): string {
  return `internal-authz-test-${suffix}-${Date.now()}@example.com`;
}

describe('assertInternalApiSecret', () => {
  it('rejects missing, short, and public placeholder secrets', () => {
    expect(() => assertInternalApiSecret(undefined)).toThrow(
      /unique secret/
    );
    expect(() => assertInternalApiSecret('')).toThrow(/unique secret/);
    expect(() => assertInternalApiSecret('short')).toThrow(/unique secret/);
    for (const placeholder of INSECURE_INTERNAL_API_SECRETS) {
      expect(() => assertInternalApiSecret(placeholder)).toThrow(/unique secret/);
    }
  });

  it('accepts a unique secret', () => {
    expect(assertInternalApiSecret('a-unique-internal-secret')).toBe(
      'a-unique-internal-secret'
    );
  });
});

describe('POST /v1/auth/oauth public-secret rejection', () => {
  const app = createApp();

  it('does not treat the former schema default as a valid internal secret', async () => {
    expect(config.internalApiSecret).not.toBe('dev-internal-secret');
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set('X-Internal-Secret', 'dev-internal-secret')
      .send({
        email: testEmail('default'),
        name: 'Attacker',
        provider: 'github',
        providerAccountId: 'attacker-default',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('does not treat the .env.example placeholder as a valid internal secret', async () => {
    expect(config.internalApiSecret).not.toBe('change-me-min-8-chars');
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set('X-Internal-Secret', 'change-me-min-8-chars')
      .send({
        email: testEmail('example'),
        name: 'Attacker',
        provider: 'github',
        providerAccountId: 'attacker-example',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects an empty X-Internal-Secret even if compared as a string', async () => {
    const res = await request(app)
      .post('/v1/auth/oauth')
      .set('X-Internal-Secret', '')
      .send({
        email: testEmail('empty'),
        name: 'Attacker',
        provider: 'github',
        providerAccountId: 'attacker-empty',
      });

    expect(res.status).toBe(401);
  });
});

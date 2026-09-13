import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config.js';

describe('POST /v1/stripe/checkout/donation return URLs', () => {
  const app = createApp();

  it('rejects an off-origin success URL before creating a Stripe session', async () => {
    const res = await request(app).post('/v1/stripe/checkout/donation').send({
      creatorUserId: 'usr_anyone',
      amountCents: 500,
      successUrl: 'https://evil.example/phish',
      cancelUrl: `${config.webUrl}/cancel`,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MintMusic origin/);
  });

  it('rejects an off-origin cancel URL', async () => {
    const res = await request(app).post('/v1/stripe/checkout/donation').send({
      creatorUserId: 'usr_anyone',
      amountCents: 500,
      successUrl: `${config.webUrl}/thanks`,
      cancelUrl: 'https://mintmusic.ai.evil.example/cancel',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MintMusic origin/);
  });
});

describe('POST /v1/stripe/checkout/release return URLs', () => {
  const app = createApp();

  it('rejects an off-origin success URL even when authenticated', async () => {
    const res = await request(app)
      .post('/v1/stripe/checkout/release')
      .set({
        'X-Internal-Secret': config.internalApiSecret,
        'X-User-Id': 'usr_collector',
      })
      .send({
        releaseId: 'rel_1',
        successUrl: 'https://evil.example/phish',
        cancelUrl: `${config.webUrl}/cancel`,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MintMusic origin/);
  });
});

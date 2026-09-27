import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import Stripe from 'stripe';
import { createApp } from '../app.js';
import { assertStripeWebhookSecret } from '../config/env.js';

function forgedSignature(payload: string, secret = ''): string {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

describe('assertStripeWebhookSecret', () => {
  it('rejects missing and empty secrets so constructEvent is never called with ""', () => {
    expect(() => assertStripeWebhookSecret(undefined)).toThrow(
      'Stripe webhook secret is not configured'
    );
    expect(() => assertStripeWebhookSecret('')).toThrow(
      'Stripe webhook secret is not configured'
    );
    expect(assertStripeWebhookSecret('whsec_live')).toBe('whsec_live');
  });
});

describe('Stripe SDK empty-secret behavior', () => {
  it('accepts an attacker HMAC when the signing secret is empty (why we refuse "")', () => {
    const stripe = new Stripe('sk_test_dummy');
    const payload = JSON.stringify({
      id: 'evt_forged',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_forged', payment_status: 'paid' } },
    });

    const event = stripe.webhooks.constructEvent(
      payload,
      forgedSignature(payload, ''),
      ''
    );
    expect(event.id).toBe('evt_forged');
  });
});

describe('POST /v1/stripe/webhook', () => {
  const app = createApp();

  it('does not accept a payload signed with an empty secret', async () => {
    const payload = JSON.stringify({
      id: 'evt_forged',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_forged',
          payment_status: 'paid',
          metadata: {
            type: 'release_purchase',
            releaseId: 'rel_forged',
            collectorUserId: 'usr_attacker',
          },
        },
      },
    });

    const res = await request(app)
      .post('/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', forgedSignature(payload, ''))
      .send(payload);

    expect(res.status).not.toBe(200);
    expect([400, 503]).toContain(res.status);
  });
});

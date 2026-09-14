import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { paidCheckoutSessionFromEvent } from '../services/stripe.js';

function checkoutEvent(
  type: Stripe.Event['type'],
  paymentStatus: Stripe.Checkout.Session['payment_status'],
): Pick<Stripe.Event, 'type' | 'data'> {
  return {
    type,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        payment_status: paymentStatus,
        metadata: {
          type: 'release_purchase',
          releaseId: 'rel_1',
          collectorUserId: 'usr_1',
        },
      } as unknown as Stripe.Checkout.Session,
    },
  };
}

describe('paidCheckoutSessionFromEvent', () => {
  it('fulfills card checkouts on checkout.session.completed when paid', () => {
    const session = paidCheckoutSessionFromEvent(
      checkoutEvent('checkout.session.completed', 'paid')
    );
    expect(session?.id).toBe('cs_test_1');
  });

  it('does not fulfill delayed methods on completed while still unpaid', () => {
    const session = paidCheckoutSessionFromEvent(
      checkoutEvent('checkout.session.completed', 'unpaid')
    );
    expect(session).toBeNull();
  });

  it('fulfills delayed methods on checkout.session.async_payment_succeeded', () => {
    const session = paidCheckoutSessionFromEvent(
      checkoutEvent('checkout.session.async_payment_succeeded', 'paid')
    );
    expect(session?.id).toBe('cs_test_1');
  });

  it('ignores async payment failures and unrelated events', () => {
    expect(
      paidCheckoutSessionFromEvent(
        checkoutEvent('checkout.session.async_payment_failed', 'unpaid')
      )
    ).toBeNull();
    expect(
      paidCheckoutSessionFromEvent({
        type: 'account.updated',
        data: { object: { id: 'acct_1' } as unknown as Stripe.Account },
      })
    ).toBeNull();
  });
});

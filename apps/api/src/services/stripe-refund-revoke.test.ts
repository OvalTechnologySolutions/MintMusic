import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { paymentIdToRevokeFromEvent } from './stripe.js';

function chargeEvent(
  type: Stripe.Event['type'],
  charge: Partial<Stripe.Charge>
): Pick<Stripe.Event, 'type' | 'data'> {
  return {
    type,
    data: {
      object: {
        id: 'ch_test_1',
        object: 'charge',
        refunded: false,
        amount: 999,
        amount_refunded: 0,
        payment_intent: 'pi_owned',
        ...charge,
      } as Stripe.Charge,
    },
  };
}

function disputeEvent(
  status: Stripe.Dispute.Status,
  paymentIntent: Stripe.Dispute['payment_intent']
): Pick<Stripe.Event, 'type' | 'data'> {
  return {
    type: 'charge.dispute.closed',
    data: {
      object: {
        id: 'dp_test_1',
        object: 'dispute',
        status,
        payment_intent: paymentIntent,
      } as Stripe.Dispute,
    },
  };
}

describe('paymentIdToRevokeFromEvent', () => {
  it('revokes on a fully refunded charge', () => {
    expect(
      paymentIdToRevokeFromEvent(
        chargeEvent('charge.refunded', { refunded: true, amount_refunded: 999 })
      )
    ).toBe('pi_owned');
  });

  it('reads payment_intent from an expanded object', () => {
    expect(
      paymentIdToRevokeFromEvent(
        chargeEvent('charge.refunded', {
          refunded: true,
          payment_intent: { id: 'pi_expanded' } as Stripe.PaymentIntent,
        })
      )
    ).toBe('pi_expanded');
  });

  it('does not revoke a partial refund', () => {
    expect(
      paymentIdToRevokeFromEvent(
        chargeEvent('charge.refunded', {
          refunded: false,
          amount_refunded: 100,
        })
      )
    ).toBeNull();
  });

  it('does not revoke when the charge has no payment_intent', () => {
    expect(
      paymentIdToRevokeFromEvent(
        chargeEvent('charge.refunded', {
          refunded: true,
          payment_intent: null,
        })
      )
    ).toBeNull();
  });

  it('revokes when a dispute is lost or the charge was refunded', () => {
    expect(paymentIdToRevokeFromEvent(disputeEvent('lost', 'pi_lost'))).toBe(
      'pi_lost'
    );
    expect(
      paymentIdToRevokeFromEvent(disputeEvent('charge_refunded', 'pi_refunded'))
    ).toBe('pi_refunded');
  });

  it('does not revoke a won or in-flight dispute', () => {
    expect(paymentIdToRevokeFromEvent(disputeEvent('won', 'pi_won'))).toBeNull();
    expect(
      paymentIdToRevokeFromEvent(disputeEvent('under_review', 'pi_open'))
    ).toBeNull();
  });

  it('ignores checkout and account events', () => {
    expect(
      paymentIdToRevokeFromEvent({
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_1' } as Stripe.Checkout.Session,
        },
      })
    ).toBeNull();
    expect(
      paymentIdToRevokeFromEvent({
        type: 'account.updated',
        data: { object: { id: 'acct_1' } as Stripe.Account },
      })
    ).toBeNull();
  });
});

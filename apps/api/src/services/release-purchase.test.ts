import { describe, expect, it, vi } from 'vitest';
import {
  fulfillPaidReleasePurchase,
  isPrismaUniqueConstraint,
  releaseCheckoutIdempotencyKey,
} from './release-purchase.js';

function uniqueError() {
  return { code: 'P2002', meta: { target: ['collector_id', 'release_id'] } };
}

describe('releaseCheckoutIdempotencyKey', () => {
  it('is stable for the collector + release pair', () => {
    expect(releaseCheckoutIdempotencyKey('usr_1', 'rel_9')).toBe(
      'release-checkout:usr_1:rel_9'
    );
  });
});

describe('isPrismaUniqueConstraint', () => {
  it('detects Prisma P2002', () => {
    expect(isPrismaUniqueConstraint(uniqueError())).toBe(true);
    expect(isPrismaUniqueConstraint(new Error('boom'))).toBe(false);
    expect(isPrismaUniqueConstraint(null)).toBe(false);
  });
});

describe('fulfillPaidReleasePurchase', () => {
  it('creates a purchase on first payment', async () => {
    const created: unknown[] = [];
    const refundPayment = vi.fn();

    const result = await fulfillPaidReleasePurchase({
      collectorUserId: 'usr_1',
      releaseId: 'rel_1',
      paymentId: 'pi_first',
      amountCents: 999,
      createPurchase: async (row) => {
        created.push(row);
      },
      findPurchase: async () => null,
      refundPayment,
    });

    expect(result).toBe('created');
    expect(created).toEqual([
      {
        collectorId: 'usr_1',
        releaseId: 'rel_1',
        stripePaymentId: 'pi_first',
        amountCents: 999,
      },
    ]);
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('treats a webhook retry of the same payment as a no-op', async () => {
    const refundPayment = vi.fn();

    const result = await fulfillPaidReleasePurchase({
      collectorUserId: 'usr_1',
      releaseId: 'rel_1',
      paymentId: 'pi_first',
      amountCents: 999,
      createPurchase: async () => {
        throw uniqueError();
      },
      findPurchase: async () => ({ stripePaymentId: 'pi_first' }),
      refundPayment,
    });

    expect(result).toBe('replayed');
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('refunds a second paid checkout for the same collector and release', async () => {
    const refundPayment = vi.fn();

    const result = await fulfillPaidReleasePurchase({
      collectorUserId: 'usr_1',
      releaseId: 'rel_1',
      paymentId: 'pi_second',
      amountCents: 999,
      createPurchase: async () => {
        throw uniqueError();
      },
      findPurchase: async () => ({ stripePaymentId: 'pi_first' }),
      refundPayment,
    });

    expect(result).toBe('refunded_duplicate');
    expect(refundPayment).toHaveBeenCalledOnce();
    expect(refundPayment).toHaveBeenCalledWith('pi_second');
  });

  it('refunds when a unique row exists but has no stored payment id yet', async () => {
    const refundPayment = vi.fn();

    const result = await fulfillPaidReleasePurchase({
      collectorUserId: 'usr_1',
      releaseId: 'rel_1',
      paymentId: 'pi_second',
      amountCents: 999,
      createPurchase: async () => {
        throw uniqueError();
      },
      findPurchase: async () => ({ stripePaymentId: null }),
      refundPayment,
    });

    expect(result).toBe('refunded_duplicate');
    expect(refundPayment).toHaveBeenCalledWith('pi_second');
  });

  it('does not swallow unrelated create failures', async () => {
    await expect(
      fulfillPaidReleasePurchase({
        collectorUserId: 'usr_1',
        releaseId: 'rel_1',
        paymentId: 'pi_first',
        amountCents: 999,
        createPurchase: async () => {
          throw new Error('db down');
        },
        findPurchase: async () => null,
        refundPayment: async () => undefined,
      })
    ).rejects.toThrow('db down');
  });
});

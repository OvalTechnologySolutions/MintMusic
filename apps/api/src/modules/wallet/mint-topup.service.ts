import { createHash, randomBytes } from 'node:crypto';
import {
  MINT_TOPUP_MIN_CENTS,
  MINT_TOPUP_SUGGESTED_CENTS,
  SONG_SAVE_UNITS,
  ARTIST_SUBSCRIPTION_PRICE_CENTS,
  ARTIST_INTRO_MONTHS,
  MINT_UNITS_PER_DOLLAR,
  centsToMintUnits,
  mintUnitsToDisplay,
  mintTopUpMaxCents,
  offlineLeaseSeconds,
  artistPriceId,
  addCalendarMonths,
  BILLING_ASSUMPTIONS,
} from '../../config/billing.js';
import { env } from '../../config/env.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';
import {
  creditMintPurchase,
  applyCompensatingEntry,
  ensureWallet,
  getWalletBalance,
} from './wallet.service.js';

export function getBillingConfigPublic() {
  return {
    artistPriceCents: ARTIST_SUBSCRIPTION_PRICE_CENTS,
    artistIntroMonths: ARTIST_INTRO_MONTHS,
    mintUnitsPerDollar: MINT_UNITS_PER_DOLLAR,
    songSaveUnits: SONG_SAVE_UNITS,
    mintTopUpMinCents: MINT_TOPUP_MIN_CENTS,
    mintTopUpSuggestedCents: [...MINT_TOPUP_SUGGESTED_CENTS],
    mintTopUpMaxCents: mintTopUpMaxCents(),
    offlineLeaseSeconds: offlineLeaseSeconds(),
    assumptions: BILLING_ASSUMPTIONS,
  };
}

export function validateTopUpAmountCents(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new AppError('Amount must be an integer number of cents', 400, 'INVALID_AMOUNT');
  }
  if (amountCents < MINT_TOPUP_MIN_CENTS) {
    throw new AppError(
      `Minimum Mint purchase is $${(MINT_TOPUP_MIN_CENTS / 100).toFixed(2)}`,
      400,
      'BELOW_MINIMUM'
    );
  }
  const max = mintTopUpMaxCents();
  if (amountCents > max) {
    throw new AppError(
      `Maximum Mint purchase is $${(max / 100).toFixed(2)}`,
      400,
      'ABOVE_MAXIMUM'
    );
  }
}

export async function createMintTopUpOrder(userId: string, amountCents: number) {
  validateTopUpAmountCents(amountCents);
  await ensureWallet(userId);
  const mintUnits = centsToMintUnits(amountCents);
  const db = await getPrisma();
  return db.mintTopUpOrder.create({
    data: {
      userId,
      amountCents,
      mintUnits,
      currency: 'usd',
      status: 'pending',
    },
  });
}

export async function markTopUpSession(
  orderId: string,
  sessionId: string
): Promise<void> {
  const db = await getPrisma();
  await db.mintTopUpOrder.update({
    where: { id: orderId },
    data: { stripeCheckoutSessionId: sessionId },
  });
}

export async function creditTopUpFromCheckout(params: {
  orderId: string;
  userId: string;
  amountTotal: number;
  currency: string;
  paymentIntentId?: string;
  chargeId?: string;
  sessionId: string;
}) {
  const db = await getPrisma();
  const order = await db.mintTopUpOrder.findUnique({ where: { id: params.orderId } });
  if (!order) throw new NotFoundError('Top-up order not found');
  if (order.userId !== params.userId) {
    throw new ForbiddenError('Top-up order does not belong to this user');
  }
  if (order.status === 'succeeded' && order.creditedLedgerEntryId) {
    return { alreadyCredited: true, order };
  }

  if (params.currency.toLowerCase() !== 'usd') {
    throw new AppError('Unexpected currency', 400);
  }
  if (params.amountTotal !== order.amountCents) {
    throw new AppError('Payment amount mismatch', 400);
  }

  const idempotencyKey = `mint_topup:${order.id}`;
  const credit = await creditMintPurchase({
    userId: order.userId,
    amountUnits: order.mintUnits,
    idempotencyKey,
    mintTopUpOrderId: order.id,
    stripePaymentIntentId: params.paymentIntentId,
    stripeChargeId: params.chargeId,
    auditMetadata: {
      sessionId: params.sessionId,
      amountCents: order.amountCents,
    },
  });

  const updated = await db.mintTopUpOrder.update({
    where: { id: order.id },
    data: {
      status: 'succeeded',
      stripePaymentIntentId: params.paymentIntentId,
      stripeChargeId: params.chargeId,
      creditedLedgerEntryId: credit.entry.id,
    },
  });

  return { alreadyCredited: !credit.created, order: updated, entry: credit.entry };
}

export async function updateTopUpStatus(
  orderId: string,
  status: 'failed' | 'canceled' | 'expired'
) {
  const db = await getPrisma();
  const order = await db.mintTopUpOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status === 'succeeded') return order;
  return db.mintTopUpOrder.update({
    where: { id: orderId },
    data: { status },
  });
}

/** How many Mint units remain reversible for a prior purchase credit. */
export async function remainingReversibleUnits(originalEntryId: string): Promise<{
  original: { id: string; amountUnits: number; userId: string; stripeChargeId: string | null; stripePaymentIntentId: string | null };
  remaining: number;
}> {
  const db = await getPrisma();
  const original = await db.walletLedgerEntry.findUnique({ where: { id: originalEntryId } });
  if (!original || original.type !== 'purchase') {
    throw new NotFoundError('Original purchase entry not found');
  }
  const comps = await db.walletLedgerEntry.findMany({
    where: {
      originalEntryId,
      type: { in: ['refund', 'reversal'] },
      status: 'posted',
    },
  });
  const reversed = comps.reduce((s, c) => s + Math.abs(c.amountUnits), 0);
  return {
    original,
    remaining: Math.max(0, original.amountUnits - reversed),
  };
}

export async function reverseTopUpByCharge(params: {
  chargeId?: string;
  paymentIntentId?: string;
  amountCents: number;
  reason: string;
  idempotencyKey: string;
  type: 'refund' | 'reversal';
}) {
  const db = await getPrisma();
  const order = await db.mintTopUpOrder.findFirst({
    where: {
      OR: [
        params.chargeId ? { stripeChargeId: params.chargeId } : undefined,
        params.paymentIntentId
          ? { stripePaymentIntentId: params.paymentIntentId }
          : undefined,
      ].filter(Boolean) as Array<{ stripeChargeId: string } | { stripePaymentIntentId: string }>,
      status: 'succeeded',
    },
  });
  if (!order?.creditedLedgerEntryId) {
    return { skipped: true as const, reason: 'no_order' };
  }

  const { original, remaining } = await remainingReversibleUnits(order.creditedLedgerEntryId);
  const refundUnits = Math.min(remaining, centsToMintUnits(params.amountCents));
  if (refundUnits <= 0) {
    return { skipped: true as const, reason: 'already_fully_reversed' };
  }

  const result = await applyCompensatingEntry({
    userId: original.userId,
    amountUnits: -refundUnits,
    type: params.type,
    idempotencyKey: params.idempotencyKey,
    originalEntryId: original.id,
    stripePaymentIntentId: params.paymentIntentId ?? order.stripePaymentIntentId ?? undefined,
    stripeChargeId: params.chargeId ?? order.stripeChargeId ?? undefined,
    reason: params.reason,
  });

  return { skipped: false as const, result, refundUnits };
}

export function describeTopUpPreview(amountCents: number) {
  validateTopUpAmountCents(amountCents);
  const mintUnits = centsToMintUnits(amountCents);
  return {
    amountCents,
    mintUnits,
    mintDisplay: mintUnitsToDisplay(mintUnits),
    savesEstimate: Math.floor(mintUnits / SONG_SAVE_UNITS),
  };
}

export { artistPriceId, addCalendarMonths, env };

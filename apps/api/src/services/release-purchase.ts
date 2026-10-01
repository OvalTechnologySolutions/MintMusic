export function isPrismaUniqueConstraint(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}

export function releaseCheckoutIdempotencyKey(
  collectorUserId: string,
  releaseId: string
): string {
  return `release-checkout:${collectorUserId}:${releaseId}`;
}

export type PurchasePaymentRow = { stripePaymentId: string | null };

/**
 * Persist a paid release purchase. Concurrent checkouts can both succeed at
 * Stripe; the unique (collector, release) row must keep one payment and refund
 * the other. Retries of the same payment are no-ops.
 */
export async function fulfillPaidReleasePurchase(input: {
  collectorUserId: string;
  releaseId: string;
  paymentId: string;
  amountCents: number;
  createPurchase: (row: {
    collectorId: string;
    releaseId: string;
    stripePaymentId: string;
    amountCents: number;
  }) => Promise<unknown>;
  findPurchase: () => Promise<PurchasePaymentRow | null>;
  refundPayment: (paymentId: string) => Promise<void>;
}): Promise<'created' | 'replayed' | 'refunded_duplicate'> {
  try {
    await input.createPurchase({
      collectorId: input.collectorUserId,
      releaseId: input.releaseId,
      stripePaymentId: input.paymentId,
      amountCents: input.amountCents,
    });
    return 'created';
  } catch (err) {
    if (!isPrismaUniqueConstraint(err)) throw err;

    const existing = await input.findPurchase();
    if (existing?.stripePaymentId === input.paymentId) {
      return 'replayed';
    }

    await input.refundPayment(input.paymentId);
    return 'refunded_duplicate';
  }
}

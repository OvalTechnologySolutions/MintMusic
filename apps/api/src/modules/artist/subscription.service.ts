import type Stripe from 'stripe';
import {
  ARTIST_SUBSCRIPTION_PRICE_CENTS,
  ARTIST_INTRO_MONTHS,
  addCalendarMonths,
  artistPriceId,
} from '../../config/billing.js';
import { config } from '../../config.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';
import { findUserById } from '../../store/users.js';

type ArtistSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused';

function mapStripeStatus(status: Stripe.Subscription.Status): ArtistSubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'paused';
    default:
      return 'incomplete';
  }
}

function accessActive(status: ArtistSubscriptionStatus, trialEnd?: Date | null): boolean {
  if (status === 'trialing') {
    if (trialEnd && trialEnd.getTime() < Date.now()) return false;
    return true;
  }
  return status === 'active';
}

export async function getArtistSubscriptionStatus(userId: string) {
  const db = await getPrisma();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const sub = await db.artistSubscription.findUnique({
    where: { userId },
    include: { redemption: true },
  });

  const introOfferRedeemed = Boolean(user.artistIntroOfferRedeemedAt) || Boolean(sub?.redemption);
  const introOfferEligible = user.artistIntroOfferEligible && !introOfferRedeemed;

  if (!sub) {
    return {
      hasSubscription: false,
      cancelAtPeriodEnd: false,
      renewalAuthorized: false,
      introOfferEligible,
      introOfferRedeemed,
      priceCents: ARTIST_SUBSCRIPTION_PRICE_CENTS,
      accessActive: false,
      needsPaymentMethod: false,
      message: introOfferEligible
        ? 'Activate your first 12 calendar months free.'
        : 'Subscribe at $9.99/month to use paid artist features.',
    };
  }

  const active = accessActive(sub.status, sub.trialEnd);
  const needsPaymentMethod =
    sub.status === 'trialing' &&
    !sub.renewalAuthorized &&
    Boolean(sub.trialEnd) &&
    (sub.trialEnd!.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

  let message: string | undefined;
  if (sub.status === 'trialing' && sub.trialEnd) {
    message = sub.cancelAtPeriodEnd
      ? `Access continues through ${sub.trialEnd.toISOString().slice(0, 10)}. Renewal is canceled.`
      : `Free period ends ${sub.trialEnd.toISOString().slice(0, 10)}. Then $${(ARTIST_SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/month if you authorize renewal.`;
  } else if (!active) {
    message =
      'Paid artist features are paused. Add a payment method and authorize renewal at $9.99/month.';
  }

  return {
    hasSubscription: true,
    status: sub.status,
    trialEnd: sub.trialEnd?.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    renewalAuthorized: sub.renewalAuthorized,
    introOfferEligible: false,
    introOfferRedeemed: true,
    introEndsAt: sub.redemption?.endsAt.toISOString() ?? sub.trialEnd?.toISOString(),
    priceCents: ARTIST_SUBSCRIPTION_PRICE_CENTS,
    accessActive: active,
    needsPaymentMethod,
    message,
  };
}

export async function userHasArtistFeatureAccess(userId: string): Promise<boolean> {
  const status = await getArtistSubscriptionStatus(userId);
  return status.accessActive;
}

export async function activateIntroOffer(
  userId: string,
  stripe: Stripe
): Promise<Awaited<ReturnType<typeof getArtistSubscriptionStatus>>> {
  const db = await getPrisma();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  if (user.creatorStatus !== 'approved' && user.role !== 'creator') {
    throw new ForbiddenError('Approved artist account required for the intro offer');
  }

  const existingRedemption = await db.artistIntroOfferRedemption.findUnique({
    where: { userId },
  });
  if (existingRedemption || user.artistIntroOfferRedeemedAt) {
    throw new ConflictError('Introductory free year has already been redeemed for this account');
  }
  if (!user.artistIntroOfferEligible) {
    throw new ForbiddenError('Not eligible for the introductory offer');
  }

  const priceId = artistPriceId();
  if (!priceId) {
    throw new AppError(
      'STRIPE_ARTIST_PRICE_ID is not configured',
      503,
      'STRIPE_PRICE_MISSING'
    );
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { mintmusicUserId: userId },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const startedAt = new Date();
  const endsAt = addCalendarMonths(startedAt, ARTIST_INTRO_MONTHS);
  const trialEndUnix = Math.floor(endsAt.getTime() / 1000);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_end: trialEndUnix,
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    // Prevent automatic charge without explicit renewal authorization.
    trial_settings: {
      end_behavior: { missing_payment_method: 'cancel' },
    },
    metadata: {
      mintmusicUserId: userId,
      purpose: 'artist_subscription',
      introOffer: 'true',
    },
  } as Stripe.SubscriptionCreateParams);

  try {
    await db.$transaction(async (tx) => {
      // Re-check uniqueness inside transaction
      const again = await tx.artistIntroOfferRedemption.findUnique({
        where: { userId },
      });
      if (again) {
        throw new ConflictError('Introductory free year has already been redeemed');
      }

      const row = await tx.artistSubscription.create({
        data: {
          userId,
          stripeCustomerId: customerId!,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          status: mapStripeStatus(subscription.status),
          trialStart: startedAt,
          trialEnd: endsAt,
          currentPeriodEnd: endsAt,
          cancelAtPeriodEnd: false,
          renewalAuthorized: false,
        },
      });

      await tx.artistIntroOfferRedemption.create({
        data: {
          userId,
          subscriptionId: row.id,
          startedAt,
          endsAt,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          artistIntroOfferEligible: false,
          artistIntroOfferRedeemedAt: startedAt,
        },
      });
    });
  } catch (err) {
    // Best-effort cancel orphaned Stripe sub if DB unique constraint hit
    try {
      await stripe.subscriptions.cancel(subscription.id);
    } catch {
      /* ignore */
    }
    throw err;
  }

  return getArtistSubscriptionStatus(userId);
}

export async function authorizeRenewal(userId: string, stripe: Stripe) {
  const db = await getPrisma();
  const sub = await db.artistSubscription.findUnique({ where: { userId } });
  if (!sub) throw new NotFoundError('No artist subscription');

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

  // Require a default payment method on the customer
  const customer = await stripe.customers.retrieve(sub.stripeCustomerId);
  if (customer.deleted) throw new AppError('Stripe customer deleted', 400);
  const defaultPm =
    typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id;
  if (!defaultPm && !stripeSub.default_payment_method) {
    throw new AppError(
      'Add a payment method before authorizing renewal',
      400,
      'PAYMENT_METHOD_REQUIRED'
    );
  }

  await db.artistSubscription.update({
    where: { userId },
    data: { renewalAuthorized: true, cancelAtPeriodEnd: false },
  });

  if (stripeSub.cancel_at_period_end) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Allow renewal to proceed with payment method present
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    trial_settings: {
      end_behavior: { missing_payment_method: 'create_invoice' },
    },
    metadata: {
      ...stripeSub.metadata,
      renewalAuthorized: 'true',
    },
  });

  return getArtistSubscriptionStatus(userId);
}

export async function cancelArtistSubscription(userId: string, stripe: Stripe) {
  const db = await getPrisma();
  const sub = await db.artistSubscription.findUnique({ where: { userId } });
  if (!sub) throw new NotFoundError('No artist subscription');

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.artistSubscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: true,
      renewalAuthorized: false,
      canceledAt: new Date(),
    },
  });

  return getArtistSubscriptionStatus(userId);
}

export async function createBillingPortalSession(
  userId: string,
  stripe: Stripe,
  returnUrl: string
) {
  const db = await getPrisma();
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError('User not found');

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const sub = await db.artistSubscription.findUnique({ where: { userId } });
    customerId = sub?.stripeCustomerId;
  }
  if (!customerId) {
    throw new AppError('No Stripe customer for this account', 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${config.webUrl}/`,
  });
  return { url: session.url };
}

export async function syncArtistSubscriptionFromStripe(
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.mintmusicUserId;
  if (!userId) return;

  const db = await getPrisma();
  const existing = await db.artistSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!existing && !userId) return;

  const status = mapStripeStatus(subscription.status);
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  const renewalAuthorized =
    subscription.metadata?.renewalAuthorized === 'true' ||
    existing?.renewalAuthorized === true;

  // If trial ended without renewal auth and status canceled → keep paused messaging
  if (existing) {
    await db.artistSubscription.update({
      where: { id: existing.id },
      data: {
        status,
        trialEnd: trialEnd ?? existing.trialEnd,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        renewalAuthorized,
        canceledAt:
          status === 'canceled' ? existing.canceledAt ?? new Date() : existing.canceledAt,
      },
    });
  }
}

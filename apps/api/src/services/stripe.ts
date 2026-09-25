import Stripe from 'stripe';
import { config, isStripeConfigured } from '../config.js';
import { isDatabaseConfigured } from '../config/env.js';
import { centsToMintUnits, mintUnitsToDisplay, SONG_SAVE_UNITS } from '../config/billing.js';
import { findUserById, setStripeConnect } from '../store/users.js';
import {
  createMintTopUpOrder,
  creditTopUpFromCheckout,
  describeTopUpPreview,
  markTopUpSession,
  reverseTopUpByCharge,
  updateTopUpStatus,
} from '../modules/wallet/mint-topup.service.js';
import { syncArtistSubscriptionFromStripe } from '../modules/artist/subscription.service.js';
import { migrateLegacyPurchasesToEntitlements } from '../modules/library/library.service.js';
import { getPrisma } from '../lib/prisma.js';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  if (!stripe) {
    stripe = new Stripe(config.stripeSecretKey);
  }
  return stripe;
}

export async function ensureConnectAccount(userId: string): Promise<string> {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');
  if (user.creatorStatus !== 'approved') {
    throw new Error('Creator account not approved');
  }

  if (user.stripeConnectAccountId) {
    return user.stripeConnectAccountId;
  }

  const client = getStripe();
  const account = await client.accounts.create({
    type: 'express',
    email: user.email,
    metadata: { mintmusicUserId: userId },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
  });

  await setStripeConnect(userId, account.id, false, false);
  return account.id;
}

export async function createConnectOnboardingLink(
  userId: string
): Promise<string> {
  const accountId = await ensureConnectAccount(userId);
  const client = getStripe();
  const link = await client.accountLinks.create({
    account: accountId,
    refresh_url: `${config.webUrl}${config.stripeConnectReturnPath}&refresh=1`,
    return_url: `${config.webUrl}${config.stripeConnectReturnPath}&connected=1`,
    type: 'account_onboarding',
  });
  return link.url;
}

export async function refreshConnectStatus(userId: string) {
  const user = await findUserById(userId);
  if (!user?.stripeConnectAccountId) {
    return {
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
    };
  }

  const client = getStripe();
  const account = await client.accounts.retrieve(user.stripeConnectAccountId);
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;

  await setStripeConnect(
    userId,
    user.stripeConnectAccountId,
    chargesEnabled,
    payoutsEnabled
  );

  return {
    connected: true,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete: chargesEnabled && payoutsEnabled,
  };
}

export async function createDonationCheckout(
  creatorUserId: string,
  amountCents: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  if (amountCents < 100) throw new Error('Minimum donation is $1.00');

  const creator = await findUserById(creatorUserId);
  if (!creator?.stripeConnectAccountId) {
    throw new Error('Creator has not connected Stripe for payouts');
  }

  const status = await refreshConnectStatus(creatorUserId);
  if (!status.chargesEnabled) {
    throw new Error('Creator cannot accept payments yet');
  }

  const client = getStripe();
  const session = await client.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `Support ${creator.name}`,
            description: 'Donation to artist on MintMusic',
          },
        },
      },
    ],
    payment_intent_data: {
      transfer_data: {
        destination: creator.stripeConnectAccountId,
      },
    },
    metadata: {
      type: 'donation',
      creatorUserId,
    },
  });

  if (!session.url) throw new Error('Failed to create checkout session');
  return { url: session.url, sessionId: session.id };
}

export async function createReleaseCheckout(
  collectorUserId: string,
  releaseId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const db = await getPrisma();

  const release = await db.release.findFirst({
    where: { id: releaseId, published: true },
    include: { creator: true },
  });
  if (!release) throw new Error('Release not found');

  if (release.creatorId === collectorUserId) {
    throw new Error('Creators cannot purchase their own releases');
  }

  const existing = await db.purchase.findUnique({
    where: {
      collectorId_releaseId: {
        collectorId: collectorUserId,
        releaseId,
      },
    },
  });
  if (existing) throw new Error('You already own this release');

  const creator = await findUserById(release.creatorId);
  if (!creator?.stripeConnectAccountId) {
    throw new Error('Creator has not connected Stripe for payouts');
  }

  const status = await refreshConnectStatus(release.creatorId);
  if (!status.chargesEnabled) {
    throw new Error('Creator cannot accept payments yet');
  }

  if (release.priceCents < 50) {
    throw new Error('Release price is too low for checkout');
  }

  const client = getStripe();
  const session = await client.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: release.currency,
          unit_amount: release.priceCents,
          product_data: {
            name: release.title,
            description: `${release.type} by ${release.creator.name}`,
            ...(release.coverUrl ? { images: [release.coverUrl] } : {}),
          },
        },
      },
    ],
    payment_intent_data: {
      transfer_data: {
        destination: creator.stripeConnectAccountId,
      },
      metadata: {
        type: 'release_purchase',
        releaseId,
        collectorUserId,
        creatorUserId: release.creatorId,
      },
    },
    metadata: {
      type: 'release_purchase',
      releaseId,
      collectorUserId,
      creatorUserId: release.creatorId,
    },
  });

  if (!session.url) throw new Error('Failed to create checkout session');
  return { url: session.url, sessionId: session.id };
}

export async function createMintCheckout(
  userId: string,
  amountCents: number,
  successUrl: string,
  cancelUrl: string
) {
  const preview = describeTopUpPreview(amountCents);
  const order = await createMintTopUpOrder(userId, amountCents);
  const client = getStripe();

  const session = await client.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${preview.mintDisplay} Mint`,
            description: `MintMusic credit — enough for about ${preview.savesEstimate} song saves. Tax may apply separately.`,
          },
        },
      },
    ],
    metadata: {
      type: 'mint_topup',
      purpose: 'mint_topup',
      userId,
      orderId: order.id,
      mintUnits: String(preview.mintUnits),
    },
    payment_intent_data: {
      metadata: {
        type: 'mint_topup',
        purpose: 'mint_topup',
        userId,
        orderId: order.id,
        mintUnits: String(preview.mintUnits),
      },
    },
  });

  if (!session.url) throw new Error('Failed to create checkout session');
  await markTopUpSession(order.id, session.id);

  return {
    url: session.url,
    sessionId: session.id,
    orderId: order.id,
    amountCents,
    mintUnits: preview.mintUnits,
    mintDisplay: preview.mintDisplay,
    savesEstimate: preview.savesEstimate,
  };
}

async function recordReleasePurchase(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.type !== 'release_purchase') return;
  const releaseId = session.metadata.releaseId;
  const collectorUserId = session.metadata.collectorUserId;
  if (!releaseId || !collectorUserId) return;

  if (!isDatabaseConfigured()) return;

  const db = await getPrisma();

  const release = await db.release.findUnique({
    where: { id: releaseId },
    include: { tracks: true },
  });
  if (!release) return;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  await db.purchase.upsert({
    where: {
      collectorId_releaseId: {
        collectorId: collectorUserId,
        releaseId,
      },
    },
    create: {
      collectorId: collectorUserId,
      releaseId,
      stripePaymentId: paymentIntentId ?? session.id,
      amountCents: session.amount_total ?? release.priceCents,
    },
    update: {
      stripePaymentId: paymentIntentId ?? session.id,
    },
  });

  // Grant track entitlements without Mint charge
  for (const track of release.tracks) {
    await db.songEntitlement.upsert({
      where: {
        userId_trackId: { userId: collectorUserId, trackId: track.id },
      },
      create: {
        userId: collectorUserId,
        trackId: track.id,
        source: 'legacy_purchase',
      },
      update: {},
    });
    await db.libraryItem.upsert({
      where: {
        userId_trackId: { userId: collectorUserId, trackId: track.id },
      },
      create: {
        userId: collectorUserId,
        trackId: track.id,
        visible: true,
      },
      update: { visible: true },
    });
  }
}

async function recordMintTopUp(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.type !== 'mint_topup' && session.metadata?.purpose !== 'mint_topup') {
    return;
  }
  const orderId = session.metadata.orderId;
  const userId = session.metadata.userId;
  if (!orderId || !userId) return;
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  let chargeId: string | undefined;
  if (paymentIntentId && isStripeConfigured()) {
    try {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);
      const latest = pi.latest_charge;
      chargeId = typeof latest === 'string' ? latest : latest?.id;
    } catch {
      /* optional */
    }
  }

  await creditTopUpFromCheckout({
    orderId,
    userId,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    paymentIntentId,
    chargeId,
    sessionId: session.id,
  });
}

async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  if (!isDatabaseConfigured()) return true;
  const db = await getPrisma();
  try {
    await db.processedStripeEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
      },
    });
    return true;
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return false;
    }
    throw err;
  }
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const client = getStripe();
  const event = client.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripeWebhookSecret
  );

  const claimed = await claimStripeEvent(event);
  if (!claimed) return;

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const userId = account.metadata?.mintmusicUserId;
    if (userId) {
      await setStripeConnect(
        userId,
        account.id,
        account.charges_enabled ?? false,
        account.payouts_enabled ?? false
      );
    }
    return;
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded') {
      await recordReleasePurchase(session);
      await recordMintTopUp(session);
    }
    return;
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.orderId) {
      await updateTopUpStatus(session.metadata.orderId, 'failed');
    }
    return;
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.orderId) {
      await updateTopUpStatus(session.metadata.orderId, 'expired');
    }
    return;
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncArtistSubscriptionFromStripe(event.data.object as Stripe.Subscription);
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (subId) {
      const sub = await client.subscriptions.retrieve(subId);
      await syncArtistSubscriptionFromStripe(sub);
    }
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const refunded = charge.amount_refunded ?? 0;
    await reverseTopUpByCharge({
      chargeId: charge.id,
      paymentIntentId:
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id,
      amountCents: refunded,
      reason: 'stripe_charge_refunded',
      idempotencyKey: `refund:${charge.id}:${refunded}`,
      type: 'refund',
    });
    return;
  }

  if (
    event.type === 'charge.dispute.created' ||
    event.type === 'charge.dispute.funds_withdrawn'
  ) {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    await reverseTopUpByCharge({
      chargeId,
      amountCents: dispute.amount,
      reason: `stripe_dispute:${event.type}`,
      idempotencyKey: `dispute:${dispute.id}:${event.type}`,
      type: 'reversal',
    });
  }
}

export { centsToMintUnits, mintUnitsToDisplay, SONG_SAVE_UNITS, migrateLegacyPurchasesToEntitlements };

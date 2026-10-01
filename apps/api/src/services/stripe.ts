import Stripe from 'stripe';
import { config, isStripeConfigured } from '../config.js';
import { isDatabaseConfigured } from '../config/env.js';
import { findUserById, setStripeConnect } from '../store/users.js';
import {
  fulfillPaidReleasePurchase,
  releaseCheckoutIdempotencyKey,
} from './release-purchase.js';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
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

  const { getPrisma } = await import('../lib/prisma.js');
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
  const session = await client.checkout.sessions.create(
    {
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
    },
    { idempotencyKey: releaseCheckoutIdempotencyKey(collectorUserId, releaseId) }
  );

  if (!session.url) throw new Error('Failed to create checkout session');
  return { url: session.url, sessionId: session.id };
}

async function recordReleasePurchase(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.type !== 'release_purchase') return;
  const releaseId = session.metadata.releaseId;
  const collectorUserId = session.metadata.collectorUserId;
  if (!releaseId || !collectorUserId) return;

  if (!isDatabaseConfigured()) return;

  const { getPrisma } = await import('../lib/prisma.js');
  const db = await getPrisma();

  const release = await db.release.findUnique({ where: { id: releaseId } });
  if (!release) return;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  const paymentId = paymentIntentId ?? session.id;

  await fulfillPaidReleasePurchase({
    collectorUserId,
    releaseId,
    paymentId,
    amountCents: session.amount_total ?? release.priceCents,
    createPurchase: (data) => db.purchase.create({ data }),
    findPurchase: () =>
      db.purchase.findUnique({
        where: {
          collectorId_releaseId: {
            collectorId: collectorUserId,
            releaseId,
          },
        },
      }),
    refundPayment: refundDuplicateReleasePayment,
  });
}

async function refundDuplicateReleasePayment(paymentId: string): Promise<void> {
  const client = getStripe();
  const paymentIntentId = paymentId.startsWith('pi_')
    ? paymentId
    : await paymentIntentIdFromCheckoutSession(client, paymentId);

  if (!paymentIntentId) {
    console.error(
      '[stripe] duplicate release payment has no payment_intent to refund',
      paymentId
    );
    return;
  }

  try {
    await client.refunds.create(
      {
        payment_intent: paymentIntentId,
        reverse_transfer: true,
      },
      { idempotencyKey: `refund-dup-release:${paymentIntentId}` }
    );
  } catch (err) {
    if (isAlreadyRefunded(err)) return;
    throw err;
  }
}

async function paymentIntentIdFromCheckoutSession(
  client: Stripe,
  sessionId: string
): Promise<string | undefined> {
  if (!sessionId.startsWith('cs_')) return undefined;
  const session = await client.checkout.sessions.retrieve(sessionId);
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;
}

function isAlreadyRefunded(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = 'code' in err ? (err as { code?: unknown }).code : undefined;
  return code === 'charge_already_refunded';
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      await recordReleasePurchase(session);
    }
  }
}

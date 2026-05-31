import Stripe from 'stripe';
import { config, isStripeConfigured } from '../config.js';
import { findUserById, setStripeConnect } from '../store/users.js';

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
  }
}

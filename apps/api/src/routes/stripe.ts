import { Router } from 'express';
import type {
  CreateDonationCheckoutRequest,
  CreateCheckoutResponse,
  CreateReleaseCheckoutRequest,
} from '@mintmusic/shared';
import type { AuthedRequest } from '../middleware/internal-auth.js';
import { requireInternalUser } from '../middleware/internal-auth.js';
import { isStripeConfigured } from '../config.js';
import {
  createConnectOnboardingLink,
  createDonationCheckout,
  createReleaseCheckout,
  refreshConnectStatus,
} from '../services/stripe.js';
import { findUserById } from '../store/users.js';

export const stripeRouter = Router();

stripeRouter.post(
  '/connect/onboard',
  requireInternalUser,
  async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe not configured' });
      return;
    }
    try {
      const url = await createConnectOnboardingLink(req.userId!);
      res.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed';
      res.status(400).json({ error: message });
    }
  }
);

stripeRouter.get(
  '/connect/status',
  requireInternalUser,
  async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      res.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      });
      return;
    }
    try {
      const status = await refreshConnectStatus(req.userId!);
      res.json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status check failed';
      res.status(400).json({ error: message });
    }
  }
);

/** Donation checkout — collector session forwarded via BFF */
stripeRouter.post('/checkout/donation', async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: 'Stripe not configured' });
    return;
  }

  const body = req.body as CreateDonationCheckoutRequest;
  if (!body?.creatorUserId || !body?.amountCents || body.amountCents < 100) {
    res.status(400).json({ error: 'Invalid donation amount' });
    return;
  }

  const creator = await findUserById(body.creatorUserId);
  if (!creator || creator.creatorStatus !== 'approved') {
    res.status(404).json({ error: 'Creator not found' });
    return;
  }

  try {
    const result = await createDonationCheckout(
      body.creatorUserId,
      body.amountCents,
      body.successUrl,
      body.cancelUrl
    );
    const response: CreateCheckoutResponse = result;
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    res.status(400).json({ error: message });
  }
});

/** Release purchase checkout — collector buys a published release */
stripeRouter.post(
  '/checkout/release',
  requireInternalUser,
  async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe not configured' });
      return;
    }

    const body = req.body as CreateReleaseCheckoutRequest;
    if (!body?.releaseId || !body?.successUrl || !body?.cancelUrl) {
      res.status(400).json({ error: 'releaseId, successUrl, and cancelUrl are required' });
      return;
    }

    try {
      const result = await createReleaseCheckout(
        req.userId!,
        body.releaseId,
        body.successUrl,
        body.cancelUrl
      );
      const response: CreateCheckoutResponse = result;
      res.json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      const status = message.includes('already own') ? 409 : 400;
      res.status(status).json({ error: message });
    }
  }
);

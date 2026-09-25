import { Router } from 'express';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { isStripeConfigured } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { getStripe } from '../../services/stripe.js';
import {
  activateIntroOffer,
  authorizeRenewal,
  cancelArtistSubscription,
  createBillingPortalSession,
  getArtistSubscriptionStatus,
} from './subscription.service.js';

export const artistSubscriptionRouter = Router();

artistSubscriptionRouter.use(requireInternalUser, ensureDatabase);

artistSubscriptionRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const status = await getArtistSubscriptionStatus(req.userId!);
    res.json(status);
  })
);

artistSubscriptionRouter.post(
  '/activate-intro',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
    }
    const subscription = await activateIntroOffer(req.userId!, getStripe());
    res.json({ subscription });
  })
);

artistSubscriptionRouter.post(
  '/authorize-renewal',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
    }
    const subscription = await authorizeRenewal(req.userId!, getStripe());
    res.json({ subscription });
  })
);

artistSubscriptionRouter.post(
  '/cancel',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
    }
    const subscription = await cancelArtistSubscription(req.userId!, getStripe());
    res.json({ subscription });
  })
);

artistSubscriptionRouter.post(
  '/portal',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
    }
    const returnUrl = String(req.body?.returnUrl ?? '');
    const result = await createBillingPortalSession(
      req.userId!,
      getStripe(),
      returnUrl
    );
    res.json(result);
  })
);

import { Router } from 'express';
import type { CreateMintCheckoutRequest } from '@mintmusic/shared';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { isStripeConfigured } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import {
  getWalletBalance,
  listWalletTransactions,
  reconcileWallet,
} from './wallet.service.js';
import { getBillingConfigPublic, describeTopUpPreview } from './mint-topup.service.js';
import { createMintCheckout } from '../../services/stripe.js';

export const walletRouter = Router();
export const mintRouter = Router();

walletRouter.use(requireInternalUser, ensureDatabase);
mintRouter.use(requireInternalUser, ensureDatabase);

walletRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const balance = await getWalletBalance(req.userId!);
    res.json(balance);
  })
);

walletRouter.get(
  '/transactions',
  asyncHandler(async (req: AuthedRequest, res) => {
    const items = await listWalletTransactions(req.userId!);
    res.json({ items });
  })
);

walletRouter.get(
  '/reconcile',
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await reconcileWallet(req.userId!);
    res.json(result);
  })
);

mintRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    res.json(getBillingConfigPublic());
  })
);

mintRouter.post(
  '/preview',
  asyncHandler(async (req: AuthedRequest, res) => {
    const amountCents = Number(req.body?.amountCents);
    res.json(describeTopUpPreview(amountCents));
  })
);

mintRouter.post(
  '/checkout',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isStripeConfigured()) {
      throw new AppError('Stripe is not configured', 503, 'STRIPE_UNAVAILABLE');
    }
    const body = req.body as CreateMintCheckoutRequest;
    const result = await createMintCheckout(
      req.userId!,
      Number(body.amountCents),
      body.successUrl,
      body.cancelUrl
    );
    res.json(result);
  })
);

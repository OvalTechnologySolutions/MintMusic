import { Router } from 'express';
import express from 'express';
import { isStripeConfigured } from '../config.js';
import { handleStripeWebhook } from '../services/stripe.js';

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!isStripeConfigured()) {
      res.status(503).send('Stripe not configured');
      return;
    }

    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      res.status(400).send('Missing stripe-signature');
      return;
    }

    try {
      await handleStripeWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook error';
      res.status(400).send(message);
    }
  }
);

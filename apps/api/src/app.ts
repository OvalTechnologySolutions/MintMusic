import cors from 'cors';
import express from 'express';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { v1Router } from './routes/v1/index.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Internal-Secret', 'X-User-Id'],
    })
  );

  app.use('/v1/stripe/webhook', stripeWebhookRouter);
  app.use(express.json({ limit: '2mb' }));

  app.use('/v1', v1Router);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}

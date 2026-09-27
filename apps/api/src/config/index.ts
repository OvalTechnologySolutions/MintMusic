import {
  env as loadedEnv,
  isStripeConfigured as checkStripe,
  isStripeWebhookConfigured as checkStripeWebhook,
} from './env.js';

/** @deprecated Prefer importing from config/env.js */
export const config = {
  port: loadedEnv.PORT,
  corsOrigin: loadedEnv.CORS_ORIGIN,
  apiVersion: loadedEnv.API_VERSION,
  internalApiSecret: loadedEnv.INTERNAL_API_SECRET,
  webUrl: loadedEnv.WEB_URL,
  stripeSecretKey: loadedEnv.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: loadedEnv.STRIPE_WEBHOOK_SECRET ?? '',
  stripeConnectReturnPath: loadedEnv.STRIPE_CONNECT_RETURN_PATH,
} as const;

export function isStripeConfigured(): boolean {
  return checkStripe();
}

export function isStripeWebhookConfigured(): boolean {
  return checkStripeWebhook();
}

export { loadedEnv as env };

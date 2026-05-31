import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Always load apps/api/.env regardless of npm workspace cwd */
const apiRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
loadDotenv({ path: resolve(apiRoot, '.env') });

/** Treat blank .env values as unset (Zod optional() alone still rejects ""). */
function optionalString(minLength?: number) {
  return z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val;
  }, minLength ? z.string().min(minLength).optional() : z.string().optional());
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_VERSION: z.string().default('0.2.0'),
  INTERNAL_API_SECRET: z.string().min(8).default('dev-internal-secret'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: optionalString(),
  REDIS_URL: optionalString(),
  STRIPE_SECRET_KEY: optionalString(),
  STRIPE_WEBHOOK_SECRET: optionalString(),
  STRIPE_CONNECT_RETURN_PATH: z.string().default('/settings?tab=payments'),
  S3_BUCKET: optionalString(),
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: optionalString(),
  S3_ACCESS_KEY_ID: optionalString(),
  S3_SECRET_ACCESS_KEY: optionalString(),
  S3_PUBLIC_URL: optionalString(),
  PLAYBACK_JWT_SECRET: optionalString(32),
  PLAYBACK_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  MEDIA_MAX_BYTES: z.coerce.number().default(524_288_000), // 500MB
  TASTE_TOKEN_ENCRYPTION_KEY: optionalString(32),
  SPOTIFY_CLIENT_ID: optionalString(),
  SPOTIFY_CLIENT_SECRET: optionalString(),
  APPLE_MUSIC_TEAM_ID: optionalString(),
  SOUNDCLOUD_CLIENT_ID: optionalString(),
  TIKTOK_CLIENT_KEY: optionalString(),
  TIKTOK_CLIENT_SECRET: optionalString(),
  DRM_PROVIDER: z
    .enum(['aws_mediaconvert', 'ezdrm', 'axinom', 'pallycon', 'mock'])
    .default('mock'),
  DRM_LICENSE_SERVER_URL: optionalString(),
  DRM_WIDEVINE_LA_URL: optionalString(),
  DRM_FAIRPLAY_LA_URL: optionalString(),
  DRM_FAIRPLAY_CERTIFICATE_URL: optionalString(),
  DRM_CONTENT_ID_PREFIX: z.string().default('mintmusic'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const env = loadEnv();

export function isDatabaseConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}

export function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY
  );
}

export function isPlaybackConfigured(): boolean {
  return Boolean(env.PLAYBACK_JWT_SECRET && isStorageConfigured());
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isDrmConfigured(): boolean {
  return Boolean(
    env.DRM_LICENSE_SERVER_URL ||
      (env.DRM_WIDEVINE_LA_URL && env.DRM_FAIRPLAY_LA_URL)
  );
}

export function isTasteEncryptionConfigured(): boolean {
  return Boolean(
    env.TASTE_TOKEN_ENCRYPTION_KEY &&
      env.TASTE_TOKEN_ENCRYPTION_KEY.length >= 32
  );
}

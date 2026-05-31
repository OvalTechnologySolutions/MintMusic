import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_VERSION: z.string().default('0.2.0'),
  INTERNAL_API_SECRET: z.string().min(8).default('dev-internal-secret'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_RETURN_PATH: z.string().default('/settings?tab=payments'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  PLAYBACK_JWT_SECRET: z.string().min(32).optional(),
  PLAYBACK_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  MEDIA_MAX_BYTES: z.coerce.number().default(524_288_000), // 500MB
  TASTE_TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  APPLE_MUSIC_TEAM_ID: z.string().optional(),
  SOUNDCLOUD_CLIENT_ID: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  DRM_PROVIDER: z
    .enum(['aws_mediaconvert', 'ezdrm', 'axinom', 'pallycon', 'mock'])
    .default('mock'),
  DRM_LICENSE_SERVER_URL: z.string().optional(),
  DRM_WIDEVINE_LA_URL: z.string().optional(),
  DRM_FAIRPLAY_LA_URL: z.string().optional(),
  DRM_FAIRPLAY_CERTIFICATE_URL: z.string().optional(),
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

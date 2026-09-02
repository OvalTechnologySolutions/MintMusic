import { Router } from 'express';
import type { ApiCapabilitiesResponse, HealthResponse } from '@mintmusic/shared';
import { config } from '../config/index.js';
import { isDatabaseConfigured, isDrmConfigured, isPlaybackConfigured, isStorageConfigured, isTasteEncryptionConfigured } from '../config/env.js';
import { pingDatabase } from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const dbOk = isDatabaseConfigured() ? await pingDatabase() : false;
  const body: HealthResponse & {
    checks: Record<string, boolean>;
  } = {
    status: dbOk || !isDatabaseConfigured() ? 'ok' : 'degraded',
    version: config.apiVersion,
    service: 'mintmusic-api',
    checks: {
      database: dbOk,
      storage: isStorageConfigured(),
      playback: isPlaybackConfigured(),
      drm: isDrmConfigured(),
      tasteEncryption: isTasteEncryptionConfigured(),
    },
  };
  res.json(body);
});

healthRouter.get('/capabilities', (_req, res) => {
  const body: ApiCapabilitiesResponse = {
    version: config.apiVersion,
    features: {
      releases: isDatabaseConfigured() ? 'beta' : 'planned',
      music_moments: 'planned',
      brand_marketplace: 'planned',
      analytics: isDatabaseConfigured() ? 'beta' : 'planned',
    },
  };
  res.json(body);
});

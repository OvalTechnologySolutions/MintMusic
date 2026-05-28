import { Router } from 'express';
import type { ApiCapabilitiesResponse, HealthResponse } from '@mintmusic/shared';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    version: config.apiVersion,
    service: 'mintmusic-api',
  };
  res.json(body);
});

healthRouter.get('/capabilities', (_req, res) => {
  const body: ApiCapabilitiesResponse = {
    version: config.apiVersion,
    features: {
      releases: 'planned',
      music_moments: 'planned',
      brand_marketplace: 'planned',
      analytics: 'planned',
    },
  };
  res.json(body);
});

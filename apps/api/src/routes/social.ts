import { Router } from 'express';
import type {
  SocialConnectInitResponse,
  SocialOAuthPlatform,
} from '@mintmusic/shared';
import { SOCIAL_OAUTH_PROVIDERS } from '@mintmusic/shared';
import type { AuthedRequest } from '../middleware/internal-auth.js';
import { requireInternalUser } from '../middleware/internal-auth.js';
import { config } from '../config.js';

export const socialRouter = Router();

/** List platform OAuth integration status (for Settings UI) */
socialRouter.get('/providers', (_req, res) => {
  res.json({
    providers: Object.values(SOCIAL_OAUTH_PROVIDERS),
  });
});

/** Initiate platform connection — manual fallback until OAuth env vars are set */
socialRouter.post(
  '/connect/:platform',
  requireInternalUser,
  (req: AuthedRequest, res) => {
    const platform = req.params.platform as SocialOAuthPlatform;
    const provider = SOCIAL_OAUTH_PROVIDERS[platform];

    if (!provider) {
      res.status(400).json({ error: 'Unsupported platform' });
      return;
    }

    if (provider.status === 'oauth_live') {
      // Future: build authorize URL from env
      const response: SocialConnectInitResponse = {
        platform,
        mode: 'oauth_redirect',
        authorizeUrl: `${config.webUrl}/settings?tab=social&platform=${platform}`,
        message: 'OAuth redirect not yet configured for this environment',
      };
      res.json(response);
      return;
    }

    const response: SocialConnectInitResponse = {
      platform,
      mode: 'manual',
      message: `Paste your ${provider.label} profile URL below. Official ${provider.label} sign-in is planned.`,
    };
    res.json(response);
  }
);

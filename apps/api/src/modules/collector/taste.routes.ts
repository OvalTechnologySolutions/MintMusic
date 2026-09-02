import { Router } from 'express';
import type { TasteOAuthCallbackRequest, TastePlatform } from '@mintmusic/shared';
import { env } from '../../config/env.js';
import { encryptSecret, isEncryptionConfigured } from '../../lib/crypto/encryption.js';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { ServiceUnavailableError } from '../../lib/errors.js';
import { routeParam } from '../../lib/route-param.js';
import { enqueueJob } from '../../workers/queue.js';

const OAUTH_BASE: Partial<Record<TastePlatform, string>> = {
  spotify: 'https://accounts.spotify.com/authorize',
  soundcloud: 'https://soundcloud.com/connect',
  tiktok: 'https://www.tiktok.com/v2/auth/authorize',
};

export const tasteRouter = Router();

tasteRouter.use(requireInternalUser, ensureDatabase);

/** GET /v1/taste/profile */
tasteRouter.get(
  '/profile',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const profile = await db.tasteProfile.findUnique({
      where: { userId: req.userId! },
    });
    const connections = await db.tasteConnection.findMany({
      where: { userId: req.userId! },
      select: { platform: true, connectedAt: true, lastSyncedAt: true },
    });
    res.json({
      profile: profile ?? {
        topGenres: [],
        topArtists: [],
        topTracks: [],
        sourceSummary: {},
        updatedAt: null,
      },
      connectedPlatforms: connections.map((c) => ({
        platform: c.platform,
        connectedAt: c.connectedAt.toISOString(),
        lastSyncedAt: c.lastSyncedAt?.toISOString(),
      })),
    });
  })
);

/** GET /v1/taste/connect/:platform */
tasteRouter.get(
  '/connect/:platform',
  asyncHandler(async (req: AuthedRequest, res) => {
    const platform = routeParam(req.params.platform) as TastePlatform;
    const redirectUri = `${env.WEB_URL}/settings?tab=taste&platform=${platform}`;

    if (platform === 'spotify' && env.SPOTIFY_CLIENT_ID) {
      const params = new URLSearchParams({
        client_id: env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'user-top-read user-read-recently-played',
        state: req.userId!,
      });
      res.json({
        platform,
        authorizeUrl: `${OAUTH_BASE.spotify}?${params}`,
      });
      return;
    }

    if (platform === 'apple_music') {
      throw new ServiceUnavailableError(
        'Apple Music taste sync requires MusicKit developer token setup'
      );
    }

    res.json({
      platform,
      authorizeUrl: null,
      message: `${platform} OAuth credentials not configured. See PRODUCT_READINESS.md`,
    });
  })
);

/** POST /v1/taste/callback — exchange code and store encrypted tokens */
tasteRouter.post(
  '/callback',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isEncryptionConfigured()) {
      throw new ServiceUnavailableError('TASTE_TOKEN_ENCRYPTION_KEY not configured');
    }

    const body = req.body as TasteOAuthCallbackRequest;
    const db = await getPrisma();

    // Production: exchange code for tokens per platform
    let accessToken = '';
    let refreshToken: string | undefined;
    let expiresAt: Date | undefined;
    const scopes: string[] = [];

    if (body.platform === 'spotify' && env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: body.code,
          redirect_uri: body.redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        res.status(400).json({ error: 'Spotify token exchange failed' });
        return;
      }
      const tokens = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
      if (tokens.expires_in) {
        expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      }
      if (tokens.scope) scopes.push(...tokens.scope.split(' '));
    } else {
      res.status(501).json({
        error: `${body.platform} token exchange not implemented yet`,
      });
      return;
    }

    await db.tasteConnection.upsert({
      where: {
        userId_platform: {
          userId: req.userId!,
          platform: body.platform,
        },
      },
      create: {
        userId: req.userId!,
        platform: body.platform,
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : null,
        expiresAt,
        scopes,
      },
      update: {
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : null,
        expiresAt,
        scopes,
      },
    });

    await enqueueJob('taste-sync', { userId: req.userId! });

    res.json({ connected: true, platform: body.platform });
  })
);

/** POST /v1/taste/sync */
tasteRouter.post(
  '/sync',
  asyncHandler(async (req: AuthedRequest, res) => {
    const db = await getPrisma();
    const connections = await db.tasteConnection.findMany({
      where: { userId: req.userId! },
    });

    await enqueueJob('taste-sync', { userId: req.userId! });

    res.json({
      status: 'queued',
      connectedPlatforms: connections.map((c) => c.platform),
    });
  })
);

/** DELETE /v1/taste/disconnect/:platform — GDPR deletion of tokens + profile slice */
tasteRouter.delete(
  '/disconnect/:platform',
  asyncHandler(async (req: AuthedRequest, res) => {
    const platform = routeParam(req.params.platform) as TastePlatform;
    const db = await getPrisma();
    await db.tasteConnection.deleteMany({
      where: { userId: req.userId!, platform },
    });
    res.json({ disconnected: true, platform });
  })
);

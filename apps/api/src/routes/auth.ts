import { Router } from 'express';
import type { OAuthSyncRequest, OAuthSyncResponse } from '@mintmusic/shared';
import { AppError } from '../lib/errors.js';
import { requireInternalSecret } from '../middleware/internal-auth.js';
import { upsertOAuthUser } from '../store/users.js';

export const authRouter = Router();

/** Internal: NextAuth sign-in callback via the web BFF. Requires X-Internal-Secret. */
authRouter.post('/oauth', requireInternalSecret, async (req, res) => {
  const body = req.body as OAuthSyncRequest;
  if (!body?.email || !body?.provider || !body?.providerAccountId) {
    res.status(400).json({ error: 'Invalid OAuth payload' });
    return;
  }

  try {
    const user = await upsertOAuthUser({
      email: body.email,
      name: body.name ?? body.email.split('@')[0],
      image: body.image,
      provider: body.provider,
      providerAccountId: body.providerAccountId,
    });

    const response: OAuthSyncResponse = { user };
    res.json(response);
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    console.error('[auth/oauth] sync failed:', err);
    res.status(500).json({ error: 'OAuth sync failed' });
  }
});

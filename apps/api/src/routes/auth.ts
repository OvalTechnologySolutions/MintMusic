import { Router } from 'express';
import type { OAuthSyncRequest, OAuthSyncResponse } from '@mintmusic/shared';
import { upsertOAuthUser } from '../store/users.js';

export const authRouter = Router();

/** Public: called from NextAuth sign-in callback */
authRouter.post('/oauth', async (req, res) => {
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
    console.error('[auth/oauth] sync failed:', err);
    const message = err instanceof Error ? err.message : 'OAuth sync failed';
    res.status(500).json({ error: message });
  }
});

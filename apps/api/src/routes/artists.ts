import { Router } from 'express';
import type { GetArtistProfileResponse } from '@mintmusic/shared';
import { requireInternalUser } from '../middleware/internal-auth.js';
import { getArtistProfile } from '../store/artist-profiles.js';

export const artistsRouter = Router();

/** GET /v1/artists/:wallet/profile */
artistsRouter.get('/:wallet/profile', (req, res) => {
  const wallet = req.params.wallet;
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const profile = getArtistProfile(wallet);
  const body: GetArtistProfileResponse = { profile };
  res.json(body);
});

/**
 * PUT /v1/artists/:wallet/profile
 *
 * Writes used to be unauthenticated (SIWE was a TODO). Anyone could overwrite
 * any wallet's profile or flood the in-memory map until the API process died.
 * Reject writes until wallet ownership is proven.
 */
artistsRouter.put('/:wallet/profile', requireInternalUser, (_req, res) => {
  res.status(401).json({ error: 'Wallet signature required' });
});

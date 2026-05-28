import { Router } from 'express';
import type {
  GetArtistProfileResponse,
  PutArtistProfileRequest,
  PutArtistProfileResponse,
} from '@mintmusic/shared';
import { getArtistProfile, upsertArtistProfile } from '../store/artist-profiles.js';

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

/** PUT /v1/artists/:wallet/profile — wallet auth (SIWE) to be added */
artistsRouter.put('/:wallet/profile', (req, res) => {
  const wallet = req.params.wallet;
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const body = req.body as PutArtistProfileRequest;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const profile = upsertArtistProfile(wallet, body);
    const response: PutArtistProfileResponse = { profile };
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    res.status(400).json({ error: message });
  }
});

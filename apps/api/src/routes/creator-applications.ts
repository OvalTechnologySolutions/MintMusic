import { Router } from 'express';
import type { SubmitCreatorApplicationRequest } from '@mintmusic/shared';
import type { AuthedRequest } from '../middleware/internal-auth.js';
import { requireInternalUser } from '../middleware/internal-auth.js';
import {
  getApplicationByUserId,
  submitApplication,
} from '../store/creator-applications.js';

export const creatorApplicationsRouter = Router();

creatorApplicationsRouter.use(requireInternalUser);

creatorApplicationsRouter.get('/me', async (req: AuthedRequest, res) => {
  const application = await getApplicationByUserId(req.userId!);
  res.json({ application: application ?? null });
});

creatorApplicationsRouter.post('/', async (req: AuthedRequest, res) => {
  const body = req.body as SubmitCreatorApplicationRequest;
  if (!body?.artistName?.trim() || !body?.genre?.trim() || !body?.whyJoin?.trim()) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const application = await submitApplication(req.userId!, body);
    res.status(201).json({ application });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    res.status(400).json({ error: message });
  }
});

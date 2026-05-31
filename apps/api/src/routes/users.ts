import { Router } from 'express';
import type { UpdateUserRequest } from '@mintmusic/shared';
import type { AuthedRequest } from '../middleware/internal-auth.js';
import { requireInternalUser } from '../middleware/internal-auth.js';
import { routeParam } from '../lib/route-param.js';
import { findUserById, getPublicProfile, updateUser } from '../store/users.js';

export const usersRouter = Router();

usersRouter.get('/:id/public', async (req, res) => {
  const id = routeParam(req.params.id);
  const profile = await getPublicProfile(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ profile });
});

usersRouter.use(requireInternalUser);

usersRouter.get('/me', async (req: AuthedRequest, res) => {
  const user = await findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

usersRouter.patch('/me', async (req: AuthedRequest, res) => {
  const body = req.body as UpdateUserRequest;
  const user = await updateUser(req.userId!, body);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

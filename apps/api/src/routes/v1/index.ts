import { Router } from 'express';
import { artistsRouter } from '../../routes/artists.js';
import { authRouter } from '../../routes/auth.js';
import { creatorApplicationsRouter } from '../../routes/creator-applications.js';
import { healthRouter } from '../../routes/health.js';
import { socialRouter } from '../../routes/social.js';
import { stripeRouter } from '../../routes/stripe.js';
import { usersRouter } from '../../routes/users.js';
import { mediaRouter, catalogRouter } from '../../modules/creator/media.routes.js';
import { postsRouter } from '../../modules/creator/posts.routes.js';
import { analyticsRouter } from '../../modules/creator/analytics.routes.js';
import { radioRouter } from '../../modules/creator/radio.routes.js';
import { feedRouter } from '../../modules/collector/feed.routes.js';
import { discoverRouter } from '../../modules/collector/discover.routes.js';
import { collectionRouter } from '../../modules/collector/collection.routes.js';
import { tasteRouter } from '../../modules/collector/taste.routes.js';

export const v1Router = Router();

v1Router.use(healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/creator-applications', creatorApplicationsRouter);
v1Router.use('/social', socialRouter);
v1Router.use('/stripe', stripeRouter);
v1Router.use('/artists', artistsRouter);

// Creator domain
v1Router.use('/media', mediaRouter);
v1Router.use('/catalog', catalogRouter);
v1Router.use('/posts', postsRouter);
v1Router.use('/analytics', analyticsRouter);
v1Router.use('/radio', radioRouter);

// Collector domain
v1Router.use('/feed', feedRouter);
v1Router.use('/discover', discoverRouter);
v1Router.use('/collection', collectionRouter);
v1Router.use('/taste', tasteRouter);

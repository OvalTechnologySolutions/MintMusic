import { Router } from 'express';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import type { AuthedRequest } from '../../middleware/internal-auth.js';
import { requireInternalUser } from '../../middleware/internal-auth.js';
import { requireApprovedCreator } from '../../middleware/require-creator.js';
import type { CreatorPerformanceDashboard } from '@mintmusic/shared';

export const analyticsRouter = Router();

analyticsRouter.use(
  requireInternalUser,
  ensureDatabase,
  requireApprovedCreator
);

/** GET /v1/analytics/dashboard?days=30 */
analyticsRouter.get(
  '/dashboard',
  asyncHandler(async (req: AuthedRequest, res) => {
    const days = Number(req.query.days ?? 30);
    const since = new Date(Date.now() - days * 86400000);
    const db = await getPrisma();
    const creatorId = req.userId!;

    const [purchases, playEvents, releases] = await Promise.all([
      db.purchase.findMany({
        where: {
          release: { creatorId },
          purchasedAt: { gte: since },
        },
        include: { release: { select: { id: true, title: true } } },
      }),
      db.playEvent.findMany({
        where: {
          release: { creatorId },
          createdAt: { gte: since },
        },
      }),
      db.release.findMany({
        where: { creatorId },
        select: { id: true, title: true },
      }),
    ]);

    const revenueCents = purchases.reduce((s, p) => s + p.amountCents, 0);
    const listensBySource: Record<string, number> = {};
    for (const e of playEvents) {
      listensBySource[e.source] = (listensBySource[e.source] ?? 0) + 1;
    }

    const releaseStats = new Map<
      string,
      { title: string; sales: number; listens: number }
    >();
    for (const r of releases) {
      releaseStats.set(r.id, { title: r.title, sales: 0, listens: 0 });
    }
    for (const p of purchases) {
      const stat = releaseStats.get(p.releaseId);
      if (stat) stat.sales += 1;
    }
    for (const e of playEvents) {
      const stat = releaseStats.get(e.releaseId);
      if (stat) stat.listens += 1;
    }

    const dashboard: CreatorPerformanceDashboard = {
      periodDays: days,
      totalSales: purchases.length,
      revenueCents,
      totalListens: playEvents.length,
      uniqueListeners: new Set(playEvents.map((e) => e.userId)).size,
      topReleases: [...releaseStats.entries()]
        .map(([releaseId, v]) => ({ releaseId, ...v }))
        .sort((a, b) => b.listens - a.listens)
        .slice(0, 10),
      listensBySource,
    };

    res.json(dashboard);
  })
);

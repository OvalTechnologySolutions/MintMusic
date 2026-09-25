import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getPrisma } from '../../lib/prisma.js';
import { asyncHandler, ensureDatabase } from '../../middleware/async-handler.js';
import { requireCrateBuilderAdmin } from '../../middleware/require-cratebuilder-admin.js';
import { routeParam } from '../../lib/route-param.js';
import { toArtistDetailDto, toArtistSummaryDto } from './mappers.js';
import { runCrateBuilderPipeline } from './pipeline.js';
import { importArtistRows, parseSimpleCsv } from './import.js';
import { syncConnectorStatuses, getConnectorDefaults } from './connectors.js';
import {
  createPresignedDownloadUrl,
  exportWorkbookForRun,
  readExportBuffer,
} from './export.js';
import type { CbImportArtistRow } from '@mintmusic/shared';

export const cratebuilderRouter = Router();

cratebuilderRouter.use(ensureDatabase, requireCrateBuilderAdmin);

/** GET /v1/cratebuilder/dashboard */
cratebuilderRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      totalArtists,
      newArtists24h,
      updatedArtists24h,
      verifiedContacts,
      reviewQueueOpen,
      connectorFailures,
      lastRun,
    ] = await Promise.all([
      db.cbArtist.count({ where: { suppressedAt: null } }),
      db.cbArtist.count({ where: { firstDiscoveredAt: { gte: since }, suppressedAt: null } }),
      db.cbArtist.count({ where: { updatedAt: { gte: since }, suppressedAt: null } }),
      db.cbContact.count({ where: { verified: true, suppressed: false } }),
      db.cbReviewQueueItem.count({ where: { status: 'needs_review' } }),
      db.cbConnectorStatus.count({ where: { enabled: false } }),
      db.cbIngestionRun.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);

    res.json({
      totalArtists,
      newArtists24h,
      updatedArtists24h,
      verifiedContacts,
      reviewQueueOpen,
      connectorFailures,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            trigger: lastRun.trigger,
            scheduledFor: lastRun.scheduledFor?.toISOString() ?? null,
            startedAt: lastRun.startedAt?.toISOString() ?? null,
            completedAt: lastRun.completedAt?.toISOString() ?? null,
            coverageNotes: lastRun.coverageNotes,
            partialFailure: lastRun.partialFailure,
            summaryJson: (lastRun.summaryJson as Record<string, unknown>) ?? {},
            errorMessage: lastRun.errorMessage,
            createdAt: lastRun.createdAt.toISOString(),
          }
        : null,
    });
  })
);

/** GET /v1/cratebuilder/artists */
cratebuilderRouter.get(
  '/artists',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
    const location = typeof req.query.location === 'string' ? req.query.location : undefined;
    const outreachStatus =
      typeof req.query.outreachStatus === 'string' ? req.query.outreachStatus : undefined;
    const recent = req.query.recent === 'true' || req.query.recent === '1';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = Math.min(Number(req.query.limit ?? 24), 100);

    const where: Prisma.CbArtistWhereInput = {
      suppressedAt: null,
      ...(q
        ? {
            OR: [
              { stageName: { contains: q, mode: 'insensitive' } },
              { aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(genre ? { genres: { has: genre } } : {}),
      ...(location
        ? {
            OR: [
              { currentCity: { contains: location, mode: 'insensitive' } },
              { currentRegion: { contains: location, mode: 'insensitive' } },
              { currentCountry: { contains: location, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(outreachStatus
        ? { outreachStatus: outreachStatus as Prisma.EnumCbOutreachStatusFilter }
        : {}),
      ...(recent ? { firstDiscoveredAt: { gte: new Date(Date.now() - 7 * 86400000) } } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const rows = await db.cbArtist.findMany({
      where,
      orderBy: [{ firstDiscoveredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        preferredContact: true,
        _count: { select: { profiles: true, contacts: true } },
      },
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    res.json({
      artists: slice.map(toArtistSummaryDto),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
    });
  })
);

/** GET /v1/cratebuilder/artists/:id */
cratebuilderRouter.get(
  '/artists/:id',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const id = routeParam(req.params.id);
    const artist = await db.cbArtist.findUnique({
      where: { id },
      include: {
        preferredContact: true,
        profiles: true,
        contacts: true,
        aliases: true,
        observations: { orderBy: { retrievedAt: 'desc' }, take: 100 },
        externalIds: true,
        _count: { select: { profiles: true, contacts: true } },
      },
    });
    if (!artist) {
      res.status(404).json({ error: 'Artist not found' });
      return;
    }
    res.json({ artist: toArtistDetailDto(artist) });
  })
);

const patchArtistSchema = z.object({
  stageName: z.string().min(1).optional(),
  entityType: z.enum(['solo', 'group', 'unknown']).optional(),
  bio: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  website: z.string().url().nullable().optional(),
  discoveryVisible: z.boolean().optional(),
  outreachStatus: z
    .enum([
      'not_reviewed',
      'ready',
      'contacted',
      'responded',
      'onboarded',
      'do_not_contact',
    ])
    .optional(),
  outreachNotes: z.string().nullable().optional(),
  outreachAssignedTo: z.string().nullable().optional(),
  adminLockedFields: z.array(z.string()).optional(),
  preferredContactId: z.string().nullable().optional(),
  suppress: z.boolean().optional(),
  currentCity: z.string().nullable().optional(),
  currentRegion: z.string().nullable().optional(),
  currentCountry: z.string().nullable().optional(),
});

/** PATCH /v1/cratebuilder/artists/:id */
cratebuilderRouter.patch(
  '/artists/:id',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const id = routeParam(req.params.id);
    const body = patchArtistSchema.parse(req.body);
    const existing = await db.cbArtist.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Artist not found' });
      return;
    }

    const locked = new Set([
      ...existing.adminLockedFields,
      ...(body.adminLockedFields ?? []),
    ]);

    const data: Prisma.CbArtistUpdateInput = {};
    const setIfUnlocked = (field: string, value: unknown) => {
      if (value === undefined) return;
      if (locked.has(field) && body.adminLockedFields === undefined) {
        // Allow explicit admin patch of locked fields when editing via admin UI
      }
      (data as Record<string, unknown>)[field] = value;
    };

    setIfUnlocked('stageName', body.stageName);
    setIfUnlocked('entityType', body.entityType);
    setIfUnlocked('bio', body.bio);
    setIfUnlocked('genres', body.genres);
    setIfUnlocked('website', body.website);
    setIfUnlocked('discoveryVisible', body.discoveryVisible);
    setIfUnlocked('outreachStatus', body.outreachStatus);
    setIfUnlocked('outreachNotes', body.outreachNotes);
    setIfUnlocked('outreachAssignedTo', body.outreachAssignedTo);
    setIfUnlocked('currentCity', body.currentCity);
    setIfUnlocked('currentRegion', body.currentRegion);
    setIfUnlocked('currentCountry', body.currentCountry);
    if (body.adminLockedFields) data.adminLockedFields = body.adminLockedFields;
    if (body.preferredContactId !== undefined) {
      data.preferredContact = body.preferredContactId
        ? { connect: { id: body.preferredContactId } }
        : { disconnect: true };
    }
    if (body.suppress === true) data.suppressedAt = new Date();
    if (body.suppress === false) data.suppressedAt = null;

    // Lock fields that were manually corrected
    const autoLock = ['stageName', 'bio', 'website', 'genres', 'outreachStatus'].filter(
      (f) => (body as Record<string, unknown>)[f] !== undefined
    );
    if (autoLock.length) {
      data.adminLockedFields = Array.from(
        new Set([...(body.adminLockedFields ?? existing.adminLockedFields), ...autoLock])
      );
    }

    const updated = await db.cbArtist.update({
      where: { id },
      data,
      include: {
        preferredContact: true,
        profiles: true,
        contacts: true,
        aliases: true,
        observations: { take: 50, orderBy: { retrievedAt: 'desc' } },
        externalIds: true,
        _count: { select: { profiles: true, contacts: true } },
      },
    });
    res.json({ artist: toArtistDetailDto(updated) });
  })
);

/** POST /v1/cratebuilder/artists/:id/suppress-contact */
cratebuilderRouter.post(
  '/artists/:id/suppress-contact',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const artistId = routeParam(req.params.id);
    const contactId = z.object({ contactId: z.string() }).parse(req.body).contactId;
    const contact = await db.cbContact.findFirst({ where: { id: contactId, artistId } });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    await db.cbContact.update({
      where: { id: contactId },
      data: { suppressed: true, suppressedAt: new Date() },
    });
    res.json({ ok: true });
  })
);

/** POST /v1/cratebuilder/artists/merge */
cratebuilderRouter.post(
  '/artists/merge',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const { keepId, mergeId } = z
      .object({ keepId: z.string(), mergeId: z.string() })
      .parse(req.body);
    if (keepId === mergeId) {
      res.status(400).json({ error: 'keepId and mergeId must differ' });
      return;
    }
    await db.$transaction(async (tx) => {
      await tx.cbProfile.updateMany({ where: { artistId: mergeId }, data: { artistId: keepId } });
      await tx.cbContact.updateMany({ where: { artistId: mergeId }, data: { artistId: keepId } });
      await tx.cbObservation.updateMany({
        where: { artistId: mergeId },
        data: { artistId: keepId },
      });
      await tx.cbAlias.updateMany({ where: { artistId: mergeId }, data: { artistId: keepId } });
      // External IDs: skip conflicts
      const ext = await tx.cbExternalId.findMany({ where: { artistId: mergeId } });
      for (const e of ext) {
        const clash = await tx.cbExternalId.findUnique({
          where: {
            provider_externalId: { provider: e.provider, externalId: e.externalId },
          },
        });
        if (!clash) {
          await tx.cbExternalId.update({
            where: { id: e.id },
            data: { artistId: keepId },
          });
        } else {
          await tx.cbExternalId.delete({ where: { id: e.id } });
        }
      }
      await tx.cbArtist.delete({ where: { id: mergeId } });
    });
    res.json({ ok: true, keepId });
  })
);

/** GET /v1/cratebuilder/review */
cratebuilderRouter.get(
  '/review',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const items = await db.cbReviewQueueItem.findMany({
      where: { status: 'needs_review' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  })
);

/** POST /v1/cratebuilder/review/:id/resolve */
cratebuilderRouter.post(
  '/review/:id/resolve',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const id = routeParam(req.params.id);
    const { status } = z
      .object({ status: z.enum(['accepted', 'rejected']) })
      .parse(req.body);
    await db.cbReviewQueueItem.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
    res.json({ ok: true });
  })
);

/** GET /v1/cratebuilder/sources */
cratebuilderRouter.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const sources = await db.cbSource.findMany({ orderBy: { name: 'asc' } });
    res.json({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        url: s.url,
        connectorId: s.connectorId,
        enabled: s.enabled,
        publicationDate: s.publicationDate?.toISOString() ?? null,
        lastFetchedAt: s.lastFetchedAt?.toISOString() ?? null,
        configJson: s.configJson as Record<string, unknown>,
      })),
    });
  })
);

const sourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['editorial_url', 'social_account', 'playlist', 'manual', 'feed']),
  url: z.string().url().optional().nullable(),
  connectorId: z.string().min(1),
  enabled: z.boolean().optional(),
  publicationDate: z.string().datetime().optional().nullable(),
  configJson: z.record(z.unknown()).optional(),
});

/** POST /v1/cratebuilder/sources */
cratebuilderRouter.post(
  '/sources',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const body = sourceSchema.parse(req.body);
    const created = await db.cbSource.create({
      data: {
        name: body.name,
        type: body.type,
        url: body.url ?? null,
        connectorId: body.connectorId,
        enabled: body.enabled ?? true,
        publicationDate: body.publicationDate ? new Date(body.publicationDate) : null,
        configJson: (body.configJson ?? {}) as object,
      },
    });
    res.status(201).json({ source: created });
  })
);

/** PATCH /v1/cratebuilder/sources/:id */
cratebuilderRouter.patch(
  '/sources/:id',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const id = routeParam(req.params.id);
    const body = sourceSchema.partial().parse(req.body);
    const updated = await db.cbSource.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        url: body.url,
        connectorId: body.connectorId,
        enabled: body.enabled,
        configJson:
          body.configJson === undefined ? undefined : (body.configJson as object),
        publicationDate:
          body.publicationDate === undefined
            ? undefined
            : body.publicationDate
              ? new Date(body.publicationDate)
              : null,
      },
    });
    res.json({ source: updated });
  })
);

/** GET /v1/cratebuilder/connectors */
cratebuilderRouter.get(
  '/connectors',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    await syncConnectorStatuses(db);
    const rows = await db.cbConnectorStatus.findMany({ orderBy: { id: 'asc' } });
    res.json({
      connectors: rows.map((r) => ({
        id: r.id,
        enabled: r.enabled,
        reason: r.reason,
        lastError: r.lastError,
        lastOkAt: r.lastOkAt?.toISOString() ?? null,
      })),
      defaults: getConnectorDefaults(),
    });
  })
);

/** POST /v1/cratebuilder/import */
cratebuilderRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const body = z
      .object({
        format: z.enum(['json', 'csv']).default('json'),
        data: z.unknown(),
      })
      .parse(req.body);

    let rows: CbImportArtistRow[] = [];
    if (body.format === 'csv') {
      if (typeof body.data !== 'string') {
        res.status(400).json({ error: 'CSV import requires string data' });
        return;
      }
      rows = parseSimpleCsv(body.data);
    } else {
      const parsed = z
        .array(
          z.object({
            stageName: z.string(),
            entityType: z.enum(['solo', 'group', 'unknown']).optional(),
            bio: z.string().optional(),
            genres: z.array(z.string()).optional(),
            website: z.string().optional(),
            profiles: z
              .array(z.object({ platform: z.string(), url: z.string() }))
              .optional(),
            contacts: z
              .array(
                z.object({
                  kind: z.enum([
                    'booking',
                    'management',
                    'inquiries',
                    'phone',
                    'form',
                    'other',
                  ]),
                  value: z.string(),
                  role: z.string().optional(),
                  representativeName: z.string().optional(),
                  organization: z.string().optional(),
                })
              )
              .optional(),
            sourceUrl: z.string().optional(),
          })
        )
        .parse(body.data);
      rows = parsed;
    }

    const result = await importArtistRows(db, rows);
    res.json(result);
  })
);

/** POST /v1/cratebuilder/runs */
cratebuilderRouter.post(
  '/runs',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const body = z
      .object({
        sourceIds: z.array(z.string()).optional(),
        skipExport: z.boolean().optional(),
      })
      .parse(req.body ?? {});
    const result = await runCrateBuilderPipeline(db, {
      trigger: 'manual',
      sourceIds: body.sourceIds,
      skipExport: body.skipExport,
    });
    res.status(202).json(result);
  })
);

/** GET /v1/cratebuilder/runs */
cratebuilderRouter.get(
  '/runs',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const runs = await db.cbIngestionRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        trigger: r.trigger,
        scheduledFor: r.scheduledFor?.toISOString() ?? null,
        startedAt: r.startedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        coverageNotes: r.coverageNotes,
        partialFailure: r.partialFailure,
        summaryJson: (r.summaryJson as Record<string, unknown>) ?? {},
        errorMessage: r.errorMessage,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  })
);

/** GET /v1/cratebuilder/exports */
cratebuilderRouter.get(
  '/exports',
  asyncHandler(async (_req, res) => {
    const db = await getPrisma();
    const exports = await db.cbExport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      exports: exports.map((e) => ({
        id: e.id,
        filename: e.filename,
        exportDate: e.exportDate.toISOString().slice(0, 10),
        complete: e.complete,
        isLatest: e.isLatest,
        byteSize: e.byteSize,
        createdAt: e.createdAt.toISOString(),
        runId: e.runId,
      })),
    });
  })
);

/** POST /v1/cratebuilder/exports/generate */
cratebuilderRouter.post(
  '/exports/generate',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const body = z.object({ runId: z.string().optional() }).parse(req.body ?? {});
    let runId = body.runId;
    if (!runId) {
      const last = await db.cbIngestionRun.findFirst({ orderBy: { createdAt: 'desc' } });
      if (!last) {
        // Create a synthetic completed run for snapshot-only export
        const snap = await db.cbIngestionRun.create({
          data: {
            status: 'completed',
            trigger: 'export_only',
            startedAt: new Date(),
            completedAt: new Date(),
            summaryJson: { note: 'snapshot_export_without_ingest' },
          },
        });
        runId = snap.id;
      } else {
        runId = last.id;
      }
    }
    const exp = await exportWorkbookForRun(db, runId);
    res.status(201).json(exp);
  })
);

/** GET /v1/cratebuilder/exports/:id/download */
cratebuilderRouter.get(
  '/exports/:id/download',
  asyncHandler(async (req, res) => {
    const db = await getPrisma();
    const id = routeParam(req.params.id);
    const exp = await db.cbExport.findUnique({ where: { id } });
    if (!exp) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    const signed = await createPresignedDownloadUrl(exp.storageKey);
    if (signed) {
      res.json({ url: signed, filename: exp.filename });
      return;
    }
    const buf = await readExportBuffer(exp.storageKey);
    if (!buf) {
      res.status(404).json({ error: 'Export file missing from storage' });
      return;
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${exp.filename}"`);
    res.send(buf);
  })
);

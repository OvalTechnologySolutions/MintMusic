import type { PrismaClient, CbEntityType, CbOutreachStatus } from '@prisma/client';
import { createHash } from 'node:crypto';

export interface ArtistCandidate {
  stageName: string;
  entityType?: CbEntityType;
  bio?: string | null;
  genres?: string[];
  website?: string | null;
  profiles?: Array<{ platform: string; url: string; handle?: string; externalAccountId?: string }>;
  externalIds?: Array<{ provider: string; externalId: string; url?: string }>;
  hometownCity?: string | null;
  hometownRegion?: string | null;
  hometownCountry?: string | null;
  currentCity?: string | null;
  currentRegion?: string | null;
  currentCountry?: string | null;
  sourceUrl?: string | null;
  sourceType?: string | null;
  excerpt?: string | null;
  method?: string;
  confidence?: number;
  emergingStatus?: string | null;
}

export interface ResolveResult {
  artistId: string;
  created: boolean;
  queuedReview: boolean;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function findArtistByStrongKeys(
  db: PrismaClient,
  candidate: ArtistCandidate
): Promise<string | null> {
  if (candidate.externalIds?.length) {
    for (const ext of candidate.externalIds) {
      const hit = await db.cbExternalId.findUnique({
        where: {
          provider_externalId: { provider: ext.provider, externalId: ext.externalId },
        },
      });
      if (hit) return hit.artistId;
    }
  }

  if (candidate.profiles?.length) {
    for (const p of candidate.profiles) {
      if (p.externalAccountId) {
        const byExt = await db.cbProfile.findFirst({
          where: { platform: p.platform, externalAccountId: p.externalAccountId },
        });
        if (byExt) return byExt.artistId;
      }
      const byUrl = await db.cbProfile.findFirst({
        where: { platform: p.platform, url: p.url },
      });
      if (byUrl) return byUrl.artistId;
    }
  }

  if (candidate.website) {
    const bySite = await db.cbArtist.findFirst({
      where: { website: candidate.website, suppressedAt: null },
    });
    if (bySite) return bySite.id;
  }

  return null;
}

/**
 * Upsert artist using strong identity keys only.
 * Same stage name alone never merges — queues review instead.
 */
export async function resolveOrCreateArtist(
  db: PrismaClient,
  candidate: ArtistCandidate,
  opts?: { runId?: string; preserveOutreach?: boolean }
): Promise<ResolveResult> {
  const strongId = await findArtistByStrongKeys(db, candidate);
  if (strongId) {
    await applyAcceptedUpdates(db, strongId, candidate, opts?.runId);
    return { artistId: strongId, created: false, queuedReview: false };
  }

  const nameNorm = normalizeName(candidate.stageName);
  const sameName = await db.cbArtist.findMany({
    where: {
      suppressedAt: null,
      OR: [
        { stageName: { equals: candidate.stageName, mode: 'insensitive' } },
        { aliases: { some: { alias: { equals: candidate.stageName, mode: 'insensitive' } } } },
      ],
    },
    take: 5,
  });

  const exactStrongCollision = sameName.filter((a) => normalizeName(a.stageName) === nameNorm);

  if (exactStrongCollision.length > 0) {
    // Name-only match → create separate record + review queue (do not merge)
    const created = await createArtistRecord(db, candidate);
    await db.cbReviewQueueItem.create({
      data: {
        artistId: created.id,
        kind: 'ambiguous_identity',
        title: `Possible duplicate name: ${candidate.stageName}`,
        detail: `New artist shares stage name with ${exactStrongCollision.map((a) => a.id).join(', ')} but lacks strong matching keys.`,
        payloadJson: {
          candidateName: candidate.stageName,
          existingArtistIds: exactStrongCollision.map((a) => a.id),
          sourceUrl: candidate.sourceUrl ?? null,
        },
        status: 'needs_review',
      },
    });
    await recordObservation(db, created.id, candidate, opts?.runId);
    return { artistId: created.id, created: true, queuedReview: true };
  }

  const created = await createArtistRecord(db, candidate);
  await recordObservation(db, created.id, candidate, opts?.runId);
  return { artistId: created.id, created: true, queuedReview: false };
}

async function createArtistRecord(db: PrismaClient, candidate: ArtistCandidate) {
  return db.cbArtist.create({
    data: {
      stageName: candidate.stageName.trim(),
      entityType: candidate.entityType ?? 'unknown',
      bio: candidate.bio ?? null,
      genres: candidate.genres ?? [],
      website: candidate.website ?? null,
      hometownCity: candidate.hometownCity ?? null,
      hometownRegion: candidate.hometownRegion ?? null,
      hometownCountry: candidate.hometownCountry ?? null,
      currentCity: candidate.currentCity ?? null,
      currentRegion: candidate.currentRegion ?? null,
      currentCountry: candidate.currentCountry ?? null,
      emergingStatus: candidate.emergingStatus ?? null,
      outreachStatus: 'not_reviewed' as CbOutreachStatus,
      discoveryVisible: false,
      aliases: candidate.stageName
        ? { create: [{ alias: candidate.stageName.trim() }] }
        : undefined,
      profiles: candidate.profiles?.length
        ? {
            create: candidate.profiles.map((p) => ({
              platform: p.platform,
              url: p.url,
              handle: p.handle ?? null,
              externalAccountId: p.externalAccountId ?? null,
            })),
          }
        : undefined,
      externalIds: candidate.externalIds?.length
        ? {
            create: candidate.externalIds.map((e) => ({
              provider: e.provider,
              externalId: e.externalId,
              url: e.url ?? null,
            })),
          }
        : undefined,
    },
  });
}

async function applyAcceptedUpdates(
  db: PrismaClient,
  artistId: string,
  candidate: ArtistCandidate,
  runId?: string
) {
  const artist = await db.cbArtist.findUniqueOrThrow({ where: { id: artistId } });
  if (artist.suppressedAt) return;

  const locked = new Set(artist.adminLockedFields);
  const data: Record<string, unknown> = {};

  const maybeSet = (field: string, value: unknown) => {
    if (value == null || value === '') return;
    if (locked.has(field)) return;
    data[field] = value;
  };

  maybeSet('bio', candidate.bio);
  maybeSet('website', candidate.website);
  maybeSet('entityType', candidate.entityType);
  maybeSet('hometownCity', candidate.hometownCity);
  maybeSet('hometownRegion', candidate.hometownRegion);
  maybeSet('hometownCountry', candidate.hometownCountry);
  maybeSet('currentCity', candidate.currentCity);
  maybeSet('currentRegion', candidate.currentRegion);
  maybeSet('currentCountry', candidate.currentCountry);
  maybeSet('emergingStatus', candidate.emergingStatus);

  if (candidate.genres?.length && !locked.has('genres')) {
    data.genres = Array.from(new Set([...artist.genres, ...candidate.genres]));
  }

  // Never overwrite outreach state on refresh
  if (Object.keys(data).length) {
    await db.cbArtist.update({ where: { id: artistId }, data });
  }

  if (candidate.profiles?.length) {
    for (const p of candidate.profiles) {
      await db.cbProfile.upsert({
        where: {
          artistId_platform_url: { artistId, platform: p.platform, url: p.url },
        },
        create: {
          artistId,
          platform: p.platform,
          url: p.url,
          handle: p.handle ?? null,
          externalAccountId: p.externalAccountId ?? null,
        },
        update: {
          handle: p.handle ?? undefined,
          externalAccountId: p.externalAccountId ?? undefined,
        },
      });
    }
  }

  if (candidate.externalIds?.length) {
    for (const e of candidate.externalIds) {
      const existing = await db.cbExternalId.findUnique({
        where: { provider_externalId: { provider: e.provider, externalId: e.externalId } },
      });
      if (!existing) {
        await db.cbExternalId.create({
          data: {
            artistId,
            provider: e.provider,
            externalId: e.externalId,
            url: e.url ?? null,
          },
        });
      }
    }
  }

  await recordObservation(db, artistId, candidate, runId);
}

async function recordObservation(
  db: PrismaClient,
  artistId: string,
  candidate: ArtistCandidate,
  runId?: string
) {
  await db.cbObservation.create({
    data: {
      artistId,
      field: 'stageName',
      value: candidate.stageName,
      sourceUrl: candidate.sourceUrl ?? null,
      sourceType: candidate.sourceType ?? null,
      excerpt: candidate.excerpt ?? null,
      method: candidate.method ?? 'ingest',
      confidence: candidate.confidence ?? 0.7,
      reviewStatus: 'accepted',
      runId: runId ?? null,
    },
  });
}

export function hashPayload(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

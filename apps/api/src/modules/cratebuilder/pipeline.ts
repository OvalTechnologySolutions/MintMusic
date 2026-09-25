import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { safeFetchText } from './ssrf.js';
import { isUrlAllowedByRobots } from './robots.js';
import { extractFeaturedArtistsFromHtml } from './editorial.js';
import { hashPayload, resolveOrCreateArtist, type ArtistCandidate } from './identity.js';
import {
  enrichFromMusicBrainz,
  enrichFromSpotify,
  enrichFromWikidata,
  getConnectorDefaults,
  syncConnectorStatuses,
} from './connectors.js';
import { exportWorkbookForRun } from './export.js';

export interface PipelineResult {
  runId: string;
  status: string;
  summary: Record<string, unknown>;
}

const USER_AGENT =
  'MintMusic-CrateBuilder/0.1 (+https://mintmusic.ai; outreach research bot)';

async function acquireRunLock(
  db: PrismaClient,
  trigger: string
): Promise<{ runId: string; lockToken: string } | { blocked: true; existingRunId: string }> {
  const existing = await db.cbIngestionRun.findFirst({
    where: { status: 'running' },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    return { blocked: true, existingRunId: existing.id };
  }
  const lockToken = randomUUID();
  const run = await db.cbIngestionRun.create({
    data: {
      status: 'running',
      trigger,
      lockToken,
      startedAt: new Date(),
      scheduledFor: trigger === 'scheduled' ? new Date() : null,
    },
  });
  return { runId: run.id, lockToken };
}

function mergeCandidate(
  base: ArtistCandidate,
  extra: Partial<ArtistCandidate> | null
): ArtistCandidate {
  if (!extra) return base;
  return {
    ...base,
    ...extra,
    stageName: base.stageName,
    genres: Array.from(new Set([...(base.genres ?? []), ...(extra.genres ?? [])])),
    profiles: [...(base.profiles ?? []), ...(extra.profiles ?? [])],
    externalIds: [...(base.externalIds ?? []), ...(extra.externalIds ?? [])],
    bio: base.bio || extra.bio,
    website: base.website || extra.website,
  };
}

async function enrichCandidate(candidate: ArtistCandidate): Promise<{
  candidate: ArtistCandidate;
  connectorNotes: string[];
}> {
  const notes: string[] = [];
  let current = candidate;
  const defaults = getConnectorDefaults();
  const enabled = new Set(defaults.filter((c) => c.enabled).map((c) => c.id));

  if (enabled.has('musicbrainz')) {
    try {
      const mb = await enrichFromMusicBrainz(candidate.stageName);
      if (mb) current = mergeCandidate(current, mb);
      else notes.push('musicbrainz:no_match');
    } catch (err) {
      notes.push(`musicbrainz:error:${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    notes.push('musicbrainz:skipped_disabled');
  }

  if (enabled.has('wikidata')) {
    try {
      const wd = await enrichFromWikidata(candidate.stageName);
      if (wd) current = mergeCandidate(current, wd);
    } catch (err) {
      notes.push(`wikidata:error:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (enabled.has('spotify')) {
    try {
      const sp = await enrichFromSpotify(candidate.stageName);
      if (sp) current = mergeCandidate(current, sp);
    } catch (err) {
      notes.push(`spotify:error:${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    notes.push('spotify:skipped_disabled');
  }

  return { candidate: current, connectorNotes: notes };
}

export async function runCrateBuilderPipeline(
  db: PrismaClient,
  opts?: { trigger?: string; sourceIds?: string[]; skipExport?: boolean }
): Promise<PipelineResult> {
  const trigger = opts?.trigger ?? 'manual';
  await syncConnectorStatuses(db);

  const lock = await acquireRunLock(db, trigger);
  if ('blocked' in lock) {
    return {
      runId: lock.existingRunId,
      status: 'blocked',
      summary: { error: 'Another run is already in progress', existingRunId: lock.existingRunId },
    };
  }

  const { runId } = lock;
  const summary: Record<string, unknown> = {
    artistsCreated: 0,
    artistsUpdated: 0,
    reviewQueued: 0,
    sourcesProcessed: 0,
    sourcesFailed: 0,
    urlsVisited: 0,
    connectorFailures: [] as string[],
    coverageNotes: [] as string[],
    disabledConnectors: getConnectorDefaults()
      .filter((c) => !c.enabled)
      .map((c) => ({ id: c.id, reason: c.reason })),
  };

  let partialFailure = false;

  try {
    const sources = await db.cbSource.findMany({
      where: {
        enabled: true,
        ...(opts?.sourceIds?.length ? { id: { in: opts.sourceIds } } : {}),
      },
    });

    const domainLastFetch = new Map<string, number>();
    let urlBudget = env.CRATEBUILDER_TOTAL_URL_BUDGET;

    for (const source of sources) {
      const connector = getConnectorDefaults().find((c) => c.id === source.connectorId);
      if (connector && !connector.enabled) {
        partialFailure = true;
        (summary.connectorFailures as string[]).push(
          `${source.connectorId}:disabled:${connector.reason}`
        );
        (summary.coverageNotes as string[]).push(
          `source:${source.id}:skipped_disabled_connector:${source.connectorId}`
        );
        continue;
      }

      if (source.connectorId === 'tiktok' || source.type === 'social_account') {
        if (source.connectorId !== 'editorial_html' && source.connectorId !== 'manual_import') {
          partialFailure = true;
          (summary.connectorFailures as string[]).push(
            `${source.connectorId}:unavailable_for_source:${source.id}`
          );
          (summary.coverageNotes as string[]).push(
            `source:${source.name}:requires_manual_import_while_connector_disabled`
          );
          continue;
        }
      }

      if (!source.url || source.type !== 'editorial_url') {
        if (source.connectorId === 'manual_import') continue;
        (summary.coverageNotes as string[]).push(`source:${source.id}:no_editorial_url`);
        continue;
      }

      try {
        const robots = await isUrlAllowedByRobots(source.url, USER_AGENT);
        if (!robots.allowed) {
          partialFailure = true;
          (summary.coverageNotes as string[]).push(
            `source:${source.id}:robots_blocked:${robots.reason}`
          );
          summary.sourcesFailed = Number(summary.sourcesFailed) + 1;
          continue;
        }

        const host = new URL(source.url).hostname;
        const last = domainLastFetch.get(host) ?? 0;
        const wait = env.CRATEBUILDER_DOMAIN_DELAY_MS - (Date.now() - last);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));

        if (urlBudget <= 0) {
          (summary.coverageNotes as string[]).push('total_url_budget_exhausted');
          partialFailure = true;
          break;
        }

        const fetched = await safeFetchText(source.url, { userAgent: USER_AGENT });
        domainLastFetch.set(host, Date.now());
        urlBudget -= 1;
        summary.urlsVisited = Number(summary.urlsVisited) + 1;

        await db.cbVisitedUrl.create({
          data: { runId, url: fetched.finalUrl, hopDepth: 0, status: 'ok' },
        });

        const payloadHash = hashPayload(fetched.body);
        await db.cbSourceItem.upsert({
          where: {
            sourceId_externalKey: {
              sourceId: source.id,
              externalKey: 'page',
            },
          },
          create: {
            sourceId: source.id,
            runId,
            externalKey: 'page',
            title: null,
            url: fetched.finalUrl,
            payloadHash,
            rawExcerpt: fetched.body.slice(0, 2000),
          },
          update: {
            runId,
            url: fetched.finalUrl,
            payloadHash,
            rawExcerpt: fetched.body.slice(0, 2000),
          },
        });

        const extracted = extractFeaturedArtistsFromHtml(fetched.body, fetched.finalUrl);
        (summary.coverageNotes as string[]).push(
          ...extracted.coverageNotes.map((n) => `${source.name}:${n}`)
        );

        if (extracted.publicationDate && !source.publicationDate) {
          await db.cbSource.update({
            where: { id: source.id },
            data: { publicationDate: extracted.publicationDate },
          });
        }

        await db.cbSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date() },
        });

        // Bounded hop: follow artist website / profile links up to max hops
        const queue: Array<{ url: string; depth: number; parentName?: string }> = [];
        for (const a of extracted.artists.slice(0, env.CRATEBUILDER_PER_ARTIST_URL_LIMIT)) {
          for (const p of a.profiles ?? []) {
            queue.push({ url: p.url, depth: 1, parentName: a.stageName });
          }
          if (a.website) queue.push({ url: a.website, depth: 1, parentName: a.stageName });
        }

        for (const artist of extracted.artists) {
          const { candidate, connectorNotes } = await enrichCandidate(artist);
          (summary.coverageNotes as string[]).push(
            ...connectorNotes.map((n) => `${artist.stageName}:${n}`)
          );
          const resolved = await resolveOrCreateArtist(db, candidate, { runId });
          if (resolved.created) summary.artistsCreated = Number(summary.artistsCreated) + 1;
          else summary.artistsUpdated = Number(summary.artistsUpdated) + 1;
          if (resolved.queuedReview) summary.reviewQueued = Number(summary.reviewQueued) + 1;
        }

        // Limited hop traversal for link-in-bio / websites (contact extraction only from explicit mailto)
        let perArtistUrls = 0;
        while (queue.length && urlBudget > 0 && perArtistUrls < env.CRATEBUILDER_PER_ARTIST_URL_LIMIT) {
          const next = queue.shift()!;
          if (next.depth > env.CRATEBUILDER_MAX_HOPS) continue;
          const visited = await db.cbVisitedUrl.findUnique({
            where: { runId_url: { runId, url: next.url } },
          });
          if (visited) continue;

          try {
            const hopRobots = await isUrlAllowedByRobots(next.url, USER_AGENT);
            if (!hopRobots.allowed) {
              await db.cbVisitedUrl.create({
                data: {
                  runId,
                  url: next.url,
                  hopDepth: next.depth,
                  status: 'robots_blocked',
                },
              });
              continue;
            }
            const hopHost = new URL(next.url).hostname;
            const hopLast = domainLastFetch.get(hopHost) ?? 0;
            const hopWait = env.CRATEBUILDER_DOMAIN_DELAY_MS - (Date.now() - hopLast);
            if (hopWait > 0) await new Promise((r) => setTimeout(r, hopWait));

            const page = await safeFetchText(next.url, { userAgent: USER_AGENT });
            domainLastFetch.set(hopHost, Date.now());
            urlBudget -= 1;
            perArtistUrls += 1;
            summary.urlsVisited = Number(summary.urlsVisited) + 1;

            await db.cbVisitedUrl.create({
              data: { runId, url: page.finalUrl, hopDepth: next.depth, status: 'ok' },
            });

            // Explicit professional mailto / booking patterns only
            const mailtoMatches = [
              ...page.body.matchAll(
                /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
              ),
            ];
            const bookingMatches = [
              ...page.body.matchAll(
                /\b((?:booking|management|inquiries|press|info)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi
              ),
            ];

            if (next.parentName && (mailtoMatches.length || bookingMatches.length)) {
              const artist = await db.cbArtist.findFirst({
                where: {
                  stageName: { equals: next.parentName, mode: 'insensitive' },
                  suppressedAt: null,
                },
              });
              if (artist) {
                const emails = new Set<string>();
                for (const m of mailtoMatches) emails.add(m[1]!.toLowerCase());
                for (const m of bookingMatches) emails.add(m[1]!.toLowerCase());
                for (const email of emails) {
                  const kind = email.startsWith('booking@')
                    ? 'booking'
                    : email.startsWith('management@') || email.startsWith('mgmt@')
                      ? 'management'
                      : 'inquiries';
                  const suppressed = await db.cbContact.findFirst({
                    where: { artistId: artist.id, value: email, suppressed: true },
                  });
                  if (suppressed) continue;
                  const existing = await db.cbContact.findFirst({
                    where: { artistId: artist.id, value: email },
                  });
                  if (!existing) {
                    await db.cbContact.create({
                      data: {
                        artistId: artist.id,
                        kind,
                        value: email,
                        verified: false,
                      },
                    });
                    await db.cbObservation.create({
                      data: {
                        artistId: artist.id,
                        field: 'contact_email',
                        value: email,
                        sourceUrl: page.finalUrl,
                        sourceType: 'link_hop',
                        excerpt: email,
                        method: 'explicit_mailto_or_booking_pattern',
                        confidence: 0.8,
                        reviewStatus: 'pending',
                        runId,
                      },
                    });
                  }
                }
              }
            }

            // Queue further hops from page links (bounded)
            if (next.depth < env.CRATEBUILDER_MAX_HOPS) {
              const hrefs = [...page.body.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
                .map((m) => m[1]!)
                .slice(0, 5);
              for (const href of hrefs) {
                queue.push({ url: href, depth: next.depth + 1, parentName: next.parentName });
              }
            }
          } catch (err) {
            await db.cbVisitedUrl.create({
              data: {
                runId,
                url: next.url,
                hopDepth: next.depth,
                status: `error:${err instanceof Error ? err.message.slice(0, 80) : 'unknown'}`,
              },
            });
          }
        }

        summary.sourcesProcessed = Number(summary.sourcesProcessed) + 1;
        await db.cbIngestionRun.update({
          where: { id: runId },
          data: {
            checkpointJson: {
              lastSourceId: source.id,
              urlBudgetRemaining: urlBudget,
            },
          },
        });
      } catch (err) {
        partialFailure = true;
        summary.sourcesFailed = Number(summary.sourcesFailed) + 1;
        (summary.connectorFailures as string[]).push(
          `editorial:${source.id}:${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Record disabled social seed coverage
    (summary.coverageNotes as string[]).push(
      'tiktok_on_the_radar:not_fetched_connector_disabled_use_manual_import'
    );

    const status = partialFailure ? 'completed_partial' : 'completed';
    await db.cbIngestionRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        partialFailure,
        summaryJson: summary as object,
        coverageNotes: (summary.coverageNotes as string[]).join('\n'),
        lockToken: null,
      },
    });

    if (!opts?.skipExport) {
      try {
        const exp = await exportWorkbookForRun(db, runId, { partial: partialFailure });
        summary.exportId = exp.id;
        summary.exportFilename = exp.filename;
      } catch (err) {
        partialFailure = true;
        (summary.coverageNotes as string[]).push(
          `export_failed:${err instanceof Error ? err.message : String(err)}`
        );
        await db.cbIngestionRun.update({
          where: { id: runId },
          data: {
            status: 'completed_partial',
            partialFailure: true,
            summaryJson: summary as object,
            coverageNotes: (summary.coverageNotes as string[]).join('\n'),
          },
        });
      }
    }

    return { runId, status: partialFailure ? 'completed_partial' : 'completed', summary };
  } catch (err) {
    await db.cbIngestionRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
        summaryJson: summary as object,
        lockToken: null,
      },
    });
    throw err;
  }
}

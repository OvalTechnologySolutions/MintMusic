import type { PrismaClient } from '@prisma/client';
import type { CbImportArtistRow } from '@mintmusic/shared';
import { resolveOrCreateArtist, type ArtistCandidate } from './identity.js';

export interface ImportResult {
  created: number;
  updated: number;
  queuedReview: number;
  errors: string[];
}

export async function importArtistRows(
  db: PrismaClient,
  rows: CbImportArtistRow[],
  opts?: { runId?: string }
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, queuedReview: 0, errors: [] };

  for (const [i, row] of rows.entries()) {
    try {
      if (!row.stageName?.trim()) {
        result.errors.push(`row ${i}: missing stageName`);
        continue;
      }
      const candidate: ArtistCandidate = {
        stageName: row.stageName.trim(),
        entityType: row.entityType ?? 'unknown',
        bio: row.bio ?? null,
        genres: row.genres ?? [],
        website: row.website ?? null,
        profiles: row.profiles,
        sourceUrl: row.sourceUrl ?? null,
        sourceType: 'manual',
        method: 'manual_import',
        confidence: 0.9,
      };
      const resolved = await resolveOrCreateArtist(db, candidate, { runId: opts?.runId });

      if (row.contacts?.length) {
        for (const c of row.contacts) {
          // Only store explicitly provided professional contacts; never infer
          const existing = await db.cbContact.findFirst({
            where: {
              artistId: resolved.artistId,
              kind: c.kind,
              value: c.value,
              suppressed: false,
            },
          });
          if (!existing) {
            // Check suppression: do not reintroduce suppressed values for this artist
            const suppressed = await db.cbContact.findFirst({
              where: {
                artistId: resolved.artistId,
                value: c.value,
                suppressed: true,
              },
            });
            if (suppressed) continue;
            await db.cbContact.create({
              data: {
                artistId: resolved.artistId,
                kind: c.kind,
                value: c.value,
                role: c.role ?? null,
                representativeName: c.representativeName ?? null,
                organization: c.organization ?? null,
                verified: false,
              },
            });
          }
        }
      }

      if (resolved.created) result.created += 1;
      else result.updated += 1;
      if (resolved.queuedReview) result.queuedReview += 1;
    } catch (err) {
      result.errors.push(`row ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/** Minimal CSV: stageName,website,genres,instagram,spotify,bookingEmail */
export function parseSimpleCsv(text: string): CbImportArtistRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const rows: CbImportArtistRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const get = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? cols[idx]?.trim() || undefined : undefined;
    };
    const stageName = get('stagename') || get('stage_name') || get('name') || get('artist');
    if (!stageName) continue;
    const genres = get('genres')?.split(/[|;]/).map((g) => g.trim()).filter(Boolean);
    const profiles: CbImportArtistRow['profiles'] = [];
    for (const platform of [
      'instagram',
      'tiktok',
      'spotify',
      'youtube',
      'soundcloud',
      'bandcamp',
      'x',
      'website',
    ] as const) {
      const url = get(platform);
      if (url) profiles.push({ platform: platform === 'website' ? 'website' : platform, url });
    }
    const contacts: CbImportArtistRow['contacts'] = [];
    const booking = get('bookingemail') || get('booking_email');
    if (booking) contacts.push({ kind: 'booking', value: booking });
    const mgmt = get('managementemail') || get('management_email');
    if (mgmt) contacts.push({ kind: 'management', value: mgmt });
    const inquiries = get('email') || get('inquiries_email');
    if (inquiries) contacts.push({ kind: 'inquiries', value: inquiries });

    rows.push({
      stageName,
      website: get('website'),
      genres,
      profiles: profiles.length ? profiles : undefined,
      contacts: contacts.length ? contacts : undefined,
      sourceUrl: get('sourceurl') || get('source_url'),
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

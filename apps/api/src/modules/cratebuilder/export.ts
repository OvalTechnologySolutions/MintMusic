import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';
import { env, isStorageConfigured } from '../../config/env.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Prevent spreadsheet formula injection. */
export function sanitizeCell(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const s = String(value);
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
}

function sheetDate(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function putObject(storageKey: string, body: Buffer, contentType: string): Promise<void> {
  if (isStorageConfigured()) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }

  // Local fallback for Cloud Agent / dev without S3
  // import.meta.url is .../modules/cratebuilder/export.ts → ../../.. = apps/api
  const apiRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const localPath = join(apiRoot, 'data', 'cratebuilder-exports', storageKey.replace(/\//g, '__'));
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, body);
}

export async function createPresignedDownloadUrl(storageKey: string): Promise<string | null> {
  if (!isStorageConfigured()) {
    return null;
  }
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey }),
    { expiresIn: 900 }
  );
}

export async function readExportBuffer(
  storageKey: string
): Promise<Buffer | null> {
  if (isStorageConfigured()) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    const out = await client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: storageKey })
    );
    const bytes = await out.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  }
  const apiRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const localPath = join(apiRoot, 'data', 'cratebuilder-exports', storageKey.replace(/\//g, '__'));
  try {
    const { readFile } = await import('node:fs/promises');
    return await readFile(localPath);
  } catch {
    return null;
  }
}

export async function exportWorkbookForRun(
  db: PrismaClient,
  runId: string,
  opts?: { partial?: boolean }
): Promise<{ id: string; filename: string; storageKey: string; complete: boolean }> {
  const run = await db.cbIngestionRun.findUnique({ where: { id: runId } });
  const artists = await db.cbArtist.findMany({
    where: { suppressedAt: null },
    include: {
      profiles: true,
      contacts: true,
      aliases: true,
      preferredContact: true,
      observations: { take: 50, orderBy: { retrievedAt: 'desc' } },
    },
    orderBy: { stageName: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MintMusic CrateBuilder';
  workbook.created = new Date();

  const artistsSheet = workbook.addWorksheet('Artists');
  artistsSheet.columns = [
    { header: 'Artist ID', key: 'id', width: 28 },
    { header: 'Stage Name', key: 'stageName', width: 28 },
    { header: 'Entity Type', key: 'entityType', width: 12 },
    { header: 'Genres', key: 'genres', width: 28 },
    { header: 'Bio', key: 'bio', width: 40 },
    { header: 'Current City', key: 'currentCity', width: 16 },
    { header: 'Current Region', key: 'currentRegion', width: 16 },
    { header: 'Current Country', key: 'currentCountry', width: 14 },
    { header: 'Hometown City', key: 'hometownCity', width: 16 },
    { header: 'Website', key: 'website', width: 32 },
    { header: 'Preferred Contact', key: 'preferredContact', width: 28 },
    { header: 'Outreach Status', key: 'outreachStatus', width: 16 },
    { header: 'Discovery Visible', key: 'discoveryVisible', width: 14 },
    { header: 'First Discovered', key: 'firstDiscoveredAt', width: 22 },
    { header: 'Verification Notes', key: 'verification', width: 24 },
  ];
  artistsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  artistsSheet.autoFilter = { from: 'A1', to: 'O1' };

  for (const a of artists) {
    const row = artistsSheet.addRow({
      id: sanitizeCell(a.id),
      stageName: sanitizeCell(a.stageName),
      entityType: sanitizeCell(a.entityType),
      genres: sanitizeCell(a.genres.join(', ')),
      bio: sanitizeCell(a.bio),
      currentCity: sanitizeCell(a.currentCity),
      currentRegion: sanitizeCell(a.currentRegion),
      currentCountry: sanitizeCell(a.currentCountry),
      hometownCity: sanitizeCell(a.hometownCity),
      website: sanitizeCell(a.website),
      preferredContact: sanitizeCell(a.preferredContact?.value ?? ''),
      outreachStatus: sanitizeCell(a.outreachStatus),
      discoveryVisible: a.discoveryVisible,
      firstDiscoveredAt: sanitizeCell(a.firstDiscoveredAt.toISOString()),
      verification: sanitizeCell(
        a.contacts.some((c) => c.verified) ? 'has_verified_contact' : 'unverified'
      ),
    });
    // Force text for IDs
    row.getCell('id').numFmt = '@';
    if (a.website) {
      row.getCell('website').value = {
        text: a.website,
        hyperlink: a.website,
      };
    }
  }

  const profilesSheet = workbook.addWorksheet('Profiles');
  profilesSheet.columns = [
    { header: 'Artist ID', key: 'artistId', width: 28 },
    { header: 'Platform', key: 'platform', width: 14 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Handle', key: 'handle', width: 18 },
    { header: 'External Account ID', key: 'externalAccountId', width: 24 },
    { header: 'Verified', key: 'verified', width: 10 },
  ];
  profilesSheet.views = [{ state: 'frozen', ySplit: 1 }];
  profilesSheet.autoFilter = { from: 'A1', to: 'F1' };

  for (const a of artists) {
    for (const p of a.profiles) {
      const row = profilesSheet.addRow({
        artistId: sanitizeCell(a.id),
        platform: sanitizeCell(p.platform),
        url: sanitizeCell(p.url),
        handle: sanitizeCell(p.handle),
        externalAccountId: sanitizeCell(p.externalAccountId),
        verified: p.verified,
      });
      row.getCell('artistId').numFmt = '@';
      row.getCell('externalAccountId').numFmt = '@';
      row.getCell('url').value = { text: p.url, hyperlink: p.url };
    }
  }

  const contactsSheet = workbook.addWorksheet('Contacts');
  contactsSheet.columns = [
    { header: 'Artist ID', key: 'artistId', width: 28 },
    { header: 'Kind', key: 'kind', width: 14 },
    { header: 'Value', key: 'value', width: 32 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Representative', key: 'representativeName', width: 22 },
    { header: 'Organization', key: 'organization', width: 22 },
    { header: 'Verified', key: 'verified', width: 10 },
    { header: 'Preferred', key: 'preferred', width: 10 },
    { header: 'Suppressed', key: 'suppressed', width: 12 },
  ];
  contactsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  contactsSheet.autoFilter = { from: 'A1', to: 'I1' };

  for (const a of artists) {
    for (const c of a.contacts) {
      const row = contactsSheet.addRow({
        artistId: sanitizeCell(a.id),
        kind: sanitizeCell(c.kind),
        value: sanitizeCell(c.value),
        role: sanitizeCell(c.role),
        representativeName: sanitizeCell(c.representativeName),
        organization: sanitizeCell(c.organization),
        verified: c.verified,
        preferred: c.preferred,
        suppressed: c.suppressed,
      });
      row.getCell('artistId').numFmt = '@';
      row.getCell('value').numFmt = '@';
    }
  }

  const evidenceSheet = workbook.addWorksheet('Evidence');
  evidenceSheet.columns = [
    { header: 'Artist ID', key: 'artistId', width: 28 },
    { header: 'Field', key: 'field', width: 18 },
    { header: 'Value', key: 'value', width: 32 },
    { header: 'Source URL', key: 'sourceUrl', width: 36 },
    { header: 'Source Type', key: 'sourceType', width: 16 },
    { header: 'Retrieved At', key: 'retrievedAt', width: 22 },
    { header: 'Method', key: 'method', width: 24 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Review Status', key: 'reviewStatus', width: 14 },
    { header: 'Excerpt', key: 'excerpt', width: 40 },
  ];
  evidenceSheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const a of artists) {
    for (const o of a.observations) {
      evidenceSheet.addRow({
        artistId: sanitizeCell(a.id),
        field: sanitizeCell(o.field),
        value: sanitizeCell(o.value),
        sourceUrl: sanitizeCell(o.sourceUrl),
        sourceType: sanitizeCell(o.sourceType),
        retrievedAt: sanitizeCell(o.retrievedAt.toISOString()),
        method: sanitizeCell(o.method),
        confidence: o.confidence,
        reviewStatus: sanitizeCell(o.reviewStatus),
        excerpt: sanitizeCell(o.excerpt),
      });
    }
  }

  const runSheet = workbook.addWorksheet('Run Summary');
  runSheet.columns = [
    { header: 'Key', key: 'key', width: 28 },
    { header: 'Value', key: 'value', width: 80 },
  ];
  const summaryRows: Array<[string, unknown]> = [
    ['Run ID', runId],
    ['Status', run?.status ?? 'unknown'],
    ['Partial', opts?.partial ?? run?.partialFailure ?? false],
    ['Trigger', run?.trigger ?? ''],
    ['Started At', run?.startedAt?.toISOString() ?? ''],
    ['Completed At', run?.completedAt?.toISOString() ?? ''],
    ['Coverage Notes', run?.coverageNotes ?? ''],
    ['Summary JSON', JSON.stringify(run?.summaryJson ?? {})],
    ['Export Label', opts?.partial ? 'PARTIAL_RUN' : 'COMPLETE'],
    ['Artist Count', artists.length],
    ['Generated At (UTC)', new Date().toISOString()],
    ['Schedule Note', 'Daily job targets 17:00 UTC (fixed EST UTC-05); export completes after processing'],
  ];
  for (const [key, value] of summaryRows) {
    runSheet.addRow({ key: sanitizeCell(key), value: sanitizeCell(value) });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const dateStr = sheetDate();
  const filename = `mintmusic_cratebuilder_${dateStr}.xlsx`;
  const storageKey = `cratebuilder/exports/${filename}`;
  await putObject(
    storageKey,
    buffer,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  const complete = !(opts?.partial ?? run?.partialFailure ?? false);

  // Only flip latest pointer after successful file creation
  await db.$transaction(async (tx) => {
    await tx.cbExport.updateMany({
      where: { isLatest: true },
      data: { isLatest: false },
    });
    await tx.cbExport.create({
      data: {
        runId,
        filename,
        storageKey,
        exportDate: new Date(`${dateStr}T00:00:00.000Z`),
        complete,
        isLatest: true,
        byteSize: buffer.byteLength,
      },
    });
  });

  const created = await db.cbExport.findFirstOrThrow({
    where: { storageKey, isLatest: true },
  });

  return {
    id: created.id,
    filename,
    storageKey,
    complete,
  };
}

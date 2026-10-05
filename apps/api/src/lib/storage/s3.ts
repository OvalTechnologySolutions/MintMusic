import { randomUUID } from 'node:crypto';
import { env, isStorageConfigured } from '../../config/env.js';
import { NotFoundError, ServiceUnavailableError } from '../errors.js';
import type { MediaFormat } from '@mintmusic/shared';
import { ALLOWED_MEDIA_MIME } from '@mintmusic/shared';
import type { Readable } from 'node:stream';

export function mimeToFormat(mimeType: string): MediaFormat | null {
  for (const [format, mimes] of Object.entries(ALLOWED_MEDIA_MIME) as [
    MediaFormat,
    string[],
  ][]) {
    if (mimes.includes(mimeType)) return format;
  }
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType.startsWith('audio/')) {
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
  }
  return null;
}

export interface PresignedUpload {
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/**
 * Returns a presigned PUT URL for direct client → object storage upload.
 * Configure S3-compatible storage (AWS S3, Cloudflare R2, MinIO).
 */
async function getS3Client() {
  if (!isStorageConfigured()) {
    throw new ServiceUnavailableError(
      'Object storage is not configured (S3_BUCKET, keys)'
    );
  }
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  });
}

export async function createPresignedUpload(
  creatorId: string,
  filename: string,
  mimeType: string,
  byteSize: number
): Promise<PresignedUpload> {
  if (byteSize > env.MEDIA_MAX_BYTES) {
    throw new Error(`File exceeds max size of ${env.MEDIA_MAX_BYTES} bytes`);
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  const storageKey = `uploads/${creatorId}/${randomUUID()}.${ext}`;

  // Dynamic import keeps dev usable without AWS creds until configured
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = await getS3Client();

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: byteSize,
  });

  const expiresInSeconds = 3600;
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return { storageKey, uploadUrl, expiresInSeconds };
}

export function getPublicStreamUrl(storageKey: string): string {
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/$/, '')}/${storageKey}`;
  }
  return `/v1/stream/${encodeURIComponent(storageKey)}`;
}

export interface StoredObjectStream {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

/** Stream a private object. Used by token-gated GET /v1/stream. */
export async function streamStoredObject(
  storageKey: string
): Promise<StoredObjectStream> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  let out;
  try {
    out = await client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: storageKey,
      })
    );
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'NoSuchKey' || name === 'NotFound') {
      throw new NotFoundError('Media not found');
    }
    throw err;
  }

  if (!out.Body) throw new NotFoundError('Media not found');

  const body = out.Body as Readable;
  return {
    body,
    contentType: out.ContentType,
    contentLength:
      typeof out.ContentLength === 'number' ? out.ContentLength : undefined,
  };
}

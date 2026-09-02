import { randomUUID } from 'node:crypto';
import { env, isStorageConfigured } from '../../config/env.js';
import { ServiceUnavailableError } from '../errors.js';
import type { MediaFormat } from '@mintmusic/shared';
import { ALLOWED_MEDIA_MIME } from '@mintmusic/shared';

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
export async function createPresignedUpload(
  creatorId: string,
  filename: string,
  mimeType: string,
  byteSize: number
): Promise<PresignedUpload> {
  if (!isStorageConfigured()) {
    throw new ServiceUnavailableError(
      'Object storage is not configured (S3_BUCKET, keys)'
    );
  }
  if (byteSize > env.MEDIA_MAX_BYTES) {
    throw new Error(`File exceeds max size of ${env.MEDIA_MAX_BYTES} bytes`);
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  const storageKey = `uploads/${creatorId}/${randomUUID()}.${ext}`;

  // Dynamic import keeps dev usable without AWS creds until configured
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  });

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

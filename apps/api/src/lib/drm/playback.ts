import type { DrmSystem } from '@mintmusic/shared';
import { env } from '../../config/env.js';
import { ServiceUnavailableError } from '../errors.js';
import { getPublicStreamUrl } from '../storage/s3.js';

export interface DrmAssetManifest {
  contentKeyId?: string | null;
  hlsManifestKey?: string | null;
  dashManifestKey?: string | null;
  widevineReady: boolean;
  fairplayReady: boolean;
  mimeType: string;
}

export interface DrmPlaybackUrls {
  manifestUrl: string;
  licenseUrl: string;
  fairplayCertificateUrl?: string;
  contentId: string;
  drmSystem: DrmSystem;
  mimeType: string;
}

export function isDrmConfigured(): boolean {
  return Boolean(
    env.DRM_LICENSE_SERVER_URL ||
      (env.DRM_WIDEVINE_LA_URL && env.DRM_FAIRPLAY_LA_URL)
  );
}

export function contentIdForAsset(mediaAssetId: string): string {
  const prefix = env.DRM_CONTENT_ID_PREFIX ?? 'mintmusic';
  return `${prefix}:${mediaAssetId}`;
}

/** Build manifest + license URLs for owned playback */
export function buildDrmPlaybackUrls(
  asset: DrmAssetManifest,
  mediaAssetId: string,
  playbackToken: string,
  drmSystem: DrmSystem
): DrmPlaybackUrls {
  const contentId = asset.contentKeyId ?? contentIdForAsset(mediaAssetId);

  if (drmSystem === 'widevine') {
    if (!asset.widevineReady || !asset.dashManifestKey) {
      throw new ServiceUnavailableError(
        'Widevine packaging not ready for this asset'
      );
    }
    const licenseUrl = buildLicenseUrl('widevine', playbackToken, contentId);
    return {
      manifestUrl: getPublicStreamUrl(asset.dashManifestKey),
      licenseUrl,
      contentId,
      drmSystem,
      mimeType: 'application/dash+xml',
    };
  }

  if (!asset.fairplayReady || !asset.hlsManifestKey) {
    throw new ServiceUnavailableError(
      'FairPlay packaging not ready for this asset'
    );
  }
  const licenseUrl = buildLicenseUrl('fairplay', playbackToken, contentId);
  return {
    manifestUrl: getPublicStreamUrl(asset.hlsManifestKey),
    licenseUrl,
    fairplayCertificateUrl: env.DRM_FAIRPLAY_CERTIFICATE_URL,
    contentId,
    drmSystem,
    mimeType: 'application/vnd.apple.mpegurl',
  };
}

function buildLicenseUrl(
  system: DrmSystem,
  playbackToken: string,
  contentId: string
): string {
  const base =
    system === 'widevine'
      ? env.DRM_WIDEVINE_LA_URL ?? env.DRM_LICENSE_SERVER_URL
      : env.DRM_FAIRPLAY_LA_URL ?? env.DRM_LICENSE_SERVER_URL;

  if (!base) {
    throw new ServiceUnavailableError(
      'DRM license server URLs are not configured'
    );
  }

  const params = new URLSearchParams({
    token: playbackToken,
    contentId,
    system,
  });
  return `${base.replace(/\/$/, '')}?${params}`;
}

/** Queue multi-DRM packaging (Widevine + FairPlay) after upload completes */
export async function enqueueDrmPackaging(
  mediaAssetId: string
): Promise<{ jobId: string; status: string }> {
  const { getPrisma } = await import('../prisma.js');
  const db = await getPrisma();

  const job = await db.drmPackagingJob.create({
    data: {
      mediaAssetId,
      status: 'queued',
      provider: env.DRM_PROVIDER ?? 'aws_mediaconvert',
    },
  });

  await db.mediaAsset.update({
    where: { id: mediaAssetId },
    data: { drmStatus: 'queued' },
  });

  // Worker picks up queued jobs when REDIS_URL is set
  if (env.REDIS_URL) {
    const { enqueueJob } = await import('../../workers/queue.js');
    await enqueueJob('drm-package', { mediaAssetId, jobId: job.id });
  }

  return { jobId: job.id, status: 'queued' };
}

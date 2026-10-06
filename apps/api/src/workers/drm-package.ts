import { env } from '../config/env.js';
import { getPrisma } from '../lib/prisma.js';

/**
 * DRM packaging is not wired to MediaConvert/Shaka yet.
 * The previous stub wrote drmStatus=ready with placeholder HLS/DASH keys.
 * playback-token then preferred those URLs over the source file, so a paid
 * listener got 404 manifests instead of playable audio.
 */
export function drmPackageJobOutcome(provider: string | undefined): {
  asset: {
    drmStatus: 'failed';
    widevineReady: false;
    fairplayReady: false;
  };
  job: {
    status: 'failed';
    errorMessage: string;
  };
} {
  const name = provider ?? 'none';
  return {
    asset: {
      drmStatus: 'failed',
      widevineReady: false,
      fairplayReady: false,
    },
    job: {
      status: 'failed',
      errorMessage: `DRM packaging is not implemented for provider "${name}". Paid playback uses the source upload until a packager is wired.`,
    },
  };
}

export async function processDrmPackage(data: {
  mediaAssetId: string;
  jobId: string;
}): Promise<void> {
  const db = await getPrisma();
  await db.drmPackagingJob.update({
    where: { id: data.jobId },
    data: { status: 'packaging' },
  });
  await db.mediaAsset.update({
    where: { id: data.mediaAssetId },
    data: { drmStatus: 'packaging' },
  });

  console.info(
    `[drm-package] packaging not implemented for ${data.mediaAssetId} via ${env.DRM_PROVIDER ?? 'aws_mediaconvert'}`
  );

  const outcome = drmPackageJobOutcome(env.DRM_PROVIDER);
  await db.mediaAsset.update({
    where: { id: data.mediaAssetId },
    data: outcome.asset,
  });
  await db.drmPackagingJob.update({
    where: { id: data.jobId },
    data: { ...outcome.job, completedAt: new Date() },
  });
}

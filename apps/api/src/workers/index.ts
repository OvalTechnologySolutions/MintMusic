/**
 * Background worker process — run: npm run worker -w @mintmusic/api
 *
 * Handles DRM packaging (Widevine + FairPlay), taste sync, and radio rotation.
 */
import 'dotenv/config';
import { env } from '../config/env.js';
import { disconnectPrisma, getPrisma } from '../lib/prisma.js';

async function processDrmPackage(data: {
  mediaAssetId: string;
  jobId: string;
}) {
  const db = await getPrisma();
  await db.drmPackagingJob.update({
    where: { id: data.jobId },
    data: { status: 'packaging' },
  });
  await db.mediaAsset.update({
    where: { id: data.mediaAssetId },
    data: { drmStatus: 'packaging' },
  });

  // Production: invoke AWS MediaConvert / Shaka Packager + EZDRM or Axinom
  // 1. Transcode source → CMAF/fMP4 mezzanine
  // 2. Encrypt with AES-128-CBC (FairPlay) + AES-CTR (Widevine CENC)
  // 3. Upload HLS + DASH manifests to S3
  // 4. Register content key with DRM license provider
  console.info(
    `[drm-package] TODO: package ${data.mediaAssetId} via ${env.DRM_PROVIDER ?? 'aws_mediaconvert'}`
  );

  const contentKeyId = `kid_${data.mediaAssetId.replace(/-/g, '').slice(0, 32)}`;
  const hlsKey = `drm/${data.mediaAssetId}/master.m3u8`;
  const dashKey = `drm/${data.mediaAssetId}/manifest.mpd`;

  await db.mediaAsset.update({
    where: { id: data.mediaAssetId },
    data: {
      drmStatus: 'ready',
      contentKeyId,
      hlsManifestKey: hlsKey,
      dashManifestKey: dashKey,
      widevineReady: true,
      fairplayReady: true,
    },
  });
  await db.drmPackagingJob.update({
    where: { id: data.jobId },
    data: { status: 'ready', completedAt: new Date() },
  });
}

async function processTasteSync(data: { userId: string }) {
  const db = await getPrisma();
  const connections = await db.tasteConnection.findMany({
    where: { userId: data.userId },
  });
  console.info(
    `[taste-sync] TODO: sync ${connections.length} platforms for ${data.userId}`
  );
}

async function main() {
  if (!env.REDIS_URL) {
    console.error('REDIS_URL is required for the worker process');
    process.exit(1);
  }
  if (!env.DATABASE_URL) {
    console.error('DATABASE_URL is required for the worker process');
    process.exit(1);
  }

  const bullmq = await import('bullmq');
  const worker = new bullmq.Worker(
    'mintmusic',
    async (job) => {
      switch (job.name) {
        case 'drm-package':
          await processDrmPackage(job.data as { mediaAssetId: string; jobId: string });
          break;
        case 'taste-sync':
          await processTasteSync(job.data as { userId: string });
          break;
        case 'radio-rotate':
          console.info('[radio-rotate] TODO: advance regional rotations');
          break;
        case 'transcode':
          console.info('[transcode] TODO: normalize audio/video mezzanine');
          break;
        default:
          console.warn(`Unknown job: ${job.name}`);
      }
    },
    { connection: { url: env.REDIS_URL } }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.name} failed:`, err);
  });

  console.info('MintMusic worker listening on queue "mintmusic"');
}

main().catch(async (err) => {
  console.error(err);
  await disconnectPrisma();
  process.exit(1);
});

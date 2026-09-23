/**
 * Background worker process — run: npm run worker -w @mintmusic/api
 *
 * Handles DRM packaging, taste sync, radio rotation, and CrateBuilder daily runs.
 */
import 'dotenv/config';
import { env } from '../config/env.js';
import { disconnectPrisma, getPrisma } from '../lib/prisma.js';
import { runCrateBuilderPipeline } from '../modules/cratebuilder/pipeline.js';

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

async function processCrateBuilderRun(data: { trigger?: string }) {
  const db = await getPrisma();
  const result = await runCrateBuilderPipeline(db, {
    trigger: data.trigger ?? 'scheduled',
  });
  console.info('[cratebuilder-run]', result.runId, result.status, result.summary);
}

async function registerRepeatableJobs(queue: import('bullmq').Queue) {
  // 17:00 UTC year-round = fixed EST (UTC−05). Documented alternative: America/New_York (DST).
  const pattern =
    env.CRATEBUILDER_TZ_MODE === 'iana'
      ? env.CRATEBUILDER_CRON
      : env.CRATEBUILDER_CRON || '0 17 * * *';

  await queue.add(
    'cratebuilder-run',
    { trigger: 'scheduled' },
    {
      repeat: {
        pattern,
        ...(env.CRATEBUILDER_TZ_MODE === 'iana'
          ? { tz: env.CRATEBUILDER_IANA_TZ }
          : {}),
      },
      jobId: 'cratebuilder-daily',
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
  console.info(
    `[cratebuilder] registered repeatable job cron="${pattern}" tzMode=${env.CRATEBUILDER_TZ_MODE}`
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
  const connection = { url: env.REDIS_URL };
  const queue = new bullmq.Queue('mintmusic', { connection });
  await registerRepeatableJobs(queue);

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
        case 'cratebuilder-run':
          await processCrateBuilderRun(job.data as { trigger?: string });
          break;
        default:
          console.warn(`Unknown job: ${job.name}`);
      }
    },
    { connection }
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

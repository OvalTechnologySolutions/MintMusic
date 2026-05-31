/**
 * BullMQ queue helpers — no-op when REDIS_URL is unset.
 */
import { env } from '../config/env.js';

export type JobName =
  | 'drm-package'
  | 'taste-sync'
  | 'radio-rotate'
  | 'transcode';

export async function enqueueJob(
  name: JobName,
  data: Record<string, unknown>
): Promise<void> {
  if (!env.REDIS_URL) {
    console.info(`[worker] skipped ${name} (REDIS_URL not set)`, data);
    return;
  }

  // Dynamic import keeps API bootable without Redis in dev
  const { Queue } = await import('bullmq');
  const queue = new Queue('mintmusic', { connection: { url: env.REDIS_URL } });
  await queue.add(name, data, {
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  await queue.close();
}

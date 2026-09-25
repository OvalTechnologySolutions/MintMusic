'use client';

/**
 * Account-scoped offline audio cache using Cache Storage.
 * Not DRM — browsers can still extract or record audio.
 */

const DEVICE_KEY = 'mint:offline-device-id';
const LEASE_KEY = 'mint:offline-lease';

function cacheName(userId: string) {
  return `mintmusic-offline-${userId}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function ensureOfflineLease(userId: string): Promise<{
  leaseToken: string;
  expiresAt: string;
} | null> {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        userId: string;
        leaseToken: string;
        expiresAt: string;
      };
      if (
        parsed.userId === userId &&
        new Date(parsed.expiresAt).getTime() > Date.now() + 60_000
      ) {
        return parsed;
      }
    }
    const { createOfflineLease } = await import('./billing-api');
    const lease = await createOfflineLease(getOrCreateDeviceId());
    const stored = {
      userId,
      leaseToken: lease.leaseToken,
      expiresAt: lease.expiresAt,
    };
    localStorage.setItem(LEASE_KEY, JSON.stringify(stored));
    return stored;
  } catch {
    return null;
  }
}

export async function cacheTrackOffline(params: {
  userId: string;
  trackId: string;
  url: string;
}): Promise<{ ok: boolean; error?: string; bytes?: number }> {
  if (!('caches' in window)) {
    return { ok: false, error: 'Offline cache is not supported in this browser.' };
  }
  const lease = await ensureOfflineLease(params.userId);
  if (!lease) {
    return { ok: false, error: 'Could not refresh offline authorization.' };
  }
  try {
    const res = await fetch(params.url, {
      headers: { 'X-Offline-Lease': lease.leaseToken },
      credentials: 'include',
    });
    if (!res.ok) {
      return { ok: false, error: `Download failed (${res.status})` };
    }
    const cache = await caches.open(cacheName(params.userId));
    const key = `/offline-audio/${params.trackId}`;
    await cache.put(key, res.clone());
    const buf = await res.arrayBuffer();
    return { ok: true, bytes: buf.byteLength };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Download failed',
    };
  }
}

export async function getOfflineTrackUrl(
  userId: string,
  trackId: string
): Promise<string | null> {
  if (!('caches' in window)) return null;
  const cache = await caches.open(cacheName(userId));
  const match = await cache.match(`/offline-audio/${trackId}`);
  if (!match) return null;
  const blob = await match.blob();
  return URL.createObjectURL(blob);
}

export async function removeOfflineTrack(userId: string, trackId: string) {
  if (!('caches' in window)) return;
  const cache = await caches.open(cacheName(userId));
  await cache.delete(`/offline-audio/${trackId}`);
}

export async function clearOfflineForUser(userId: string) {
  if ('caches' in window) {
    await caches.delete(cacheName(userId));
  }
  localStorage.removeItem(LEASE_KEY);
  try {
    const { revokeOfflineLeases } = await import('./billing-api');
    await revokeOfflineLeases();
  } catch {
    /* ignore when logged out */
  }
}

export async function estimateOfflineUsage(userId: string): Promise<number> {
  if (!('caches' in window)) return 0;
  const cache = await caches.open(cacheName(userId));
  const keys = await cache.keys();
  let total = 0;
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    const buf = await res.clone().arrayBuffer();
    total += buf.byteLength;
  }
  return total;
}

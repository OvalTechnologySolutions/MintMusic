import robotsParser from 'robots-parser';
import { safeFetchText } from './ssrf.js';

const cache = new Map<string, { fetchedAt: number; robots: ReturnType<typeof robotsParser> | null }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function isUrlAllowedByRobots(
  targetUrl: string,
  userAgent: string
): Promise<{ allowed: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: 'invalid_url' };
  }

  const robotsUrl = `${url.origin}/robots.txt`;
  const cached = cache.get(robotsUrl);
  const now = Date.now();

  let robots = cached && now - cached.fetchedAt < CACHE_TTL_MS ? cached.robots : undefined;

  if (robots === undefined) {
    try {
      const res = await safeFetchText(robotsUrl, {
        timeoutMs: 8_000,
        userAgent,
        accept: 'text/plain,*/*',
      });
      robots = robotsParser(robotsUrl, res.body);
      cache.set(robotsUrl, { fetchedAt: now, robots });
    } catch {
      // Missing/unreachable robots.txt → allow with note (common for many sites)
      robots = null;
      cache.set(robotsUrl, { fetchedAt: now, robots: null });
    }
  }

  if (!robots) {
    return { allowed: true, reason: 'robots_unavailable' };
  }

  const allowed = robots.isAllowed(targetUrl, userAgent) !== false;
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: 'disallowed_by_robots' };
}

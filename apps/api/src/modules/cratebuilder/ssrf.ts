/**
 * SSRF-safe URL fetch helpers for CrateBuilder ingestion.
 * Blocks private/link-local hosts, non-http(s), and unsafe redirects.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 15_000;

function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) {
    return true;
  }
  if (v.includes(':')) return false; // other public IPv6 — allow
  const parts = v.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error(`Blocked host: ${host}`);
  }
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error(`Blocked private IP: ${host}`);
  }
  return url;
}

export async function resolveAndAssertPublicHost(hostname: string): Promise<void> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error(`Blocked private IP: ${hostname}`);
    return;
  }
  const records = await lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(`Blocked host resolving to private IP: ${hostname} → ${r.address}`);
    }
  }
}

export interface SafeFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string | null;
  body: string;
}

export async function safeFetchText(
  rawUrl: string,
  options?: { timeoutMs?: number; userAgent?: string; accept?: string }
): Promise<SafeFetchResult> {
  let current = assertSafeHttpUrl(rawUrl).toString();
  let redirects = 0;

  while (redirects <= MAX_REDIRECTS) {
    const parsed = assertSafeHttpUrl(current);
    await resolveAndAssertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
    try {
      const res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            options?.userAgent ??
            'MintMusic-CrateBuilder/0.1 (+https://mintmusic.ai; outreach research bot)',
          Accept: options?.accept ?? 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error(`Redirect without Location from ${current}`);
        current = new URL(loc, current).toString();
        redirects += 1;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${current}`);
      }

      const contentType = res.headers.get('content-type');
      const body = await res.text();
      return {
        url: rawUrl,
        finalUrl: current,
        status: res.status,
        contentType,
        body,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Too many redirects fetching ${rawUrl}`);
}

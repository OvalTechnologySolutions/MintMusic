const APP_HOSTS = new Set(['mintmusic.ai', 'www.mintmusic.ai']);
const RESOLVE_ORIGIN = 'https://mintmusic.ai';

function isAppHost(hostname: string): boolean {
  return APP_HOSTS.has(hostname.toLowerCase());
}

/** Collapse repeated slashes so a path can never be protocol-relative. */
function sameOriginPath(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/') || '/';
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}

/**
 * Turn a native deep link into a same-origin app route, or null.
 *
 * Rejects protocol-relative values (`//evil.com`) which `location.assign`
 * would treat as a host, navigating the WebView off-site.
 */
export function routeFromAppUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  let candidate: string | null = null;

  if (url.protocol === 'mintmusic:') {
    const pathname = url.pathname || '/';
    candidate = url.host ? `/${url.host}${pathname === '/' ? '' : pathname}` : pathname;
  } else if (url.protocol === 'https:' && isAppHost(url.hostname)) {
    candidate = url.pathname || '/';
  }

  if (!candidate) return null;

  let resolved: URL;
  try {
    resolved = new URL(candidate, RESOLVE_ORIGIN);
  } catch {
    return null;
  }

  if (resolved.protocol !== 'https:' || !isAppHost(resolved.hostname)) {
    return null;
  }

  const path = sameOriginPath(resolved.pathname);
  if (path.startsWith('//')) return null;

  return `${path}${url.search}${url.hash}`;
}

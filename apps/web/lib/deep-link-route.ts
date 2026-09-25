const APP_HOSTS = new Set(['mintmusic.ai', 'www.mintmusic.ai']);
const SENTINEL_ORIGIN = 'https://mintmusic.ai';

/**
 * Resolve an incoming native-app URL to a same-origin path.
 * Protocol-relative paths (`//evil.com`) must be rejected: `location.assign`
 * would leave the WebView for the attacker host.
 */
export function routeFromAppUrl(value: string): string | null {
  try {
    const url = new URL(value);
    let route: string | null = null;

    if (url.protocol === 'mintmusic:') {
      route = `/${url.host}${url.pathname}${url.search}${url.hash}`;
    } else if (url.protocol === 'https:' && APP_HOSTS.has(url.host)) {
      route = `${url.pathname}${url.search}${url.hash}`;
    }

    if (!route || !isSafeInAppRoute(route)) return null;
    return route;
  } catch {
    return null;
  }
}

export function isSafeInAppRoute(route: string): boolean {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) {
    return false;
  }
  try {
    return new URL(route, SENTINEL_ORIGIN).origin === SENTINEL_ORIGIN;
  } catch {
    return false;
  }
}

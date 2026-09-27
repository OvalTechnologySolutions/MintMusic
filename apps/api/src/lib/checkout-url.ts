/** Compare origins without treating default ports as distinct. */
function originKey(url: URL): string {
  const hostname = url.hostname.replace(/\.$/, '').toLowerCase();
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return `${url.protocol}//${hostname}:${port}`;
}

/**
 * Stripe success_url / cancel_url are client-supplied today. Reject anything
 * that would send a paying customer off the configured MintMusic origin.
 */
export function assertSafeCheckoutReturnUrl(url: string, webUrl: string): void {
  let parsed: URL;
  let allowed: URL;
  try {
    parsed = new URL(url);
    allowed = new URL(webUrl);
  } catch {
    throw new Error('Checkout return URL is invalid');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Checkout return URL must be http(s)');
  }
  if (parsed.protocol !== allowed.protocol) {
    throw new Error('Checkout return URL must stay on the MintMusic origin');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Checkout return URL must not include credentials');
  }
  if (originKey(parsed) !== originKey(allowed)) {
    throw new Error('Checkout return URL must stay on the MintMusic origin');
  }
}

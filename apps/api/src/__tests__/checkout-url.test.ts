import { describe, expect, it } from 'vitest';
import { assertSafeCheckoutReturnUrl } from '../lib/checkout-url.js';

const WEB = 'https://mintmusic.ai';

function accept(url: string, webUrl = WEB) {
  expect(() => assertSafeCheckoutReturnUrl(url, webUrl)).not.toThrow();
}

function reject(url: string, webUrl = WEB) {
  expect(() => assertSafeCheckoutReturnUrl(url, webUrl)).toThrow(
    /Checkout return URL/
  );
}

describe('assertSafeCheckoutReturnUrl', () => {
  it('allows same-origin https paths and query strings', () => {
    accept('https://mintmusic.ai/');
    accept('https://mintmusic.ai/collection?paid=1');
    accept('https://mintmusic.ai/thanks#receipt');
  });

  it('allows localhost with an explicit port when WEB_URL matches', () => {
    accept('http://localhost:3000/ok', 'http://localhost:3000');
  });

  it('rejects a different host (phishing after Stripe checkout)', () => {
    reject('https://evil.example/phish');
    reject('https://mintmusic.ai.evil.example/phish');
    reject('https://evil.example/?next=https://mintmusic.ai');
  });

  it('rejects protocol-relative and non-http(s) URLs', () => {
    reject('//evil.example/phish');
    reject('javascript:alert(1)');
    reject('data:text/html,phish');
  });

  it('rejects http when WEB_URL is https', () => {
    reject('http://mintmusic.ai/thanks');
  });

  it('rejects userinfo / credential URLs', () => {
    // Looks like mintmusic.ai but the host is evil.example.
    reject('https://mintmusic.ai@evil.example/');
    reject('https://mintmusic.ai:password@evil.example/');
  });

  it('rejects a missing or unparseable URL', () => {
    reject('');
    reject('not-a-url');
  });

  it('rejects a different localhost port', () => {
    reject('http://localhost:4000/ok', 'http://localhost:3000');
  });
});

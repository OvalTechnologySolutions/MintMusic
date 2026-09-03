import { describe, expect, it } from 'vitest';
import { isSafeInAppRoute, routeFromAppUrl } from '../lib/deep-link-route';

describe('routeFromAppUrl', () => {
  it('maps https app links to in-app paths', () => {
    expect(routeFromAppUrl('https://mintmusic.ai/')).toBe('/');
    expect(routeFromAppUrl('https://mintmusic.ai/privacy')).toBe('/privacy');
    expect(routeFromAppUrl('https://www.mintmusic.ai/support?ref=1#top')).toBe(
      '/support?ref=1#top'
    );
  });

  it('maps mintmusic: deep links whose host is a path segment', () => {
    expect(routeFromAppUrl('mintmusic://privacy')).toBe('/privacy');
    expect(routeFromAppUrl('mintmusic://foo/bar?x=1')).toBe('/foo/bar?x=1');
  });

  it('rejects protocol-relative open redirects', () => {
    expect(routeFromAppUrl('https://mintmusic.ai//evil.com')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai///evil.com')).toBeNull();
    expect(routeFromAppUrl('https://www.mintmusic.ai//evil.example')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai/\\evil.com')).toBeNull();
    expect(routeFromAppUrl('mintmusic:///evil.com')).toBeNull();
    expect(routeFromAppUrl('mintmusic:////evil.com')).toBeNull();
  });

  it('rejects off-origin hosts', () => {
    expect(routeFromAppUrl('https://evil.com/x')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai.evil.com/')).toBeNull();
  });
});

describe('isSafeInAppRoute', () => {
  it('accepts same-origin paths and rejects protocol-relative URLs', () => {
    expect(isSafeInAppRoute('/')).toBe(true);
    expect(isSafeInAppRoute('/privacy')).toBe(true);
    expect(isSafeInAppRoute('//evil.com')).toBe(false);
    expect(isSafeInAppRoute('///evil.com')).toBe(false);
    expect(isSafeInAppRoute('/\\evil.com')).toBe(false);
  });
});

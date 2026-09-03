import { describe, expect, it } from 'vitest';
import { routeFromAppUrl } from '../lib/deep-link';

describe('routeFromAppUrl', () => {
  it('maps https universal links on mintmusic.ai to in-app paths', () => {
    expect(routeFromAppUrl('https://mintmusic.ai/')).toBe('/');
    expect(routeFromAppUrl('https://mintmusic.ai/privacy')).toBe('/privacy');
    expect(routeFromAppUrl('https://www.mintmusic.ai/install?ref=ios')).toBe(
      '/install?ref=ios'
    );
    expect(routeFromAppUrl('https://mintmusic.ai/support#help')).toBe(
      '/support#help'
    );
  });

  it('maps mintmusic: custom-scheme links to in-app paths', () => {
    expect(routeFromAppUrl('mintmusic://privacy')).toBe('/privacy');
    expect(routeFromAppUrl('mintmusic://app/install')).toBe('/app/install');
    expect(routeFromAppUrl('mintmusic:///privacy')).toBe('/privacy');
    expect(routeFromAppUrl('MintMusic:///install')).toBe('/install');
  });

  it('rejects protocol-relative universal links that would leave the origin', () => {
    expect(routeFromAppUrl('https://mintmusic.ai//evil.com')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai///evil.com')).toBeNull();
    expect(routeFromAppUrl('https://www.mintmusic.ai//evil.com/phish')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai/\\evil.com')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai//evil.com:443')).toBeNull();
  });

  it('rejects custom-scheme links that collapse to protocol-relative URLs', () => {
    expect(routeFromAppUrl('mintmusic:////evil.com')).toBeNull();
    expect(routeFromAppUrl('mintmusic:///\\evil.com')).toBeNull();
  });

  it('rejects off-site and non-https schemes', () => {
    expect(routeFromAppUrl('https://evil.com/privacy')).toBeNull();
    expect(routeFromAppUrl('https://mintmusic.ai.evil.com/x')).toBeNull();
    expect(routeFromAppUrl('http://mintmusic.ai/privacy')).toBeNull();
    expect(routeFromAppUrl('javascript:alert(1)')).toBeNull();
    expect(routeFromAppUrl('not a url')).toBeNull();
  });

  it('never returns a string that location.assign would treat as another host', () => {
    const samples = [
      'https://mintmusic.ai/privacy',
      'https://mintmusic.ai//evil.com',
      'https://mintmusic.ai/.//evil.com',
      'mintmusic:///privacy',
      'mintmusic:////evil.com',
      'mintmusic://install',
    ];
    for (const sample of samples) {
      const route = routeFromAppUrl(sample);
      if (route !== null) {
        expect(route.startsWith('//')).toBe(false);
        expect(route.startsWith('/')).toBe(true);
      }
    }
  });
});

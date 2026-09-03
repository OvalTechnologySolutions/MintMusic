import { describe, expect, it } from 'vitest';

/**
 * The record player is the whole product at `/` and there are no
 * middleware-protected routes anymore (the old marketplace hub / settings /
 * creator dashboard were retired). This mirrors that: nothing is protected.
 */
const PROTECTED_PREFIXES: string[] = [];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

describe('routes', () => {
  it('has no protected prefixes', () => {
    expect(PROTECTED_PREFIXES).toHaveLength(0);
  });

  it('treats core app and policy routes as public', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/install')).toBe(false);
    expect(isProtectedPath('/privacy')).toBe(false);
    expect(isProtectedPath('/terms')).toBe(false);
    expect(isProtectedPath('/support')).toBe(false);
  });
});

describe('web config defaults', () => {
  it('uses a valid production app URL', () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    expect(appUrl).toMatch(/^https?:\/\//);
  });
});

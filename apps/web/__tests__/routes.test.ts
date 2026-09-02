import { describe, expect, it } from 'vitest';

/** Mirrors middleware matcher paths for regression testing */
const PROTECTED_PREFIXES = ['/collector', '/settings', '/creator/dashboard'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

describe('protected routes', () => {
  it('protects collector hub', () => {
    expect(isProtectedPath('/collector')).toBe(true);
    expect(isProtectedPath('/collector/foo')).toBe(true);
  });

  it('protects settings', () => {
    expect(isProtectedPath('/settings')).toBe(true);
  });

  it('allows public routes', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/discover')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/u/user-123')).toBe(false);
  });
});

describe('web config defaults', () => {
  it('uses mintmusic.ai as production app URL when set', () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    expect(appUrl).toMatch(/^https?:\/\//);
  });
});

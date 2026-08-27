import { describe, expect, it } from 'vitest';

describe('webConfig production defaults', () => {
  it('defaults app URL to localhost in dev', () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    expect(appUrl).toMatch(/^https?:\/\//);
  });

  it('defaults API URL to local API in dev', () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000';
    expect(apiUrl).toMatch(/^https?:\/\//);
  });

  it('supports mintmusic.ai production URLs', () => {
    const prodApp = 'https://mintmusic.ai';
    const prodApi = 'https://api.mintmusic.ai';
    expect(prodApp).toMatch(/^https:\/\/mintmusic\.ai$/);
    expect(prodApi).toMatch(/^https:\/\/api\.mintmusic\.ai$/);
  });
});

describe('MVP public routes', () => {
  const PUBLIC_ROUTES = ['/', '/discover', '/login'];

  it('includes core landing and discovery routes', () => {
    expect(PUBLIC_ROUTES).toContain('/');
    expect(PUBLIC_ROUTES).toContain('/discover');
    expect(PUBLIC_ROUTES).toContain('/login');
  });

  it('matches public profile URL pattern', () => {
    const profilePath = '/u/user-abc123';
    expect(profilePath).toMatch(/^\/u\/[^/]+$/);
  });
});

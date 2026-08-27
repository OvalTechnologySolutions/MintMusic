import { describe, expect, it } from 'vitest';
import {
  normalizeSocialUrl,
  validateSocialLink,
  validateSocialLinks,
} from './validate';

describe('validateSocialLink', () => {
  it('accepts valid Spotify URLs', () => {
    const result = validateSocialLink({
      platform: 'spotify',
      url: 'https://open.spotify.com/artist/abc123',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty URLs', () => {
    const result = validateSocialLink({ platform: 'instagram', url: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('URL is required');
  });

  it('rejects wrong host for platform', () => {
    const result = validateSocialLink({
      platform: 'youtube',
      url: 'https://example.com/watch?v=abc',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('YouTube'))).toBe(true);
  });
});

describe('validateSocialLinks', () => {
  it('rejects duplicate platforms', () => {
    const result = validateSocialLinks([
      { platform: 'spotify', url: 'https://open.spotify.com/artist/a' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/b' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('rejects multiple primary links', () => {
    const result = validateSocialLinks([
      { platform: 'spotify', url: 'https://open.spotify.com/artist/a', isPrimary: true },
      { platform: 'instagram', url: 'https://instagram.com/user', isPrimary: true },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('primary'))).toBe(true);
  });
});

describe('normalizeSocialUrl', () => {
  it('adds https when missing', () => {
    expect(normalizeSocialUrl('instagram.com/user')).toBe('https://instagram.com/user');
  });
});

import { describe, expect, it } from 'vitest';
import { extractFeaturedArtistsFromHtml } from '../../modules/cratebuilder/editorial.js';
import { sanitizeCell } from '../../modules/cratebuilder/export.js';
import { assertSafeHttpUrl } from '../../modules/cratebuilder/ssrf.js';
import { toPublicArtistDto } from '../../modules/cratebuilder/mappers.js';
import { parseSimpleCsv } from '../../modules/cratebuilder/import.js';
import { getConnectorDefaults } from '../../modules/cratebuilder/connectors.js';

describe('CrateBuilder SSRF', () => {
  it('blocks localhost and private IPs', () => {
    expect(() => assertSafeHttpUrl('http://127.0.0.1/x')).toThrow(/Blocked/);
    expect(() => assertSafeHttpUrl('http://localhost/x')).toThrow(/Blocked/);
    expect(() => assertSafeHttpUrl('http://192.168.1.1/x')).toThrow(/Blocked/);
    expect(() => assertSafeHttpUrl('http://169.254.169.254/latest')).toThrow(/Blocked/);
  });

  it('allows public https URLs', () => {
    const u = assertSafeHttpUrl('https://www.onestowatch.com/en/blog/x');
    expect(u.hostname).toBe('www.onestowatch.com');
  });
});

describe('CrateBuilder editorial extraction', () => {
  it('extracts featured artists from listicle-like HTML and skips nav', () => {
    const html = `
      <html><body>
        <nav><a href="/">Home</a><a href="/subscribe">Subscribe</a></nav>
        <h1>Top artists to watch</h1>
        <h2>1. Luna Vertex</h2>
        <p>Emerging indie act from Brooklyn.</p>
        <h2>2. Neon Harbor</h2>
        <p>Electronic duo.</p>
        <footer>Privacy Terms</footer>
      </body></html>`;
    const result = extractFeaturedArtistsFromHtml(html, 'https://example.com/list');
    const names = result.artists.map((a: { stageName: string }) => a.stageName);
    expect(names).toContain('Luna Vertex');
    expect(names).toContain('Neon Harbor');
    expect(names.some((n: string) => /subscribe|privacy|home/i.test(n))).toBe(false);
  });
});

describe('CrateBuilder Excel sanitization', () => {
  it('prefixes formula-like cells', () => {
    expect(sanitizeCell('=CMD()')).toBe("'=CMD()");
    expect(sanitizeCell('+1234')).toBe("'+1234");
    expect(sanitizeCell('@sum')).toBe("'@sum");
    expect(sanitizeCell('Normal Artist')).toBe('Normal Artist');
  });
});

describe('CrateBuilder public DTO allowlist', () => {
  it('never includes contacts or outreach fields', () => {
    const dto = toPublicArtistDto({
      id: 'a1',
      stageName: 'Test',
      entityType: 'solo',
      bio: 'bio',
      genres: ['indie'],
      hometownCity: null,
      hometownRegion: null,
      hometownCountry: null,
      currentCity: 'LA',
      currentRegion: null,
      currentCountry: 'US',
      website: 'https://example.com',
      linkInBioUrl: null,
      firstDiscoveredAt: new Date('2026-01-01'),
      discoveryVisible: true,
      emergingStatus: null,
      outreachStatus: 'ready',
      outreachNotes: 'SECRET NOTES',
      outreachAssignedTo: 'ops',
      preferredContactId: null,
      linkedUserId: null,
      adminLockedFields: [],
      suppressedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      profiles: [
        {
          id: 'p1',
          artistId: 'a1',
          platform: 'instagram',
          url: 'https://instagram.com/test',
          handle: 'test',
          externalAccountId: null,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      contacts: [
        {
          id: 'c1',
          artistId: 'a1',
          kind: 'booking',
          value: 'booking@secret.com',
          role: null,
          representativeName: null,
          organization: null,
          verified: true,
          preferred: true,
          suppressed: false,
          suppressedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as never);

    expect(dto).toMatchObject({
      id: 'a1',
      stageName: 'Test',
      website: 'https://example.com',
    });
    expect(dto).not.toHaveProperty('contacts');
    expect(dto).not.toHaveProperty('outreachStatus');
    expect(dto).not.toHaveProperty('outreachNotes');
    expect(JSON.stringify(dto)).not.toContain('booking@secret.com');
    expect(JSON.stringify(dto)).not.toContain('SECRET NOTES');
  });
});

describe('CrateBuilder CSV import parser', () => {
  it('parses stageName and booking email without inventing contacts', () => {
    const rows = parseSimpleCsv(
      'stageName,website,genres,bookingEmail\nAlpha Band,https://alpha.example,rock|indie,booking@alpha.example\n'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.stageName).toBe('Alpha Band');
    expect(rows[0]?.contacts?.[0]?.value).toBe('booking@alpha.example');
  });
});

describe('CrateBuilder connectors', () => {
  it('keeps tiktok disabled by default with commercial reason', () => {
    const tiktok = getConnectorDefaults().find((c) => c.id === 'tiktok');
    expect(tiktok?.enabled).toBe(false);
    expect(tiktok?.reason.toLowerCase()).toMatch(/commercial|research/);
  });

  it('keeps musicbrainz disabled by default', () => {
    const mb = getConnectorDefaults().find((c) => c.id === 'musicbrainz');
    expect(mb?.enabled).toBe(false);
  });
});

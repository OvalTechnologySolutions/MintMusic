import * as cheerio from 'cheerio';
import type { ArtistCandidate } from './identity.js';

const AUTHOR_HINTS = /\b(by|author|written by|words by|edited by)\b/i;
const NAV_SKIP =
  /\b(subscribe|newsletter|privacy|terms|cookie|login|sign up|about us|contact us|home|shop|cart|share|related articles?|read more|read next|load more|follow us|trending|popular|comments?|conclusion|introduction|overview)\b/i;
const ARTIST_SECTION =
  /\b(artists? to watch|underground|featured artists?|ones to watch|best .* artists?)\b/i;

export interface EditorialExtractResult {
  publicationDate: Date | null;
  title: string | null;
  artists: ArtistCandidate[];
  coverageNotes: string[];
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function looksLikePersonName(name: string): boolean {
  if (name.length < 2 || name.length > 80) return false;
  if (NAV_SKIP.test(name)) return false;
  if (/^https?:/i.test(name)) return false;
  // Avoid pure numbers / dates
  if (/^\d+$/.test(name)) return false;
  // Single generic UI words
  if (/^(share|more|next|prev|previous|menu|search)$/i.test(name)) return false;
  return true;
}

/**
 * Heuristic extraction for editorial listicles (Ones To Watch style).
 * Prefers structured headings / numbered list items that look like artist names.
 */
export function extractFeaturedArtistsFromHtml(
  html: string,
  sourceUrl: string
): EditorialExtractResult {
  const $ = cheerio.load(html);
  const coverageNotes: string[] = [];

  // Remove non-content
  $('script, style, nav, footer, header, aside, noscript, iframe').remove();

  const title = cleanText($('h1').first().text() || $('title').text() || '') || null;

  let publicationDate: Date | null = null;
  const metaDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="publish-date"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    $('time[datetime]').first().attr('datetime');
  if (metaDate) {
    const d = new Date(metaDate);
    if (!Number.isNaN(d.getTime())) publicationDate = d;
  }

  const artists: ArtistCandidate[] = [];
  const seen = new Set<string>();

  const addArtist = (
    name: string,
    opts?: { bio?: string; href?: string; excerpt?: string }
  ) => {
    const stageName = cleanText(name);
    if (!looksLikePersonName(stageName)) return;
    if (AUTHOR_HINTS.test(stageName)) return;
    const key = stageName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const profiles: ArtistCandidate['profiles'] = [];
    if (opts?.href) {
      try {
        const u = new URL(opts.href, sourceUrl);
        const host = u.hostname.toLowerCase();
        if (host.includes('instagram.com')) {
          profiles.push({ platform: 'instagram', url: u.toString() });
        } else if (host.includes('tiktok.com')) {
          profiles.push({ platform: 'tiktok', url: u.toString() });
        } else if (host.includes('spotify.com')) {
          profiles.push({ platform: 'spotify', url: u.toString() });
        } else if (host.includes('youtube.com') || host.includes('youtu.be')) {
          profiles.push({ platform: 'youtube', url: u.toString() });
        } else if (host.includes('music.apple.com')) {
          profiles.push({ platform: 'apple_music', url: u.toString() });
        } else if (
          !host.includes('onestowatch.com') &&
          !host.includes('facebook.com') &&
          u.protocol.startsWith('http')
        ) {
          // Treat other external links as possible website
        }
      } catch {
        /* ignore */
      }
    }

    artists.push({
      stageName,
      entityType: 'unknown',
      bio: opts?.bio ?? null,
      profiles,
      sourceUrl,
      sourceType: 'editorial_url',
      excerpt: opts?.excerpt ?? stageName,
      method: 'editorial_html_heuristic',
      confidence: 0.65,
      emergingStatus: 'editorial_watchlist',
    });
  };

  // Numbered / bulleted list items often hold featured artists
  $('h2, h3, ol > li, ul > li').each((_, el) => {
    const $el = $(el);
    const text = cleanText($el.text());
    if (!text || text.length > 120) return;

    // Skip author bylines
    if (AUTHOR_HINTS.test(text) && text.length < 40) return;

    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? '';
    if (tag === 'h2' || tag === 'h3') {
      // "12. Artist Name" or "Artist Name — bio"
      const m = text.match(/^(?:\d+[.)\]]\s*)?(.+?)(?:\s+[—–\-:].*)?$/);
      const name = m?.[1] ?? text;
      if (ARTIST_SECTION.test(text) && text.length > 40) return;
      const nextP = $el.nextAll('p').first().text();
      addArtist(name, {
        bio: nextP ? cleanText(nextP).slice(0, 500) : undefined,
        href: $el.find('a').first().attr('href') || $el.closest('a').attr('href'),
        excerpt: text.slice(0, 240),
      });
      return;
    }

    // list items
    const link = $el.find('a').first();
    const name = cleanText(link.text()) || text.split(/[—–\-:]/)[0] || text;
    if (name.split(' ').length <= 6) {
      addArtist(name, {
        href: link.attr('href'),
        excerpt: text.slice(0, 240),
        bio: text.length > name.length + 5 ? text.slice(0, 500) : undefined,
      });
    }
  });

  // Fallback: strong/bold names inside article
  if (artists.length < 3) {
    coverageNotes.push('low_structured_hits_used_strong_fallback');
    $('article strong, article b, .post strong, .entry-content strong').each((_, el) => {
      const name = cleanText($(el).text());
      if (name.split(' ').length <= 5) {
        addArtist(name, { excerpt: name });
      }
    });
  }

  if (artists.length === 0) {
    coverageNotes.push('no_artists_extracted');
  } else {
    coverageNotes.push(`extracted_${artists.length}_candidates`);
  }

  return { publicationDate, title, artists, coverageNotes };
}

import type { CbConnectorId } from '@mintmusic/shared';
import { env } from '../../config/env.js';
import type { PrismaClient } from '@prisma/client';
import { safeFetchText } from './ssrf.js';
import type { ArtistCandidate } from './identity.js';

export interface ConnectorInfo {
  id: CbConnectorId;
  enabled: boolean;
  reason: string;
}

export function getConnectorDefaults(): ConnectorInfo[] {
  return [
    {
      id: 'editorial_html',
      enabled: true,
      reason: 'Public editorial HTML retrieval with robots/SSRF checks',
    },
    {
      id: 'manual_import',
      enabled: true,
      reason: 'Admin CSV/JSON/URL import',
    },
    {
      id: 'musicbrainz',
      enabled: env.MUSICBRAINZ_ENABLED,
      reason: env.MUSICBRAINZ_ENABLED
        ? 'Enabled via MUSICBRAINZ_ENABLED (ensure MetaBrainz commercial agreement for commercial use)'
        : 'Disabled: MusicBrainz WS free for non-commercial use only; set MUSICBRAINZ_ENABLED=true after MetaBrainz commercial/supporter agreement',
    },
    {
      id: 'wikidata',
      enabled: env.WIKIDATA_ENABLED,
      reason: env.WIKIDATA_ENABLED
        ? 'SPARQL sameAs / social URL lookup (no contact data)'
        : 'Disabled via WIKIDATA_ENABLED=false',
    },
    {
      id: 'spotify',
      enabled: Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET),
      reason:
        env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
          ? 'Client-credentials artist metadata enrichment'
          : 'Disabled: SPOTIFY_CLIENT_ID/SECRET not configured',
    },
    {
      id: 'tiktok',
      enabled: false,
      reason:
        'Disabled: TikTok Research Tools exclude commercial users; Commercial Content API is ads-only; Display API requires authorized content — use manual import for On The Radar',
    },
    {
      id: 'instagram',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
    {
      id: 'x',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
    {
      id: 'facebook',
      enabled: false,
      reason: 'Disabled: no approved commercial profile/comment API configured',
    },
  ];
}

export async function syncConnectorStatuses(db: PrismaClient): Promise<void> {
  for (const c of getConnectorDefaults()) {
    await db.cbConnectorStatus.upsert({
      where: { id: c.id },
      create: { id: c.id, enabled: c.enabled, reason: c.reason },
      update: { enabled: c.enabled, reason: c.reason },
    });
  }
}

let mbLastCall = 0;

async function musicBrainzRateLimit(): Promise<void> {
  const wait = 1100 - (Date.now() - mbLastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  mbLastCall = Date.now();
}

export async function enrichFromMusicBrainz(
  stageName: string
): Promise<Partial<ArtistCandidate> | null> {
  if (!env.MUSICBRAINZ_ENABLED) return null;
  await musicBrainzRateLimit();
  const q = encodeURIComponent(`artist:${stageName}`);
  const url = `https://musicbrainz.org/ws/2/artist/?query=${q}&fmt=json&limit=5`;
  const res = await safeFetchText(url, {
    userAgent: env.MUSICBRAINZ_USER_AGENT,
    accept: 'application/json',
  });
  const data = JSON.parse(res.body) as {
    artists?: Array<{
      id: string;
      name: string;
      type?: string;
      country?: string;
      disambiguation?: string;
      tags?: Array<{ name: string; count: number }>;
      relations?: Array<{ type: string; url?: { resource: string } }>;
    }>;
  };
  const hit = data.artists?.[0];
  if (!hit) return null;

  await musicBrainzRateLimit();
  const detailUrl = `https://musicbrainz.org/ws/2/artist/${hit.id}?inc=url-rels+tags&fmt=json`;
  const detailRes = await safeFetchText(detailUrl, {
    userAgent: env.MUSICBRAINZ_USER_AGENT,
    accept: 'application/json',
  });
  const detail = JSON.parse(detailRes.body) as typeof hit;

  const profiles: ArtistCandidate['profiles'] = [];
  for (const rel of detail.relations ?? []) {
    const resource = rel.url?.resource;
    if (!resource) continue;
    try {
      const u = new URL(resource);
      const host = u.hostname.toLowerCase();
      if (host.includes('instagram.com')) profiles.push({ platform: 'instagram', url: resource });
      else if (host.includes('tiktok.com')) profiles.push({ platform: 'tiktok', url: resource });
      else if (host.includes('spotify.com')) profiles.push({ platform: 'spotify', url: resource });
      else if (host.includes('youtube.com')) profiles.push({ platform: 'youtube', url: resource });
      else if (host.includes('soundcloud.com'))
        profiles.push({ platform: 'soundcloud', url: resource });
      else if (host.includes('bandcamp.com')) profiles.push({ platform: 'bandcamp', url: resource });
      else if (host.includes('twitter.com') || host.includes('x.com'))
        profiles.push({ platform: 'x', url: resource });
      else if (rel.type === 'official homepage') {
        /* website handled below */
      }
    } catch {
      /* ignore */
    }
  }

  const website =
    detail.relations?.find((r) => r.type === 'official homepage')?.url?.resource ?? null;

  return {
    stageName: hit.name,
    entityType: hit.type === 'Group' ? 'group' : hit.type === 'Person' ? 'solo' : 'unknown',
    currentCountry: hit.country ?? null,
    genres: (detail.tags ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => t.name),
    website,
    profiles,
    externalIds: [
      {
        provider: 'musicbrainz',
        externalId: hit.id,
        url: `https://musicbrainz.org/artist/${hit.id}`,
      },
    ],
    method: 'musicbrainz_ws',
    confidence: 0.75,
    sourceType: 'musicbrainz',
    sourceUrl: `https://musicbrainz.org/artist/${hit.id}`,
  };
}

export async function enrichFromWikidata(
  stageName: string
): Promise<Partial<ArtistCandidate> | null> {
  if (!env.WIKIDATA_ENABLED) return null;
  const sparql = `
SELECT ?item ?itemLabel ?insta ?spotify ?twitter ?youtube WHERE {
  ?item rdfs:label "${stageName.replace(/"/g, '\\"')}"@en.
  ?item wdt:P31/wdt:P279* wd:Q215380.
  OPTIONAL { ?item wdt:P2003 ?insta. }
  OPTIONAL { ?item wdt:P1902 ?spotify. }
  OPTIONAL { ?item wdt:P2002 ?twitter. }
  OPTIONAL { ?item wdt:P2397 ?youtube. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 3`.trim();

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  try {
    const res = await safeFetchText(url, {
      accept: 'application/sparql-results+json',
      userAgent: 'MintMusic-CrateBuilder/0.1 (https://mintmusic.ai)',
    });
    const data = JSON.parse(res.body) as {
      results?: {
        bindings?: Array<Record<string, { value: string }>>;
      };
    };
    const row = data.results?.bindings?.[0];
    if (!row) return null;

    const profiles: ArtistCandidate['profiles'] = [];
    if (row.insta?.value)
      profiles.push({
        platform: 'instagram',
        url: `https://instagram.com/${row.insta.value}`,
        handle: row.insta.value,
      });
    if (row.spotify?.value)
      profiles.push({
        platform: 'spotify',
        url: `https://open.spotify.com/artist/${row.spotify.value}`,
        externalAccountId: row.spotify.value,
      });
    if (row.twitter?.value)
      profiles.push({
        platform: 'x',
        url: `https://x.com/${row.twitter.value}`,
        handle: row.twitter.value,
      });
    if (row.youtube?.value)
      profiles.push({
        platform: 'youtube',
        url: `https://youtube.com/channel/${row.youtube.value}`,
        externalAccountId: row.youtube.value,
      });

    const qid = row.item?.value?.split('/').pop();
    return {
      stageName: row.itemLabel?.value ?? stageName,
      profiles,
      externalIds: qid
        ? [{ provider: 'wikidata', externalId: qid, url: row.item.value }]
        : undefined,
      method: 'wikidata_sparql',
      confidence: 0.6,
      sourceType: 'wikidata',
      sourceUrl: row.item?.value,
    };
  } catch {
    return null;
  }
}

let spotifyToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return null;
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 60_000) {
    return spotifyToken.value;
  }
  const basic = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  spotifyToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function enrichFromSpotify(
  stageName: string
): Promise<Partial<ArtistCandidate> | null> {
  const token = await getSpotifyToken();
  if (!token) return null;
  const url = `https://api.spotify.com/v1/search?type=artist&limit=3&q=${encodeURIComponent(stageName)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    artists?: {
      items?: Array<{
        id: string;
        name: string;
        genres?: string[];
        external_urls?: { spotify?: string };
      }>;
    };
  };
  const hit = data.artists?.items?.[0];
  if (!hit) return null;
  return {
    stageName: hit.name,
    genres: hit.genres?.slice(0, 8),
    profiles: hit.external_urls?.spotify
      ? [
          {
            platform: 'spotify',
            url: hit.external_urls.spotify,
            externalAccountId: hit.id,
          },
        ]
      : [],
    externalIds: [{ provider: 'spotify', externalId: hit.id, url: hit.external_urls?.spotify }],
    method: 'spotify_web_api',
    confidence: 0.7,
    sourceType: 'spotify',
    sourceUrl: hit.external_urls?.spotify,
  };
}

# CrateBuilder

Internal artist discovery, enrichment, contact management, and Excel export for MintMusic outreach and discovery.

## Architecture

- **System of record:** Neon Postgres (`cb_*` tables via Prisma)
- **API:** `apps/api` Express routes under `/v1/cratebuilder/*` (admin) and `/v1/discover/artists` (public allowlist)
- **Admin UI:** `https://mintmusic.ai/cratebuilder` (Next.js)
- **Jobs:** BullMQ worker job `cratebuilder-run` (requires `REDIS_URL`)
- **Exports:** Excel workbooks in object storage (`cratebuilder/exports/…`) or local `apps/api/data/cratebuilder-exports/` when S3 is unset

Discovered artists are **not** MintMusic `User` / `CreatorProfile` records. Optional future link: `CbArtist.linkedUserId`.

## Setup

```bash
# Schema
npm run db:push -w @mintmusic/api
# or: npm run db:migrate -w @mintmusic/api

# Seed discovery channels + CrateBuilder sources/connectors
npm run db:seed -w @mintmusic/api

# API + web
npm run dev:api
cd apps/web && npm run dev -- -H 127.0.0.1

# Worker (scheduling)
REDIS_URL=redis://localhost:6379 npm run worker -w @mintmusic/api
```

### Admin access

Set either:

1. `CRATEBUILDER_ADMIN_EMAILS=you@company.com,ops@company.com` on the API, **or**
2. `User.role = admin` in Postgres

Web and API both enforce this on every CrateBuilder route, import, run, and export download.

### Required / optional env

See [`apps/api/.env.example`](../apps/api/.env.example).

| Variable | Purpose |
|----------|---------|
| `CRATEBUILDER_ADMIN_EMAILS` | Bootstrap admin allowlist |
| `CRATEBUILDER_CRON` | Default `0 17 * * *` (17:00 UTC) |
| `CRATEBUILDER_TZ_MODE` | `fixed_est` (UTC cron, recommended) or `iana` |
| `CRATEBUILDER_IANA_TZ` | Used only when `TZ_MODE=iana` (e.g. `America/New_York` follows DST) |
| `MUSICBRAINZ_ENABLED` | Default `false` until MetaBrainz commercial agreement |
| `MUSICBRAINZ_USER_AGENT` | Required by MusicBrainz when enabled |
| `WIKIDATA_ENABLED` | Default `true` |
| `SPOTIFY_CLIENT_ID/SECRET` | Enables Spotify enrichment |
| `REDIS_URL` | Required for daily schedule |
| `OPENAI_API_KEY` | Optional (not required for MVP heuristics) |

## Scheduling (EST)

Interpret **EST literally as fixed UTC−05:00**. The default cron `0 17 * * *` runs at **17:00 UTC year-round**.

If you set `CRATEBUILDER_TZ_MODE=iana` and `CRATEBUILDER_IANA_TZ=America/New_York`, the schedule **follows daylight saving time** (EDT in summer). Prefer `fixed_est` for the product requirement.

The Excel export runs **after** ingestion finishes; it is not guaranteed ready at exactly noon EST.

Railway: run a second service with `npm run worker` and the same env as the API (`DATABASE_URL`, `REDIS_URL`, storage, CrateBuilder vars).

## Connectors

| Connector | Default | Notes |
|-----------|---------|-------|
| `editorial_html` | Enabled | Ones To Watch seed pages; robots + SSRF checks |
| `manual_import` | Enabled | CSV/JSON admin import |
| `wikidata` | Enabled | SPARQL profile `sameAs` — no contacts |
| `musicbrainz` | Disabled | WS free for non-commercial; commercial use needs MetaBrainz supporter/commercial plan. Rate limit 1 req/s. Does **not** provide emails/phones. |
| `spotify` | Disabled until client credentials | Artist IDs/genres/URLs only |
| `tiktok` | Disabled | Research Tools exclude commercial users; use manual import for On The Radar |
| `instagram` / `x` / `facebook` | Disabled | No approved commercial profile APIs configured |

Disabled connectors are visible in the admin UI with reasons. A failed/disabled connector does **not** stop the rest of the run.

### Seed sources

1. https://www.onestowatch.com/en/blog/the-top-26-artists-to-watch-in-2025  
2. https://resources.onestowatch.com/best-underground-artists-2026/  
3. https://www.tiktok.com/@ontheradarradio (manual import while TikTok connector disabled)

Admins can add more URLs/feeds in the Sources UI/API.

## Public vs internal data

- **Internal** (`/v1/cratebuilder/*`): contacts, outreach, evidence, review queue, exports  
- **Public discovery** (`GET /v1/discover/artists`): only `discoveryVisible=true` artists; allowlisted fields (name, bio, genres, location, public profiles/website). **Never** contacts, outreach notes, or evidence excerpts.

## Excel export

Filename: `mintmusic_cratebuilder_YYYY-MM-DD.xlsx`

Sheets: Artists, Profiles, Contacts, Evidence, Run Summary.

- Formula-injection sanitized  
- Phone/IDs as text  
- Hyperlinks for URLs  
- Partial runs labeled `PARTIAL_RUN`; previous complete `isLatest` preserved until a successful new file is written  

## Security notes

- Credentials stay server-side  
- SSRF protection on fetches (https only, DNS private-IP block, limited redirects)  
- Robots.txt respected when available  
- Suppressed contacts are not reintroduced on refresh  
- Admin corrections set `adminLockedFields` so enrichment does not overwrite them  
- Outreach status/notes survive refreshes  

## Manual run

```bash
# Via admin UI: Runs → Run now
# Or API (with internal headers):
curl -X POST "$API/v1/cratebuilder/runs" \
  -H "X-Internal-Secret: $INTERNAL_API_SECRET" \
  -H "X-User-Id: $ADMIN_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Remaining external dependencies

- MetaBrainz commercial agreement before enabling MusicBrainz in production  
- Spotify developer app for enrichment  
- Redis + worker process for daily schedule  
- Object storage for durable multi-instance exports (local disk fallback works for single-node/dev)  
- TikTok/Instagram/X commercial APIs if those connectors are ever enabled  

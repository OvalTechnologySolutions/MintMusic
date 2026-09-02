# MintMusic — Product Readiness Checklist

Branch: **`backend-v2`**

This document lists everything required to take MintMusic from the current scaffold to a production-ready multi-DRM music platform.

---

## Locked product decisions

| Decision | Choice |
|----------|--------|
| Pricing | Creator sets **price per release** (`priceCents` on `Release`) |
| Albums | **Multi-track** — one `MediaAsset` per track via `Track` model |
| Regional radio | **Auto-approve** creator opt-ins when a `BroadcastLicense` covers the region |
| Taste OAuth | **AES-256-GCM encrypted** tokens at rest (`TasteConnection`) |
| Users | **Migrate JSON → PostgreSQL**; Prisma is primary when `DATABASE_URL` is set |
| DRM | **Widevine + FairPlay** multi-DRM platform (not plain signed URLs alone) |

---

## Phase 1 — Local infrastructure (you configure)

### 1. PostgreSQL

```bash
docker run --name mintmusic-db \
  -e POSTGRES_PASSWORD=mintmusic \
  -e POSTGRES_DB=mintmusic \
  -p 5432:5432 -d postgres:16
```

### 2. Redis (workers)

```bash
docker run --name mintmusic-redis -p 6379:6379 -d redis:7
```

### 3. API environment

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection |
| `INTERNAL_API_SECRET` | **Yes** | Must match web BFF |
| `PLAYBACK_JWT_SECRET` | **Yes** (32+ chars) | Playback session tokens |
| `TASTE_TOKEN_ENCRYPTION_KEY` | **Yes** (32+ chars) | Encrypt Spotify/etc OAuth tokens |
| `S3_*` | **Yes** for uploads | Object storage |
| `REDIS_URL` | For workers | DRM packaging, taste sync |
| `STRIPE_*` | For purchases | Checkout + Connect payouts |
| `DRM_*` | For protected playback | Widevine + FairPlay license URLs |
| `SPOTIFY_*` | For taste sync | Top artists/tracks import |

Generate secrets:

```bash
openssl rand -base64 32   # repeat for each secret
```

### 4. Bootstrap database

```bash
npm install
cd apps/api
npm run db:push
npm run db:seed              # discovery channels + broadcast licenses
npm run db:migrate-users     # JSON users → Postgres
npm run dev                  # API on :4000
npm run worker               # separate terminal — DRM + taste jobs
```

### 5. Web environment

```bash
cp apps/web/env.local.example apps/web/.env.local
```

Set `INTERNAL_API_SECRET`, `AUTH_SECRET`, OAuth client IDs, `NEXT_PUBLIC_API_URL=http://localhost:4000`.

```bash
npm run dev:web
```

---

## Phase 2 — Object storage & uploads

### S3 / Cloudflare R2

1. Create bucket `mintmusic-media`
2. Enable **CORS** for `PUT` from your web origin:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Set all `S3_*` vars in `apps/api/.env`

### Creator upload flow (implemented)

1. `POST /v1/media/upload-intent` → presigned URL
2. Browser uploads mp3/wav/mp4 directly to S3
3. `POST /v1/media/:id/complete` → queues **DRM packaging job**
4. `POST /v1/catalog/releases` with `tracks[]` for albums or `mediaAssetId` for singles
5. Set `priceCents`, then `PATCH /v1/catalog/releases/:id/publish`

---

## Phase 3 — Multi-DRM platform (Widevine + FairPlay)

MintMusic must operate as a **licensed multi-DRM distributor**. Plain HLS/signed URLs are a dev fallback only.

### What you need externally

| Requirement | Provider options | Your action |
|-------------|------------------|-------------|
| **Widevine** license server | EZDRM, Axinom, PallyCon, BuyDRM | Sign contract; get LA URL |
| **FairPlay** license server + FPS cert | Same vendors or Apple direct | Upload FPS cert; get LA URL |
| **Packaging** | AWS MediaConvert + MediaPackage, Shaka Packager, FFmpeg | Transcode → CMAF/fMP4 |
| **Apple Developer** | Apple Developer Program | FairPlay Streaming certificate |
| **Google Widevine** | Google Widevine CAS | Register as DRM service (if self-hosting) |

### Environment

```env
DRM_PROVIDER=ezdrm          # or axinom, pallycon, aws_mediaconvert
DRM_WIDEVINE_LA_URL=https://your-widevine-license-server/...
DRM_FAIRPLAY_LA_URL=https://your-fairplay-license-server/...
DRM_FAIRPLAY_CERTIFICATE_URL=https://yourdomain.com/fps-cert.cer
DRM_CONTENT_ID_PREFIX=mintmusic
```

### Pipeline (worker implements packaging)

```
Upload (mp3/wav/mp4)
  → transcode mezzanine (AAC-LC + H.264 for video)
  → encrypt CENC (Widevine) + SAMPLE-AES (FairPlay)
  → upload HLS + DASH manifests to S3
  → register content key ID with DRM vendor
  → MediaAsset.drmStatus = ready
```

Run worker: `npm run worker` (requires `REDIS_URL` + `DATABASE_URL`).

### Web playback (still to wire in frontend)

- **Chrome/Android:** Shaka Player or dash.js + Widevine
- **Safari/iOS:** native HLS + FairPlay (`EME` + FPS certificate)
- Call `POST /v1/collection/playback-token` with `drmSystem: "widevine" | "fairplay"`
- Response includes `drm.manifestUrl`, `drm.licenseUrl`, `drm.fairplayCertificateUrl`

### Multi-DRM qualification checklist

- [ ] Sign DRM vendor agreement (EZDRM/Axinom/PallyCon)
- [ ] Obtain Apple FairPlay Streaming Deployment Package
- [ ] Generate and host FPS certificate
- [ ] Register Widevine service (if not using vendor-hosted LA)
- [ ] Content key rotation policy documented
- [ ] HDCP output protection policy (studio requirements)
- [ ] Offline download policy (if offered later)
- [ ] Penetration test on license endpoint (token binding)

---

## Phase 4 — Broadcast licensing (regional radio)

### How it works

- `BroadcastLicense` records cover regions (seeded: `US`, `US-WC`)
- Creator calls `POST /v1/radio/opt-in` → **auto-approved** if license exists
- Release added to `RadioRotation` on matching `DiscoveryChannel`
- Unlicensed regions return `403` with guidance

### What you must configure per target region

| Region | Typical licenses needed | Action |
|--------|-------------------------|--------|
| US | PRO (ASCAP/BMI/SESAC), mechanical (MLC) | Legal review; add `BroadcastLicense` rows |
| UK | PRS + PPL | Register with collecting societies |
| EU | GEMA/SACEM/etc. per territory | Territory array on license record |
| CA | SOCAN, Re:Sound | Separate license rows |

Insert licenses via Prisma Studio or admin script:

```bash
npm run db:studio -w @mintmusic/api
```

Fields: `regionCode`, `licenseType` (mechanical|performance|sync|blanket), `rightsHolder`, `territories[]`, `validFrom`, `validTo`, `documentUrl`.

---

## Phase 5 — Taste profile (encrypted OAuth)

### Implemented

- `POST /v1/taste/callback` — Spotify token exchange + **AES-256-GCM** storage
- `POST /v1/taste/sync` — queues worker to merge top artists/tracks
- `DELETE /v1/taste/disconnect/:platform` — GDPR token deletion

### Configure per platform

| Platform | Env vars | Dashboard |
|----------|----------|-----------|
| Spotify | `SPOTIFY_CLIENT_ID/SECRET` | [Spotify Developer](https://developer.spotify.com/dashboard) |
| SoundCloud | `SOUNDCLOUD_CLIENT_ID` | SoundCloud app registration |
| TikTok | `TIKTOK_CLIENT_KEY/SECRET` | TikTok Developer Portal |
| Apple Music | `APPLE_MUSIC_*` | Apple Developer + MusicKit |

Redirect URI for all: `{WEB_URL}/settings?tab=taste&platform={platform}`

---

## Phase 6 — User migration & auth

When `DATABASE_URL` is set, all user operations use **PostgreSQL automatically**.

One-time migration from legacy JSON:

```bash
npm run db:migrate-users
```

OAuth sign-in (`POST /v1/auth/oauth`) upserts into Postgres going forward.

---

## Phase 7 — Payments (not yet wired)

| Task | Status |
|------|--------|
| Stripe Connect onboarding | Implemented (Settings) |
| Release purchase Checkout | **TODO** — create session, webhook → `Purchase` row |
| Price from `Release.priceCents` | Schema ready |
| Creator payout split | Stripe Connect |

---

## Phase 8 — Web app BFF routes (not yet wired)

Wire Next.js API routes to new backend endpoints:

| Web route (TODO) | Backend |
|------------------|---------|
| `/api/catalog/*` | `/v1/catalog/*` |
| `/api/feed/*` | `/v1/feed/*` |
| `/api/discover/*` | `/v1/discover/*` |
| `/api/collection/*` | `/v1/collection/*` |
| `/api/taste/*` | `/v1/taste/*` |
| `/api/radio/*` | `/v1/radio/*` |

---

## Phase 9 — Production deployment

| Service | Recommendation |
|---------|----------------|
| API | Fly.io, Railway, or AWS ECS |
| Postgres | Neon, Supabase, or RDS |
| Redis | Upstash or ElastiCache |
| Media | Cloudflare R2 + CDN |
| DRM | Vendor-hosted LA (EZDRM/Axinom) |
| Web | Vercel |

### Pre-launch checklist

- [ ] All secrets in vault (not `.env` in repo)
- [ ] `DATABASE_URL` + migrations applied
- [ ] JSON users migrated
- [ ] S3 CORS + bucket policy locked down
- [ ] DRM vendor live (not `mock`)
- [ ] Worker process running (DRM + taste)
- [ ] Broadcast licenses for launch regions
- [ ] Stripe webhooks configured
- [ ] Rate limiting on auth + upload endpoints
- [ ] GDPR: taste disconnect + user deletion flow tested
- [ ] Monitoring: health `/v1/health` checks all green

---

## Health endpoint targets

`GET /v1/health` should show:

```json
{
  "status": "ok",
  "checks": {
    "database": true,
    "storage": true,
    "playback": true,
    "drm": true,
    "tasteEncryption": true
  }
}
```

---

## Quick command reference

```bash
# From repo root
npm run dev:api
npm run dev:web
npm run worker
npm run db:push
npm run db:seed
npm run db:migrate-users
npm run build:api
```

See also: [BACKEND_SETUP.md](./BACKEND_SETUP.md)

# MintMusic Backend v2 — Setup & Configuration

Branch: **`backend-v2`**

This guide covers everything you need to run the restructured API for **creator** (uploads, posts, analytics, radio) and **collector** (feed, discover, collection, taste profile) features.

---

## Architecture overview

```
apps/api/
├── prisma/schema.prisma     # PostgreSQL data model
├── src/
│   ├── config/              # Validated environment (Zod)
│   ├── lib/                 # Prisma, S3, playback tokens
│   ├── middleware/          # Auth, errors, creator gate
│   ├── modules/
│   │   ├── creator/         # media, catalog, posts, analytics, radio
│   │   └── collector/       # feed, discover, collection, taste
│   ├── routes/              # Legacy + v1 mount
│   └── app.ts
```

**Stack decisions**

| Concern | Choice | Why |
|---------|--------|-----|
| Database | **PostgreSQL + Prisma** | Relational data (follows, purchases, analytics) |
| Media storage | **S3-compatible** (AWS S3, Cloudflare R2, MinIO) | Scalable uploads; presigned direct-to-storage |
| Playback security | **Short-lived HMAC tokens** | Owned content only; no permanent public URLs |
| Payments | **Stripe Connect** (existing) | Creator payouts + store purchases |
| Background jobs | **BullMQ + Redis** (planned) | Transcode, taste sync, feed fan-out |
| Auth | **NextAuth → BFF → API** | `X-Internal-Secret` + `X-User-Id` headers |

---

## Quick start (local)

### 1. PostgreSQL

```bash
# Docker example
docker run --name mintmusic-db -e POSTGRES_PASSWORD=mintmusic -e POSTGRES_DB=mintmusic -p 5432:5432 -d postgres:16
```

### 2. Environment

```bash
cp apps/api/.env.example apps/api/.env
```

Minimum required for v2 features:

```env
DATABASE_URL=postgresql://postgres:mintmusic@localhost:5432/mintmusic
INTERNAL_API_SECRET=change-me-match-web-env
PLAYBACK_JWT_SECRET=generate-32-char-random-string-here!!
```

Generate secrets:

```bash
openssl rand -base64 32
```

### 3. Migrate & seed

```bash
cd apps/api
npm install
npm run db:push          # or db:migrate for migration history
npm run db:seed          # discovery channels
npm run dev
```

Verify: http://localhost:4000/v1/health

```json
{
  "status": "ok",
  "checks": { "database": true, "storage": false, "playback": false }
}
```

---

## Feature configuration matrix

| Feature | Required env | Optional / later |
|---------|--------------|------------------|
| User auth (legacy JSON) | `INTERNAL_API_SECRET` | Migrate users to Postgres |
| Creator uploads | `DATABASE_URL`, S3 vars | Redis for transcode queue |
| Secure playback | `PLAYBACK_JWT_SECRET`, S3 vars | CloudFront signed URLs |
| Store purchases | Stripe keys | Webhooks |
| Collector feed | `DATABASE_URL` | Redis cache |
| Discovery radio | `DATABASE_URL`, seed channels | Worker for rotations |
| Taste profile | `DATABASE_URL`, platform OAuth | `REDIS_URL`, worker |

---

## S3 / object storage (uploads)

Required for **mp3, wav, mp4** uploads:

```env
S3_BUCKET=mintmusic-media
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Cloudflare R2 example:
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://media.yourdomain.com

MEDIA_MAX_BYTES=524288000
```

**Upload flow**

1. `POST /v1/media/upload-intent` → presigned PUT URL
2. Client uploads directly to S3
3. `POST /v1/media/:id/complete` → marks ready (transcode job when worker exists)
4. `POST /v1/catalog/releases` → attach media + price

---

## Playback security

```env
PLAYBACK_JWT_SECRET=<32+ chars>
PLAYBACK_TOKEN_TTL_SECONDS=900
```

Collectors call `POST /v1/collection/playback-token` after purchase. Response includes a time-limited stream URL. Tokens are bound to user + release + session.

**Production recommendation:** Serve audio through CloudFront with signed URLs; keep tokens server-side only.

---

## Taste profile (Spotify, Apple Music, SoundCloud, TikTok)

```env
TASTE_TOKEN_ENCRYPTION_KEY=<32+ chars for AES at rest>

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

SOUNDCLOUD_CLIENT_ID=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

APPLE_MUSIC_TEAM_ID=
APPLE_MUSIC_KEY_ID=
APPLE_MUSIC_PRIVATE_KEY_PATH=
```

| Platform | Status | Notes |
|----------|--------|-------|
| Spotify | OAuth scaffold live | Needs app in Spotify Developer Dashboard |
| SoundCloud | Planned | OAuth2 client credentials |
| TikTok | Planned | Login Kit + research API approval |
| Apple Music | Manual + MusicKit | Requires Apple Developer Program |

`POST /v1/taste/sync` queues a worker to merge top artists/tracks into `taste_profiles`.

---

## API route map

### Creator (requires `creatorStatus: approved`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/media/upload-intent` | Presigned upload (mp3/wav/mp4) |
| POST | `/v1/media/:id/complete` | Finalize upload |
| POST | `/v1/catalog/releases` | Create single/album/video/visualizer + price |
| PATCH | `/v1/catalog/releases/:id/publish` | Publish to store |
| GET | `/v1/catalog/releases/mine` | List own releases |
| POST | `/v1/posts` | Post → follower feeds |
| GET | `/v1/analytics/dashboard` | Sales + listens |
| POST | `/v1/radio/opt-in` | Regional radio opt-in (auto-approved if licensed) |
| GET | `/v1/radio/regions` | Licensed broadcast regions |

### Collector

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/feed` | Posts from followed artists |
| POST/DELETE | `/v1/feed/follow/:creatorId` | Follow/unfollow |
| GET | `/v1/discover/channels` | Discovery radios |
| GET | `/v1/discover/store` | Album store + search |
| GET | `/v1/collection` | Owned releases |
| POST | `/v1/collection/playback-token` | Secure play URL |
| POST | `/v1/collection/plays` | Record listen event |
| GET | `/v1/taste/profile` | Taste profile |
| GET | `/v1/taste/connect/:platform` | Start platform OAuth |
| POST | `/v1/taste/callback` | Store encrypted OAuth tokens |
| DELETE | `/v1/taste/disconnect/:platform` | Remove tokens (GDPR) |

---

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Pricing | Creator-controlled **price per release** |
| 2 | Albums | **Multi-track** with per-track media assets |
| 3 | Regional radio | **Auto-approve** when `BroadcastLicense` covers region |
| 4 | Taste OAuth | **Encrypted at rest** (AES-256-GCM) |
| 5 | Users | **Migrate JSON → Postgres** (`npm run db:migrate-users`) |
| 6 | DRM | **Widevine + FairPlay** multi-DRM (see [PRODUCT_READINESS.md](./PRODUCT_READINESS.md)) |

---

## Next implementation steps

1. [ ] Run Postgres + Redis + `npm run db:push` + `db:seed` + `db:migrate-users`
2. [ ] Configure S3/R2 bucket with CORS for browser uploads
3. [ ] Set `PLAYBACK_JWT_SECRET`, `TASTE_TOKEN_ENCRYPTION_KEY`, test health checks
4. [ ] Sign DRM vendor + configure `DRM_WIDEVINE_LA_URL` / `DRM_FAIRPLAY_LA_URL`
5. [ ] Run worker: `npm run worker` (DRM packaging + taste sync)
6. [ ] Add real `BroadcastLicense` records for launch territories (legal)
7. [ ] Wire Next.js BFF routes to `/v1/catalog`, `/v1/feed`, etc.
8. [ ] Stripe Checkout → `Purchase` records
9. [ ] Frontend: Shaka Player (Widevine) + FairPlay EME for collection playback

Full checklist: **[PRODUCT_READINESS.md](./PRODUCT_READINESS.md)**

---

## Root scripts

```bash
npm run dev:api          # from repo root
npm run build:api
```

See also: [ARCHITECTURE.md](./ARCHITECTURE.md)

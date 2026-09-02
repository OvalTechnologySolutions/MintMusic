# MintMusic — Next Steps (branch: `base44`)

Snapshot branch after OAuth, Postgres (Prisma Console), backend v2 API, web BFF scaffold, and collector store UI. **Stripe deferred** — reconfigure later via [STRIPE_SETUP.md](./STRIPE_SETUP.md).

---

## What works on `base44`

| Feature | Status |
|---------|--------|
| Google OAuth + user sync to Postgres | Done |
| API health + Prisma schema | Done |
| Creator/collector API routes (v2) | Scaffolded |
| Web BFF (`/api/discover`, `/api/collection`, etc.) | Partial |
| Collector store + collection UI | Basic |
| Stripe Connect + release checkout | Code present; **not configured** |
| Creator uploads (R2/S3) | API ready; **UI + storage config needed** |
| Feed, taste profile, DRM playback | API ready; **UI + workers needed** |

---

## Daily dev commands

```bash
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
curl http://127.0.0.1:4000/v1/health   # expect database: true
```

---

## Branch roadmap (recommended order)

### 1. `feature/creator-uploads` — **start here**

**Goal:** Real mp3/wav/mp4 uploads and published releases (no Stripe).

**Configure** `apps/api/.env`:

```env
S3_BUCKET=mintmusic-media
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://...
```

Enable bucket CORS for `http://localhost:3000` (PUT, GET, HEAD).

**Build:**

- Creator dashboard: upload-intent → PUT to S3 → complete → catalog create → publish
- BFF: `POST /api/media/[id]/complete`, `PATCH /api/catalog/releases/[id]/publish`
- Verify health: `storage: true`

---

### 2. `feature/collector-feed`

**Goal:** Follow artists + post feed.

**Build:**

- `GET /api/feed` UI on collector hub
- Follow/unfollow on creator profiles
- Creator “new post” form → `POST /v1/posts`

**Env:** DB + OAuth only (already done).

---

### 3. `feature/taste-profile`

**Goal:** Spotify taste connect + profile display.

**Configure** `apps/api/.env`:

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

Redirect: `http://localhost:3000/settings?tab=taste&platform=spotify`

**Build:** Settings taste tab, OAuth callback → `POST /api/taste/callback`, show profile.

---

### 4. `feature/worker-jobs`

**Goal:** Redis + background DRM packaging and taste sync.

```bash
docker run --name mintmusic-redis -p 6379:6379 -d redis:7
```

```env
REDIS_URL=redis://localhost:6379
```

```bash
npm run worker
```

---

### 5. `feature/drm-playback`

**Goal:** Play owned releases (Widevine + FairPlay).

Requires DRM vendor URLs + Shaka/FairPlay player in collection UI. See [PRODUCT_READINESS.md](./PRODUCT_READINESS.md).

---

### 6. `feature/stripe-payments` (when ready)

Follow [STRIPE_SETUP.md](./STRIPE_SETUP.md): Connect, webhooks, `db:approve-creator`, `db:seed-demo-release`, test checkout.

---

## Environment checklist

### API (`apps/api/.env`) — minimum today

- [x] `DATABASE_URL` (Prisma Console)
- [x] `INTERNAL_API_SECRET`
- [x] `PLAYBACK_JWT_SECRET` (32+ chars)
- [x] `TASTE_TOKEN_ENCRYPTION_KEY` (32+ chars)
- [ ] `S3_*` (for uploads)
- [ ] `REDIS_URL` (for workers)
- [ ] `STRIPE_*` (deferred)
- [ ] `DRM_*` (production playback)

### Web (`apps/web/.env.local`)

- [x] `AUTH_SECRET`, `AUTH_URL`
- [x] `GOOGLE_CLIENT_ID/SECRET`
- [x] `INTERNAL_API_SECRET` (match API)
- [x] `NEXT_PUBLIC_API_URL=http://127.0.0.1:4000`

---

## Dev helper scripts

```bash
npm run db:push
npm run db:seed
npm run db:approve-creator -- email@example.com
npm run db:seed-demo-release -- email@example.com
```

---

## Docs index

| Doc | Purpose |
|-----|---------|
| [BACKEND_SETUP.md](./BACKEND_SETUP.md) | API routes + env matrix |
| [PRODUCT_READINESS.md](./PRODUCT_READINESS.md) | Production checklist |
| [STRIPE_SETUP.md](./STRIPE_SETUP.md) | Payments (later) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Monorepo layout |

---

## Suggested PR merge order

```
base44 → feature/creator-uploads → feature/collector-feed → feature/taste-profile → feature/worker-jobs → feature/drm-playback → feature/stripe-payments
```

# Deploy MintMusic to mintmusic.ai

Quick-deploy guide for the `quickdeploy` branch MVP: landing page, public discover, user login, and public profiles.

## Architecture

| Service | Host | Platform |
|---------|------|----------|
| Web (Next.js) | `mintmusic.ai` | Vercel |
| API (Express) | `api.mintmusic.ai` | Railway / Fly.io / Docker |
| Database | — | Neon / Supabase Postgres |

## 1. Database (Neon — configured)

This project is linked to Neon project **MintMusic** (`dark-king-03663821`) in org `org-dry-grass-17126034`, branch `production`.

```bash
# One-time setup (already done if .neon exists)
neon link --project-id dark-king-03663821 --org-id org-dry-grass-17126034
neon env pull --file apps/api/.env -s postgres -s object-storage

# Schema + seed
npm run db:push -w @mintmusic/api
npm run db:seed -w @mintmusic/api
```

Neon services in use:
- **Lakebase Postgres** — `DATABASE_URL` (pooled) + `DATABASE_URL_UNPOOLED` (migrations)
- **Object Storage** — `uploads` bucket (private), credentials as `AWS_*` env vars

For new dev branches: `neon checkout dev-<feature>` then `neon env pull --file apps/api/.env`.

### Alternative: Neon / Supabase (manual)

1. Create a Postgres database at [neon.tech](https://neon.tech) or Supabase.
2. Copy the connection string → `DATABASE_URL`.

## 2. API deployment (Railway)

### Connect Neon to Railway

After `neon link`, sync production env vars to Railway:

```bash
# 1. Log in and link your API service
npm i -g @railway/cli
railway login
railway link          # select or create the MintMusic API service

# 2. Preview vars (dry run)
node scripts/sync-production-env.mjs

# 3. Push Neon + app secrets to Railway
node scripts/sync-production-env.mjs --apply
```

The sync script pulls fresh Neon credentials (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AWS_*`) and combines them with app secrets already in `apps/api/.env` (`INTERNAL_API_SECRET`, Stripe keys, etc.).

**Railway variables set automatically:**

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon (pooled) |
| `DATABASE_URL_UNPOOLED` | Neon (direct — for deploy migrations) |
| `AWS_ACCESS_KEY_ID` | Neon Object Storage |
| `AWS_SECRET_ACCESS_KEY` | Neon Object Storage |
| `AWS_ENDPOINT_URL_S3` | Neon Object Storage |
| `AWS_REGION` | Neon (`us-east-2`) |
| `CORS_ORIGIN` | `https://mintmusic.ai` |
| `WEB_URL` | `https://mintmusic.ai` |
| `NODE_ENV` | `production` |
| `INTERNAL_API_SECRET` | `apps/api/.env` |
| `PLAYBACK_JWT_SECRET` | `apps/api/.env` |
| `STRIPE_*` | `apps/api/.env` (if set) |

Add a **deploy command** or Dockerfile start command in Railway:

```bash
npm run db:push -w @mintmusic/api && node apps/api/dist/index.js
```

Or use the Docker image:

```bash
docker build -f apps/api/Dockerfile -t mintmusic-api .
```

Set custom domain `api.mintmusic.ai` in Railway → Settings → Domains.

### Option B: Fly.io / Docker (manual)

```bash
# Build from repo root
docker build -f apps/api/Dockerfile -t mintmusic-api .
docker run -p 4000:4000 \
  -e DATABASE_URL="..." \
  -e INTERNAL_API_SECRET="..." \
  -e CORS_ORIGIN="https://mintmusic.ai" \
  -e WEB_URL="https://mintmusic.ai" \
  mintmusic-api
```

Set custom domain `api.mintmusic.ai` in your host's dashboard.

**Required API env vars:**

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
INTERNAL_API_SECRET=<openssl rand -base64 32>
CORS_ORIGIN=https://mintmusic.ai
WEB_URL=https://mintmusic.ai
PLAYBACK_JWT_SECRET=<openssl rand -base64 32>
```

## 3. Web deployment (Vercel)

### Connect env vars to Vercel

```bash
npx vercel login
npx vercel link       # import OvalTechnologySolutions/MintMusic, branch quickdeploy

# Preview then apply web production vars
node scripts/sync-production-env.mjs
node scripts/sync-production-env.mjs --apply
```

Vercel does **not** need `DATABASE_URL` — the web app talks to the API at `api.mintmusic.ai`. The sync script sets:

| Variable | Value |
|----------|-------|
| `AUTH_URL` | `https://mintmusic.ai` |
| `NEXT_PUBLIC_APP_URL` | `https://mintmusic.ai` |
| `NEXT_PUBLIC_API_URL` | `https://api.mintmusic.ai` |
| `INTERNAL_API_SECRET` | Same as Railway API |
| `AUTH_SECRET` | From `apps/web/.env.local` |
| `GOOGLE_CLIENT_*` | From `apps/web/.env.local` |

### Manual setup

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to repository root (uses `vercel.json`).
3. Deploy branch **`quickdeploy`**.
4. Add environment variables:

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://mintmusic.ai
NEXT_PUBLIC_APP_URL=https://mintmusic.ai
NEXT_PUBLIC_API_URL=https://api.mintmusic.ai
INTERNAL_API_SECRET=<same as API>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

4. Add custom domain `mintmusic.ai` in Vercel → Domains.

## 4. DNS (mintmusic.ai)

| Record | Type | Value |
|--------|------|-------|
| `@` | A / CNAME | Vercel (see Vercel domain setup) |
| `api` | CNAME | Railway/Fly hostname |

## 5. OAuth redirect URIs

**Google Cloud Console** → OAuth client → Authorized redirect URIs:

- `https://mintmusic.ai/api/auth/callback/google`

**GitHub** → OAuth App → Authorization callback URL:

- `https://mintmusic.ai/api/auth/callback/github`

## 6. Verify deployment

```bash
# API health
curl https://api.mintmusic.ai/v1/health

# Public discover (no auth)
curl https://api.mintmusic.ai/v1/discover/store

# Web pages
open https://mintmusic.ai
open https://mintmusic.ai/discover
open https://mintmusic.ai/login
```

Sign in with Google or GitHub, then visit Settings → Account for your public profile URL (`/u/{userId}`).

## 7. Local development

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/env.local.example apps/web/.env.local
# Fill in secrets and DATABASE_URL

npm install
npm run dev:api          # :4000
npm run dev:web          # :3000
```

## 8. Run tests

```bash
npm test
npm run build:web
npm run build:api
```

## MVP routes

| URL | Access | Description |
|-----|--------|-------------|
| `/` | Public | Product landing page |
| `/discover` | Public | Browse releases |
| `/login` | Public | OAuth sign-in |
| `/u/[userId]` | Public | User public profile |
| `/settings` | Auth | Account & profile settings |
| `/collector` | Auth | Collector hub |

## Optional next steps

- Stripe keys for checkout
- Cloudflare R2 for media uploads
- Redis + worker for background jobs
- Prisma migrations (replace `db:push` for production safety)

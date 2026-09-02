# MintMusic — Cloud Agent notes

Guidance for Cursor Cloud Agents (including Bugbot Autofix).

## Repo layout

- `apps/web` — Next.js (`@mintmusic/web`)
- `apps/api` — Express API (`@mintmusic/api`)
- `packages/shared` — shared types / social validation
- `packages/contracts` — Hardhat / Solidity

## Setup

```bash
npm ci
npm run db:generate -w @mintmusic/api
```

Tests that need Postgres expect `DATABASE_URL` (see `.github/workflows/ci.yml`).

## Verify changes

```bash
npm test
npm run lint:web
npm run build:api
```

For web build in CI-like conditions:

```bash
AUTH_SECRET=ci-test-secret-minimum-32-characters-long \
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
npm run build:web
```

## Autofix expectations

- Fix only the Bugbot findings in scope; keep diffs minimal.
- Do not commit `.env` files or secrets.
- Prefer existing patterns for auth (`INTERNAL_API_SECRET`), creator gating, Stripe webhooks, and social-link validation in `@mintmusic/shared`.
- Bugbot project rules live in `.cursor/BUGBOT.md` (and nested package copies).

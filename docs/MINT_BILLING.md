# MintMusic billing — architecture & operations

Sprint assumptions (centralized in `apps/api/src/config/billing.ts` and `@mintmusic/shared`):

| Setting | Value |
| --- | --- |
| Artist subscription | **$9.99 USD / month** |
| Artist introductory offer | **First 12 calendar months free** (one redemption per account) |
| Mint exchange | **1 Mint = $1 USD** (100 minor units = 1 Mint) |
| Song save | **25 units (0.25 Mint)** |
| Minimum Mint purchase | **$5** (suggested $5 / $10 / $25) |

Mint is **closed-loop application credit**. This sprint does **not** implement crypto, transfers, withdrawals, expiration, or auto top-ups.

## Architecture

- **Web (Next.js BFF)** → authenticated proxies under `/api/wallet`, `/api/mint`, `/api/library`, `/api/artist/subscription`, `/api/offline`
- **API (Express)** → `/v1/wallet`, `/v1/mint`, `/v1/library`, `/v1/artist/subscription`, `/v1/offline`, `/v1/stream`, Stripe webhook `/v1/stripe/webhook`
- **Postgres (Prisma)** → wallets, append-only ledger, top-up orders, processed Stripe events, artist subscriptions + intro redemptions, song entitlements, library visibility, offline leases, wallet deficits
- **Stripe** → Checkout for Mint top-ups; Subscriptions for Artist free-year + paid renewal; Connect unchanged for creator payouts

Wallet balances update **only** after verified webhook success. Checkout success redirects never credit Mint by themselves.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | API | Test/live secret |
| `STRIPE_WEBHOOK_SECRET` | API | Webhook signature verification |
| `STRIPE_ARTIST_PRICE_ID` | API | Recurring $9.99/month Price ID |
| `MINT_TOPUP_MAX_CENTS` | API | Max top-up (default `100000` = $1000) |
| `OFFLINE_LEASE_SECONDS` | API | Offline auth lease TTL (default 7 days) |
| `INTERNAL_API_SECRET` | API + Web | BFF auth |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | API | Postgres |
| `PLAYBACK_JWT_SECRET` | API | Short-lived media tokens |
| OAuth + `AUTH_SECRET` | Web | NextAuth |

## Local development

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/env.local.example apps/web/.env.local
# Set DATABASE_URL, INTERNAL_API_SECRET, STRIPE_* (test mode), OAuth keys

npm run db:push -w @mintmusic/api
npm run db:seed -w @mintmusic/api

# Terminal A
npm run dev:api

# Terminal B — Stripe webhooks
stripe listen --forward-to localhost:4000/v1/stripe/webhook

# Terminal C
npm run dev:web
```

Open http://localhost:3000 — sign in with Google/GitHub (demo mode explores UI without paid APIs).

## Tests

```bash
# Unit + API without DB
npm test

# Billing acceptance (requires local Postgres + apps/api/.env)
TEST_WITH_DB=true npm test -- apps/api/src/__tests__/mint-billing.test.ts
```

## Stripe product setup (test mode)

1. Create Product **MintMusic Artist Subscription** with recurring Price **$9.99 / month**.
2. Copy Price ID → `STRIPE_ARTIST_PRICE_ID`.
3. Mint top-ups use inline `price_data` (no Product ID required).
4. Webhook endpoint: `https://api.mintmusic.ai/v1/stripe/webhook` (or Stripe CLI locally).
5. Events: `checkout.session.*`, `customer.subscription.*`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.funds_withdrawn`, `account.updated`.
6. Enable Customer Portal for payment-method updates.

Do **not** activate live billing during development.

## Artist free year behavior

- Activation without a payment method is allowed (`trial_settings.end_behavior.missing_payment_method = cancel`).
- Redemption is stored on **User** + unique `ArtistIntroOfferRedemption` so deleting a creator profile cannot reset the offer.
- Cancel during free period → `cancel_at_period_end`; access continues through the free-period end.
- Paid renewal requires a payment method **and** explicit `authorize-renewal`. Without that, no charge; paid artist features pause.
- Artist subscription is separate from the listener Mint wallet.

## Legacy library migration

```bash
npm run db:migrate-legacy-purchases -w @mintmusic/api
```

Existing `purchases` rows become `SongEntitlement` (`legacy_purchase`) + visible `LibraryItem` with **no Mint debit**.

Client-only `localStorage` crates from the demo Mint UI are **not** auto-imported (no server identity). Documented product choice for this sprint.

## Offline downloads

- Interpreted as **Download for offline listening in MintMusic** (Cache Storage, account-scoped).
- Offline auth lease must be revalidated when expired; revocation applies on reconnect or lease expiry—not instantly on an offline device.
- **Not DRM.** Signed URLs and app cache cannot guarantee prevention of extraction or recording. Enforceable DRM would require Widevine/FairPlay offline licenses and supported browsers (see `docs/PRODUCT_READINESS.md`).

## Refund / dispute policy (commercial — unresolved)

Engineering records compensating ledger entries and may open a **wallet deficit** that blocks further spending when reversed funds were already spent. Commercial decisions (artist goodwill credits, chargeback fees, entitlement clawback timing) are **not** invented here — escalate to ops/legal.

## Artist payouts / royalties

Out of scope. Payment and entitlement references are retained for a future payout system. Do not invent royalty splits in this sprint.

## Deploy / rollback

**Deploy**

1. Set new env vars on Railway API (`STRIPE_ARTIST_PRICE_ID`, optional max/lease).
2. `npm run db:push -w @mintmusic/api` (or migrate) against Neon.
3. Optionally run legacy purchase backfill.
4. Deploy API then Web.
5. Confirm webhook receives test events.

**Rollback**

1. Redeploy previous API/Web revisions.
2. Schema additive tables can remain; disable UI entry points / unset `STRIPE_ARTIST_PRICE_ID` to stop new subs.
3. Do not drop ledger tables if any production credits exist.

## Assumptions & remaining dependencies

- Monthly Artist billing interval and 1:1 Mint/$ exchange are sprint assumptions.
- Seed/synth discovery tracks are **preview-only** until backed by `saveEligible` published media.
- Stream route requires configured S3 + playback JWT.
- Full Serwist/Workbox SW packaging is deferred; offline uses Cache Storage APIs directly.

# MintMusic — Bugbot review & Autofix rules

Musician-first monorepo: Next.js web (`apps/web`), Express API (`apps/api`), shared types (`packages/shared`), Hardhat/Solidity (`packages/contracts`).

## Autofix guidance

When fixing findings:

- Prefer the smallest safe change that resolves the reported bug.
- Do not invent new product features, redesign UI, or expand scope beyond the finding.
- Preserve existing auth, wallet, Stripe, and creator-gating patterns.
- Run `npm test` after substantive logic changes. For web-only UI/auth changes also run `npm run lint:web` when practical.
- Do not commit secrets, `.env`, wallet private keys, or real Stripe/API credentials.
- Prefer **Create New Branch** Autofix mode so humans review before merge.

## Architecture invariants

- Default branch is `main`. Deploy line also uses `quickdeploy`.
- Web talks to API via `apps/web/lib/api/` and server-side `INTERNAL_API_SECRET` (`apps/web/lib/server-api.ts`).
- User roles / `creatorStatus` gate creator surfaces; do not bypass approval checks.
- Wallet connect lives under **Settings → Wallet**, not the login page.
- Social link validation lives in `@mintmusic/shared` — reuse it; do not duplicate hostname rules.
- On-chain marketplace / IPFS uploads are incomplete; do not treat mock or placeholder flows as production-safe payment or content integrity.

## Always flag

- Auth bypasses, missing `INTERNAL_API_SECRET` checks, or leaking secrets into client bundles (`NEXT_PUBLIC_*` must never hold private keys/secrets).
- Stripe webhook signature verification gaps or trusting unverified webhook bodies.
- Smart-contract payment bugs: overpayment without refund, missing `maxSupply`/`price`/`uri` validation, unsafe ETH transfers, reentrancy.
- Trusting client-supplied prices, token IDs, or wallet ownership without server/chain verification.
- XSS / open redirects in OAuth return URLs or user-controlled profile links.
- Race conditions around creator approval, payouts, or balance updates.
- Breaking npm workspace package boundaries (importing app code into `packages/*` incorrectly).

## Ignore / low priority

- Pure copy, spacing, and styling nits unless they break layout or a11y critically.
- Intentional MVP stubs clearly marked as mock/placeholder (still flag if they can move real money or private data).
- Generated lockfile churn without behavioral risk.

## Suggested verification

```bash
npm test
npm run lint:web
npm run build:api
```

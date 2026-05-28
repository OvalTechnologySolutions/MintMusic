# MintMusic MVP Rebuild — 2026 (`mintmusic2026`)

**Branch:** `mintmusic2026`  
**Baseline commit:** `5af59a9` (legacy MVP)  
**Companion:** [SECURITY_AUDIT_2026.md](./SECURITY_AUDIT_2026.md)

This document translates the product goal statements into an implementable MVP scope and step-by-step instructions for the next engineering session.

---

## 1. Product north star (from goal statements)

MintMusic 2026 unifies **creation**, **discovery**, and **monetization** for musicians:

1. **Creator intelligence** — Distinguish casual listeners from dedicated fans via **direct financial engagement** on releases (not vanity metrics alone).
2. **MusicMoments** — Complimentary, immersive hub: studio livestreams, collective listening, behind-the-scenes community tied to the creative process.
3. **Professional marketplace** — Artists, fans, and **brands** engage in meaningful transactions (exclusive content, influence, sponsorship-ready profiles).
4. **Industry bridge** — Discovery, networking, and spotlight features aimed at **sponsorships, collaborations, and mainstream opportunities** — musician-first, not generic social media.

**MVP principle:** Ship thin vertical slices per pillar; do not port the legacy mock UI or unaudited contract to production as-is.

---

## 2. What to retire from the legacy MVP

| Legacy artifact | Action |
|-----------------|--------|
| Mock `MOCK_RELEASES` / `MOCK_ARTISTS` | Delete; replace with API + indexer |
| Fake IPFS upload in `page.tsx` | Delete; real upload service |
| Hardcoded `CONTRACT_ADDRESS` | Move to env + per-network config |
| `YOUR_PROJECT_ID` in RainbowKit | Require `NEXT_PUBLIC_WC_PROJECT_ID` |
| `MintMusic.sol` as-is | Rewrite or fork with audit fixes (see security doc) |
| Empty `backend/` | Scaffold new API or adopt BaaS with clear boundaries |

Keep for reference only: landing page visual language, ERC-1155 “edition” concept, wallet-first auth (no passwords in v1).

---

## 3. Target MVP scope (90-day lens)

### Phase A — Foundation (weeks 1–3)

**User-visible:** Sign in with wallet, artist profile stub, one real “release” minted end-to-end on **testnet**.

| Capability | MVP acceptance |
|------------|----------------|
| Wallet auth | Connect; enforce single chain in UI |
| Artist profile | Display name, bio, links, avatar (off-chain DB) |
| Release mint | Upload audio + cover → IPFS → contract `createRelease` → listed in app |
| Primary purchase | Fan buys edition; artist receives correct ETH; overpay refunded |
| Release feed | Only on-chain releases (no mocks) |

### Phase B — Fan engagement (weeks 4–6)

| Capability | MVP acceptance |
|------------|----------------|
| Fan tiers | Tag wallets: `listener` (free plays), `supporter` (≥1 purchase), `superfan` (top N spend) |
| Release analytics (artist) | Sales count, revenue, unique collectors per release |
| Exclusive unlock | Holders see bonus track or PDF (gated by `balanceOf`) |

### Phase C — MusicMoments lite (weeks 7–9)

| Capability | MVP acceptance |
|------------|----------------|
| Scheduled session | Artist creates “Listening Party” or “Studio Hang” event |
| Live or VOD | Integrate one provider (recommend **Mux** or **Livepeer** for speed) |
| Chat | Moderated text chat; wallet-required to post |
| Free listen | Non-holders can join **live audio only**; exclusives still gated |

### Phase D — Marketplace seed (weeks 10–12)

| Capability | MVP acceptance |
|------------|----------------|
| Brand profile | Company page + “Open to sponsorship” flag |
| Opportunity post | Brand posts brief; artists apply with profile link |
| Spotlight | Curated list (admin-edited) for discovery |
| Networking | Follow artist/brand; DM deferred to v2 if needed |

**Explicitly out of MVP v1:** Full P2P encrypted messaging, secondary marketplace, mobile native apps, Shopify/Ticketmaster integrations (SRS §3.4 — phase 2).

---

## 4. Recommended technical architecture (2026)

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15+ (App Router) — web MVP                          │
│  - RainbowKit / wagmi (env-driven)                           │
│  - Server Actions or BFF routes for secrets                  │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
        ┌───────▼───────┐             ┌───────▼────────┐
        │  API (Node)    │             │  Indexer       │
        │  Fastify/tRPC  │             │  The Graph or  │
        │  + Postgres    │             │  custom worker │
        └───────┬───────┘             └───────┬────────┘
                │                             │
        ┌───────▼───────┐             ┌───────▼────────┐
        │  Redis (cache) │             │  Polygon Amoy  │
        │  Socket.IO     │             │  or Base Sepolia│
        │  (chat/events) │             │  MintMusic v2  │
        └───────────────┘             └────────────────┘
                │
        ┌───────▼───────┐
        │  IPFS/Pinata  │
        │  Mux/Livepeer │
        └───────────────┘
```

**Chain choice:** Polygon or Base (low fees, EVM, good wallet support) — align with SRS intent; avoid multi-chain sprawl until v2.

**Monorepo layout (suggested):**

```
apps/web          # Next.js
apps/api          # Node API + websockets
packages/contracts
packages/shared   # types, ABIs
docs/
```

---

## 5. Next steps — ordered checklist for developers

### Step 0 — Branch hygiene (done / verify)

```bash
git checkout mintmusic2026
git pull origin mintmusic2026   # when remote exists
```

Ensure `docs/SECURITY_AUDIT_2026.md` and this file are committed when ready.

### Step 1 — Environment template

Create `apps/web/.env.example`:

```env
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Create `apps/api/.env.example` with `DATABASE_URL`, `PINATA_JWT`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `CORS_ORIGIN`.

**Rule:** Never commit real secrets; use Vercel/Railway/Fly secrets in deployment.

### Step 2 — Contract v2

1. Copy `MintMusic.sol` → `MintMusicV2.sol`.
2. Implement: exact payment, refund overpay, `nonReentrant`, release validation, metadata URI template.
3. Hardhat/Foundry tests: purchase, sold out, double buy, failed creator payout.
4. Deploy to **Amoy** or **Base Sepolia**; record address in env.
5. Schedule external audit before mainnet.

### Step 3 — API scaffold

1. Initialize `apps/api` with Fastify or Express + Zod validation.
2. Postgres tables: `users` (wallet), `profiles`, `releases` (mirror chain), `events` (MusicMoments), `brand_opportunities`.
3. Wallet auth: SIWE (Sign-In With Ethereum) for session cookie or JWT.
4. Pinata upload route: server validates file type/size, returns CID.

### Step 4 — Web rebuild

1. `create-next-app` or move `frontend/` → `apps/web`.
2. Replace mock marketplace with `useReadContract` + indexer/API for release list.
3. Creator flow: upload → API → mint tx → poll confirmation → show in feed.
4. Chain guard: `useChainId` + switch network modal if mismatch.
5. Middleware: CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Step 5 — Fan intelligence (minimal)

1. Index `ReleasePurchased` events into Postgres.
2. Artist dashboard queries: revenue, collectors, repeat buyers.
3. UI badges: Supporter / Superfan based on thresholds (configurable).

### Step 6 — MusicMoments lite

1. `events` CRUD in API; artist schedules session.
2. Mux live stream or preroll VOD embed; store `playback_id` server-side.
3. Socket.IO room per event; require SIWE to chat.
4. Landing section: “Live now” + upcoming (public).

### Step 7 — Brand marketplace seed

1. `brand_profiles` + `opportunities` tables.
2. Artist “Apply” stores wallet + message (no payment yet).
3. Admin-only “Spotlight” CRUD (protect with API key or admin wallet allowlist).

### Step 8 — CI/CD

1. GitHub Actions: `lint`, `test`, `npm audit --audit-level=high`, contract tests.
2. Preview deploy (Vercel) for `apps/web`; API on Railway/Fly.
3. Block merge on failing audit or tests.

### Step 9 — Legal & policy (parallel track)

1. Terms of Service, Privacy Policy, DMCA agent (if user uploads).
2. Artist upload agreement (rights representation).
3. Brand sponsorship disclosure guidelines.

---

## 6. Mapping goals → MVP features

| Goal statement theme | MVP feature | Phase |
|----------------------|-------------|-------|
| Real-time insights; fans vs casual | Collector dashboard + supporter tiers | B |
| Direct financial engagement | ERC-1155 primary sales + event indexing | A, B |
| MusicMoments live / listening | Scheduled sessions + stream embed + chat | C |
| Complimentary auditory experience | Free live listen; paid exclusives gated | C |
| Artist–fan–brand marketplace | Brand profiles + opportunity posts | D |
| Monetize brand identity | Artist profile + releases + optional merch link field | A, D |
| Sponsorships & industry | Spotlight + opportunities (no payment escrow v1) | D |
| Artist discovery & networking | Follow + curated spotlight | D |
| Musician-first vs social media | Role-based UX; no generic “feed algorithm” in v1 | All |

---

## 7. Definition of done (MVP launch)

- [ ] No mock blockchain data in production build
- [ ] Contract v2 tests green; testnet address in env
- [ ] SIWE auth on API; WebSocket rooms authenticated
- [ ] IPFS uploads via server; MIME validated
- [ ] Security audit P0/P1 items closed (see SECURITY_AUDIT_2026.md)
- [ ] `npm audit` no high vulnerabilities in production lockfile
- [ ] Privacy policy + upload terms published
- [ ] One end-to-end demo script: artist mints → fan buys → artist sees analytics → MusicMoments session

---

## 8. Local development (legacy app, until rebuild lands)

```bash
# Terminal 1 — chain (optional for full flow)
cd smart-contracts && npm install && npx hardhat node

# Terminal 2 — deploy
cd smart-contracts && npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3 — frontend (use full permissions if sandbox breaks network hosts)
cd frontend && npm install && npm run dev -- -H 127.0.0.1
```

Open http://127.0.0.1:3000 — expect wallet/contract limitations documented in the security audit.

---

## 9. Suggested first PR on `mintmusic2026`

**Title:** `chore: add 2026 security audit and MVP rebuild plan`

**Includes:**

- `docs/SECURITY_AUDIT_2026.md`
- `docs/MVP_REBUILD_2026.md`
- `.env.example` files (when Step 1 is executed)
- No production behavior change until Phase A implementation PRs follow

**Following PRs (suggested order):**

1. `feat(contracts): MintMusicV2 with payment fixes and tests`
2. `feat(api): scaffold + SIWE + Pinata upload`
3. `feat(web): chain-safe release feed (no mocks)`
4. `feat(web): artist analytics dashboard`
5. `feat(moments): live session + chat`
6. `feat(marketplace): brand opportunities + spotlight`

---

## 10. Questions for product (unblock before Phase C/D)

1. **Payments:** ETH-only for MVP, or Stripe for brand deals while on-chain handles editions?
2. **MusicMoments:** Live-only for MVP, or async “listening party” (synced playback) acceptable?
3. **Brands:** Self-serve signup or curated/invited brands only at launch?
4. **Geography:** US-only first for compliance?

Document answers in this file or `docs/DECISIONS.md` as they are resolved.

---

*Prepared as part of security audit and rebuild preparation on branch `mintmusic2026`.*

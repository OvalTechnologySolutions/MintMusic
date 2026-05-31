# MintMusic

Musician-first platform for direct fan engagement, professional marketplace tools, and MusicMoments community experiences.

**Active branch:** `mintmusic2026`

## Repository structure

```
MintMusic/
├── apps/
│   ├── web/              # Next.js app (@mintmusic/web)
│   └── api/              # REST API (@mintmusic/api)
├── packages/
│   ├── shared/           # Types, social link validation (@mintmusic/shared)
│   └── contracts/        # Hardhat / Solidity (@mintmusic/contracts)
├── docs/                 # SRS, security audit, MVP plan, architecture
└── package.json          # npm workspaces root
```

## Quick start

```bash
npm install

# API
cp apps/api/.env.example apps/api/.env
# Set INTERNAL_API_SECRET and Stripe keys (test mode)

# Web — copy env.local.example → .env.local
cp apps/web/env.local.example apps/web/.env.local
# Set AUTH_SECRET, OAuth client IDs, INTERNAL_API_SECRET (match API)

npm run dev:api   # :4000
cd apps/web && npm run dev -- -H 127.0.0.1   # :3000
```

### Auth flow

| Route | Purpose |
|-------|---------|
| `/login` | OAuth sign-in (Google, GitHub) for **collectors** |
| `/collector` | Main hub (protected) |
| `/creator/apply` | Creator interest form (separate onboarding) |
| `/creator/dashboard` | Approved creators only |
| `/settings` | Account, **wallet** (RainbowKit), Stripe payouts |

Wallet connect is **not** on the login page — use **Settings → Wallet**.

### Approve creators (early access)

Until an admin UI exists, set `creatorStatus` to `approved` and `role` to `creator` in `apps/api/data/users.json`, then restart the API.

- Web: http://localhost:3000  
- API: http://localhost:4000 (health: `/health`)

## Artist social links

Platforms supported in `@mintmusic/shared`:

| Platform | Field ID |
|----------|----------|
| Website | `website` |
| YouTube | `youtube` |
| Instagram | `instagram` |
| X (Twitter) | `x` |
| TikTok | `tiktok` |
| Spotify | `spotify` |
| Apple Music | `apple_music` |
| SoundCloud | `soundcloud` |
| Bandcamp | `bandcamp` |

**API:** `GET/PUT /v1/artists/:wallet/profile`  
**UI:** Creator mode → Artist Hub panel

## Deprecated (removed)

- `backend/` — empty shell (replaced by `apps/api`)
- `frontend/` — moved to `apps/web`
- `smart-contracts/` — moved to `packages/contracts`
- Mock marketplace data — see `apps/web/legacy/`

## Documentation

- [MVP Rebuild 2026](./docs/MVP_REBUILD_2026.md)
- [Security Audit 2026](./docs/SECURITY_AUDIT_2026.md)
- [Architecture](./docs/ARCHITECTURE.md)

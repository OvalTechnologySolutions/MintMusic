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
# Install all workspaces
npm install

# Terminal 1 — API
cp apps/api/.env.example apps/api/.env
npm run dev:api

# Terminal 2 — Web
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

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

# MintMusic Architecture (2026)

## Monorepo packages

| Package | Responsibility |
|---------|----------------|
| `@mintmusic/web` | Next.js UI, wallet connect, BFF-ready client in `lib/api/` |
| `@mintmusic/api` | REST + future WebSockets; artist profiles, releases, events |
| `@mintmusic/shared` | Cross-package types, social URL validation, API contracts |
| `@mintmusic/contracts` | ERC-1155 releases (v2 planned with audit fixes) |

## API surface (v0.1)

| Method | Path | Status |
|--------|------|--------|
| GET | `/health` | Live |
| GET | `/capabilities` | Live (feature flags) |
| GET | `/v1/artists/:wallet/profile` | Live (in-memory store) |
| PUT | `/v1/artists/:wallet/profile` | Live (SIWE pending) |

### Planned routes

```
POST   /v1/uploads/audio          # Pinata / IPFS
GET    /v1/releases               # Indexed from chain
POST   /v1/releases               # Mirror + metadata
GET    /v1/moments                # MusicMoments events
POST   /v1/moments                # Schedule session
GET    /v1/brands/opportunities   # Sponsorship posts
```

## Social links data model

Defined in `packages/shared/src/artist/profile.ts`:

- One link per platform per artist (validated hostnames per platform)
- Optional `isPrimary` for hub CTA
- Persisted via API today; Postgres schema to mirror `ArtistProfile` in Phase A

## Web ↔ API

```
apps/web/lib/api/client.ts   → fetch wrapper
apps/web/lib/api/artists.ts  → profile CRUD
apps/web/lib/config.ts       → NEXT_PUBLIC_API_URL
```

## Future feature flags

Returned by `GET /capabilities`:

- `releases` — on-chain marketplace feed
- `music_moments` — livestreams / listening parties
- `brand_marketplace` — sponsorship opportunities
- `analytics` — fan tier intelligence

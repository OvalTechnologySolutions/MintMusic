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
| GET | `/v1/users/me` | Live (auth) |
| PATCH | `/v1/users/me` | Live — wallet, social links |
| GET | `/v1/users/:id/public` | Live — public profile + links |
| GET | `/v1/social/providers` | Live — OAuth integration status |
| POST | `/v1/social/connect/:platform` | Live — manual / future OAuth |

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

Defined in `packages/shared/src/social/`:

| Platform | ID |
|----------|-----|
| Instagram | `instagram` |
| YouTube | `youtube` |
| TikTok | `tiktok` |
| Spotify | `spotify` |
| Apple Music | `apple_music` |
| SoundCloud | `soundcloud` |

- Stored on `User.socialLinks` (JSON file today)
- `connectionType`: `manual` (URL) or `oauth` (when platform APIs ship)
- Validated hostnames per platform; optional `isPrimary`
- UI: **Settings → Social & Streaming** and **Creator Studio → Artist Hub**
- Public read: `GET /v1/users/:id/public`

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

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## MintMusic record-player MVP (`/app`)

The "virtual record player" MVP lives at **`/app`** and is self-contained under
`components/mint/`. Discover music as spinning vinyl, swipe left to skip, swipe
right to collect, build a personal crate, and publish releases as an artist.

### Local development

```bash
npm install            # from the repo root (npm workspaces)
npm run dev:web        # Next.js dev server on :3000
# open http://localhost:3000/app
```

No backend or credentials are required to run the MVP — it uses a persistent
Web Audio engine for seed tracks and `localStorage` for state.

### Keyboard shortcuts (Discover)

`←` skip · `→` collect · `Space` play/pause · `I` song info.

### Architecture

```
components/mint/
  brand/        MintMusicLogo, MintMusicMark (vinyl + leaf)
  layout/       TopBar (mode switcher), CrateBackground
  player/       Turntable, VinylRecord, Tonearm
  discovery/    DiscoveryExperience, SwipeableRecord, GestureCoach, SongInfoSheet
  collection/   CollectionExperience, RecordSleeve
  artist/       ArtistExperience, UploadReleaseSheet
  profile/      ProfileSettingsSheet
  landing/      AuthLanding, OnboardingSheet
  ui/           primitives (Sheet, SegmentedControl, Toggle, Button, Chip, Progress)
  lib/          store (localStorage), audio (Web Audio engine), playback,
                catalog (seed songs), analytics, types, hooks
  MintApp.tsx   orchestrator (auth gate → onboarding → Discover/Collection/Artist)
```

Design tokens live in `app/globals.css` (`--mint-primary: #7FE9BC`, etc.).

### PWA / iOS install

- Manifest: `app/manifest.ts` → served at `/manifest.webmanifest`
  (`display: standalone`, `start_url: /app`, theme `#0A0A0B`).
- Icons: `app/icon.svg`, `public/brand/mintmusic-mark.svg`,
  `public/brand/mintmusic-maskable.svg`, and the existing `app/apple-icon.png`.
- Apple meta + `viewport-fit=cover` are set in `app/app/layout.tsx`; iOS safe
  areas are honored via the `mint-safe-*` utilities.
- Install on iPhone: Safari → Share → **Add to Home Screen** → Add.

### Environment variables

The MVP runs with no configuration. When wiring the production backend, add
(see `env.local.example` for the existing auth/API vars):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged operations |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |

### Production follow-ups (not in this MVP)

This MVP is a complete, demoable front-end experience. To productionize:

1. **Auth** — replace the local demo sign-in in `landing/AuthLanding.tsx` with
   Supabase Auth (Google OAuth + email magic link) and redirect to `/app`.
2. **Data / persistence** — move `lib/store.tsx` from `localStorage` to Supabase
   Postgres with the tables in the spec (`users`, `listener_profiles`,
   `artist_profiles`, `songs`, `song_credits`, `collection_items`,
   `discovery_events`) and enforce Row Level Security.
3. **Storage** — upload audio/artwork to Supabase Storage buckets
   (`avatars`, `artist-images`, `artwork`, `audio-private`, `audio-streaming`)
   instead of in-browser object URLs; generate AVIF/WebP artwork derivatives.
4. **Discovery** — persist `discovery_events` (play/skip/collect) to drive
   server-side ranking.
5. **Analytics** — point `lib/analytics.ts` at a real sink.
6. **Service worker** — add app-shell/offline caching (e.g. Serwist/next-pwa)
   without caching protected audio.

### Database migrations & deployment

The existing backend uses Prisma against PostgreSQL (`apps/api/prisma`) — see the
root `README.md` for `db:migrate` / `db:push`. The web app deploys on Vercel
(`vercel.json` at the repo root).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

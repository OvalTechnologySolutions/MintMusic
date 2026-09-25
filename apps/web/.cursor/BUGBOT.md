# Web (`apps/web`) — Bugbot rules

Next.js App Router UI with NextAuth OAuth, RainbowKit wallet, and API clients.

## Focus areas

- Session / `creatorStatus` checks for creator-only pages (`/creator/*`).
- Server-only secrets stay in server modules (`lib/server-api.ts`, route handlers, `auth.ts`) — never in client components or `NEXT_PUBLIC_*`.
- API calls should go through `lib/api/` helpers; preserve error handling and auth headers.
- Wallet UX belongs in Settings, not login.
- Sanitize/validate user-controlled URLs (social links, redirects) before render or navigation.
- Avoid hydration mismatches around wallet/session-gated UI.

## Autofix constraints

- Match existing design patterns for the touched surface; do not introduce a new design system.
- After auth or API client changes: `npm run lint:web` and `npm test` when tests cover the area.
- Do not hardcode WalletConnect project IDs, OAuth secrets, or API secrets in source.

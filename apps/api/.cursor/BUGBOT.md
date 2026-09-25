# API (`apps/api`) — Bugbot rules

Express REST API with Prisma/Postgres, Stripe Connect, internal auth middleware.

## Focus areas

- `src/middleware/internal-auth.ts` and `require-creator.ts` must remain on sensitive routes.
- Validate and normalize wallet addresses before store lookups.
- Stripe webhooks: verify signatures with `STRIPE_WEBHOOK_SECRET`; never process unsigned payloads.
- Env loading goes through `src/config/env.ts` (zod); do not read `process.env` ad hoc for secrets in new code.
- Error handler should not leak stack traces or secrets to clients in production.
- Prefer existing store modules (`src/store/`) over new ad-hoc file/DB access patterns.
- Async route handlers should use `async-handler` (or equivalent) so rejections reach the error middleware.

## Autofix constraints

- Keep response shapes stable for `@mintmusic/web` clients unless the finding requires a contract change — then update shared types too.
- After auth, Stripe, or store changes: run `npm test`.
- Do not weaken `INTERNAL_API_SECRET` minimums or default secrets into production paths.

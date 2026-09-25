# Prisma migrations

Production and CI currently apply schema via `prisma db push` (see `docs/DEPLOY.md` and `.github/workflows/ci.yml`).

The Mint billing models live in `schema.prisma`. After pulling this branch:

```bash
npm run db:push -w @mintmusic/api
npm run db:migrate-legacy-purchases -w @mintmusic/api   # optional backfill
```

To adopt migrate history later, generate with `prisma migrate diff` against production.

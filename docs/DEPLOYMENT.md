# Deployment & Ops Guide

This document outlines how we run the app locally and deploy to Vercel Preview and Production, including database setup and Prisma migrations. It is generic and meant to be the single source of truth for day‑to‑day ops.

## Environments

- Local Development
  - Database: Local PostgreSQL
  - Env file: `.env.local` (not committed)
  - Start: `npm run dev`
- Vercel Preview
  - Database: Vercel Postgres (Preview environment)
  - Deploys from branches/PRs
- Vercel Production
  - Database: Vercel Postgres (Production environment)
  - Deploys from `main` (or the configured production branch)

## Required Environment Variables

Consult `.env.example` for the full list. The most important ones are:

- Database
  - `DATABASE_URL` – pooled connection string (runtime)
  - `DIRECT_DATABASE_URL` – direct/non‑pooled connection string (migrations)
  - In `prisma/schema.prisma`, configure:
    ```prisma
    datasource db {
      provider  = "postgresql"
      url       = env("DATABASE_URL")
      directUrl = env("DIRECT_DATABASE_URL")
    }
    ```
- Auth (admin)
  - `ADMIN_PASSWORD_1` (and optionally `ADMIN_PASSWORD_2`)
  - `NEXTAUTH_SECRET` and `AUTH_SECRET` (use the same random 32‑byte value)
- Session store
  - `SESSION_STORE_TYPE` – `memory` or `redis` (optional, defaults to memory)
- Any other feature‑specific variables (LLM, etc.) as per `.env.example`.

## Local Development

1) Create `.env.local` with local Postgres credentials:
   ```env
   DATABASE_URL=postgres://user:pass@localhost:5432/ai_risk_ttx
   DIRECT_DATABASE_URL=postgres://user:pass@localhost:5432/ai_risk_ttx
   ADMIN_PASSWORD_1=dev-admin-password
   NEXTAUTH_SECRET=dev-secret-32bytes
   AUTH_SECRET=dev-secret-32bytes
   SESSION_STORE_TYPE=memory
   ```

2) Install deps and generate Prisma client:
   ```bash
   npm ci
   npx prisma generate
   ```

3) Run migrations locally:
   ```bash
   npx prisma migrate dev
   # or with a specific migration creation
   # npx prisma migrate dev --name add_metrics_views
   ```

4) (Optional) Inspect with Prisma Studio:
   ```bash
   npm run db:studio:dev
   # or: npx prisma studio
   ```

5) Start the app:
   ```bash
   npm run dev
   ```

## Vercel CLI Setup

- Login + link the project:
  ```bash
  vercel login
  vercel link
  ```

- Verify link: `.vercel/project.json` should contain `projectId` and `orgId`.

## Vercel Preview Deployment

1) Add or update Preview env vars:
   ```bash
   vercel env add ADMIN_PASSWORD_1 preview
   vercel env add ADMIN_PASSWORD_2 preview             # optional
   vercel env add NEXTAUTH_SECRET preview
   vercel env add AUTH_SECRET preview
   # DATABASE_URL and DIRECT_DATABASE_URL should already be set (Vercel Postgres)
   ```

2) (If you created a new migration) Run migrations against Preview DB:
   ```bash
   # pull env locally so prisma uses Preview DB
   vercel env pull .env.preview.local --environment=preview
   npx dotenv -e .env.preview.local -- npx prisma migrate deploy
   ```

3) Deploy Preview:
   ```bash
   vercel deploy --target=preview
   # or use prebuilt output if you want to guarantee the exact local build
   # vercel deploy --prebuilt --target=preview
   ```

## Vercel Production Deployment

1) Ensure Production env vars are set (same keys as Preview with prod values):
   ```bash
   vercel env add ADMIN_PASSWORD_1 production
   vercel env add NEXTAUTH_SECRET production
   vercel env add AUTH_SECRET production
   # DATABASE_URL and DIRECT_DATABASE_URL should already be set for Production
   ```

2) (If you created a new migration) Run migrations against Prod DB:
   ```bash
   vercel env pull .env.production.local --environment=production
   npx dotenv -e .env.production.local -- npx prisma migrate deploy
   ```

3) Deploy Production:
   ```bash
   vercel deploy --prod
   ```

## Alternative: Run Migrations During Vercel Build

If you prefer migrations to run automatically during every build, set the Vercel build command to:

```bash
npm run db:migrate:deploy && npm run build
```

- Pros: Less manual steps.
- Cons: If a migration fails, the build fails. Ensure `DIRECT_DATABASE_URL` is set.

## Creating SQL Views (Metrics)

- For advanced analytics (daily rollups, scenario breakdowns, round funnels), prefer SQL views/materialized views.
- Create a Prisma migration and edit the `migration.sql` to include your `CREATE VIEW ...` statements, then:
  - Local: `npx prisma migrate dev`
  - Preview/Prod: `npx prisma migrate deploy`
- See `docs/METRICS_DESIGN.md` for view definitions and query examples.

## Troubleshooting

- Missing DATABASE_URL/DIRECT_DATABASE_URL at runtime
  - Verify Vercel envs and that `prisma/schema.prisma` has `directUrl` configured.
- NextAuth errors on login in Preview/Prod
  - Ensure `NEXTAUTH_SECRET`/`AUTH_SECRET` are set and consistent.
- Migrations fail due to pool
  - Use `DIRECT_DATABASE_URL` (non‑pooled) for migrate; the app can keep using pooled `DATABASE_URL` at runtime.
- Preview deploy doesn’t reflect migrations
  - Re‑run `vercel env pull` and `prisma migrate deploy`, then redeploy.

## Summary

- Local: local Postgres + `.env.local` + `prisma migrate dev`.
- Preview/Production: Vercel Postgres + env vars + `prisma migrate deploy` + `vercel deploy`.
- Prefer SQL views/materialized views for metrics; keep route code thin and typed.


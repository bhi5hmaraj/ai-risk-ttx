# Cloud Run Full Deployment Task List (No Vercel)

Goal: deploy both Next.js and Colyseus on Google Cloud Run with Infisical secrets.

## Phase 0: Prep (one-time)
- [ ] Enable GCP APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager.
- [ ] Create Artifact Registry repo `simulacra` in `us-central1`.
- [ ] Create GCP Secret Manager secrets:
  - `INFISICAL_UA_CLIENT_ID`
  - `INFISICAL_UA_CLIENT_SECRET`
- [ ] Grant Cloud Run runtime SA access to read those secrets.
- [ ] Confirm Infisical environments and secrets exist (typical slugs: `dev`, `stg`, `prod`).
- [ ] Confirm `INFISICAL_PROJECT_ID` (UUID) for the Simulacra project.

## Local: Docker Smoke Test (recommended before deploy)
- [ ] Configure Infisical via `.env.infiscal` (recommended): copy `.env.infiscal.example` → `.env.infiscal` and fill values.
- [ ] Start services:
```bash
./scripts/docker-local.sh up
```
- [ ] If Docker Compose is not installed, use:
```bash
./scripts/docker-local-run.sh up
```
- [ ] Verify logs show Infisical fetch: `[Infisical] Loaded ... secrets`.
- [ ] Optionally sanity-check Infisical in Node:
```bash
pnpm tsx scripts/check-infisical.ts
```
- [ ] If `tsx` is blocked, use:
```bash
node scripts/check-infisical.mjs
```
- [ ] Verify endpoints:
  - Next.js: `http://localhost:3000`
  - Colyseus: `http://localhost:3004/healthz` (local) and `http://localhost:3004/` (external-friendly)

### Local DB options
- Use container Postgres (default): `docker-compose.local.yml` exposes Postgres on `localhost:5433`.
- Use host Postgres: run with:
```bash
COMPOSE_FILE=docker-compose.hostdb.yml \
  DATABASE_URL='postgresql://postgres@localhost:5432/simulacra_local?schema=public' \
  ./scripts/docker-local.sh up
```
- Or without compose:
```bash
MODE=hostdb DATABASE_URL='postgresql://postgres@localhost:5432/simulacra_local?schema=public' ./scripts/docker-local-run.sh up
```

## Phase 1: Code/Config prerequisites (blockers)
- [ ] Set Next.js standalone output in `next.config.ts` (`output: 'standalone'`).
- [ ] Ensure Docker builds generate Prisma client (Prisma must be available during `next build` and `build:server`).
- [ ] If needed by Infisical, set `INFISICAL_PROJECT_ID` for both services.

## Phase 2: Initial Deploy (manual, no CI changes yet)
- [ ] Deploy Colyseus using Cloud Build:
```bash
gcloud builds submit --config cloudbuild.colyseus.yaml \
  --project="$PROJECT_ID" \
  .
```
- [ ] (Optional) Deploy Colyseus with a different Infisical environment:
```bash
gcloud builds submit --config cloudbuild.colyseus.yaml \
  --project="$PROJECT_ID" \
  --substitutions=_INFISICAL_ENVIRONMENT=stg,_INFISICAL_PROJECT_ID="$INFISICAL_PROJECT_ID" \
  .
```
- [ ] Deploy Next.js using Cloud Build (references Colyseus service name or URL):
```bash
gcloud builds submit --config cloudbuild.nextjs.yaml \
  --project="$PROJECT_ID" \
  --substitutions=_COLYSEUS_SERVICE_NAME=simulacra-stein \
  .
```
- [ ] Release step: DB migrations run automatically inside `cloudbuild.nextjs.yaml` (`migrate-db`) before deploying.
- [ ] (Optional) Deploy Next.js with a different Infisical environment:
```bash
gcloud builds submit --config cloudbuild.nextjs.yaml \
  --project="$PROJECT_ID" \
  --substitutions=_COLYSEUS_SERVICE_NAME=simulacra-stein,_INFISICAL_ENVIRONMENT=stg,_INFISICAL_PROJECT_ID="$INFISICAL_PROJECT_ID" \
  .
```
- [ ] Note service URLs printed in Cloud Build logs:
  - Next.js: `simulacra-app`
  - Colyseus: `simulacra-stein`

## Phase 3: Smoke Tests
- [ ] Next.js health: open the Next.js URL in browser (home page loads).
- [ ] Colyseus health: `GET https://<colyseus>/` returns 200 (Cloud Run may intercept `/healthz`).
- [ ] Snapshot endpoint: `GET https://<colyseus>/games/TEST/snapshot` returns 404 or 200.
- [ ] WebSocket: browser connects to `wss://<colyseus>` without mixed-content errors.
- [ ] Cloud Run logs show `[Infisical] Loaded X secrets`.

## Phase 4: Domains (optional for initial)
- [ ] Map custom domain for Next.js service (e.g., `simulacra.cc`).
- [ ] Map custom domain for Colyseus service (e.g., `game.simulacra.cc`).
- [ ] Update any client envs to use the custom domains.

## Phase 5: CI (later)
- [ ] Wire `.github/workflows/deploy.yml` to run `cloudbuild.colyseus.yaml` and `cloudbuild.nextjs.yaml`.
- [ ] Add branch-based deploy naming for both services (or keep fixed names).
- [ ] Add build status badges/log links if desired.

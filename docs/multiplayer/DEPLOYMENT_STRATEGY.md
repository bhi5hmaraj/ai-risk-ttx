# Deployment Strategy — MVP (Dec 12)

Status: Finalized
Scope: Deploy Next.js (SSR) on Vercel and Colyseus on Cloud Run with a minimal, reliable setup for the Dec 12 event.

## 1) Goals
- Keep the frontend fast and stable with SSR and API routes on Vercel.
- Run the authoritative Colyseus server on Cloud Run.
- Avoid feature flags and partial rollouts; rely on branch/preview environments.
- Keep Cloud Run single‑instance for MVP; add Redis Presence post‑event.

## 2) Architecture Overview (Two Services)
- Next.js on Vercel (SSR + Next API)
  - Renders all pages (including `/game/[gameId]` via SSR using the snapshot endpoint).
  - Hosts non‑game critical APIs (mail/thread reads, event queries, admin UI).
- Colyseus on Cloud Run (authoritative backend)
  - Owns Rooms, game loop, timers, AI turns, and state sync over WS.
  - Exposes `GET /games/:gameId/snapshot` (SSR bootstrap) on the same Express app.

Why: This split matches responsibilities and reduces coupling. Colyseus serves live state; Next serves pages and read‑heavy endpoints.

## 3) Domains & CORS
- Frontend (Vercel)
  - Preview: Vercel preview URL per branch (e.g., `https://<repo>-git-canary-<hash>.vercel.app`).
  - Production: `https://<frontend-host>` (e.g., `simulacra.cc`).
- Backend (Cloud Run)
  - Preview: `https://simulacra-preview-uc.a.run.app` (or your preview service URL).
  - Production: custom domain mapped (e.g., `https://colyseus.<domain>`). For MVP you may keep the run.app URL.
- CORS on Colyseus must include:
  - Vercel preview and production origins
  - Localhost for dev

## 4) Environment Variables
- Vercel (Frontend)
  - `NEXT_PUBLIC_COLYSEUS_URL` → `wss://<cloud-run-host>`
  - `NEXT_PUBLIC_COLYSEUS_HTTP_BASE` → `https://<cloud-run-host>`
  - `NEXT_PUBLIC_APP_URL` → `https://<frontend-host>`
  - Server‑side secrets for DB/mail/etc. via Vercel env settings
- Cloud Run (Backend)
  - `NODE_ENV=production`, `PORT` auto‑injected by Cloud Run
  - Secrets via Secret Manager (e.g., `OPENAI_API_KEY`, `DATABASE_URL`)
  - Optional: `CORS_ALLOWED_ORIGINS` (comma‑separated) if you centralize CORS config

## 5) Build & Deploy
- Vercel (Next)
  - Use Vercel Git integration: PRs create preview deployments; push to production branch promotes.
  - Ensure env variables are set for Preview and Production.
- Cloud Run (Colyseus)
  - Use Cloud Build trigger on `canary` (preview) and `main` (prod) or run manual deploys.
  - Deploy flags (MVP):
    - `--session-affinity`
    - `--min-instances 1`
    - `--max-instances 1`
    - `--set-env-vars NEXT_PUBLIC_APP_URL=https://<frontend-host>`
    - Mount secrets from Secret Manager for LLM/DB credentials

Note: Keep the Colyseus image lean (server only). Do not bundle `.next` artifacts in the Cloud Run image for MVP.

## 6) Snapshot Endpoint (SSR only)
- Implemented on the Colyseus Express app (see Phase‑2 doc) via `initializeExpress` or manual route.
- Path: `GET /games/:gameId/snapshot`
- Implementation: `matchMaker.query({ name: 'game', gameId })` → `remoteRoomCall(roomId, 'getSnapshot')`.
- Headers: `Cache-Control: no-store`
- Clients: Called only by Next SSR; browsers do not use it during gameplay.

## 7) Single‑Instance Constraint (MVP)
- Set Cloud Run `--min-instances 1` and `--max-instances 1`.
- Rationale: Without Redis Presence, rooms aren’t discoverable across instances.
- Future (Phase 3): add Redis Presence and lift the max to enable horizontal scaling.

## 8) Checklists

Preview (Before Testing)
- [ ] Colyseus CORS allowlist includes Vercel preview origin(s)
- [ ] Cloud Run deployed with session‑affinity, min=1, max=1
- [ ] Vercel preview envs set: NEXT_PUBLIC_COLYSEUS_URL/HTTP_BASE, NEXT_PUBLIC_APP_URL
- [ ] Snapshot route responds 200 with no‑store
- [ ] `/healthz` returns 200

Preview (QA)
- [ ] SSR of `/game/[gameId]` works from Vercel
- [ ] Browser establishes WS (wss) to Cloud Run; no mixed‑content warning
- [ ] Create/join via `gameId` consistently hits same room (filterBy)
- [ ] Start → submit → auto‑advance → timeout/NoOp path
- [ ] Reconnect: close + reopen on another device; seat preserved

Production Cutover
- [ ] Vercel production envs match final domains
- [ ] Cloud Run custom domain (or keep run.app) and CORS updated for production origin(s)
- [ ] Secrets mounted via Secret Manager; no plaintext in YAML
- [ ] Smoke test: end‑to‑end game, including reconnect

Event Day
- [ ] Admin/monitor available (if enabled)
- [ ] Logs streaming (`gcloud run services logs tail`)
- [ ] Rollback plan acknowledged

## 9) Rollback Plan
- Vercel: revert to previous deployment in dashboard (or redeploy last good commit).
- Cloud Run: change traffic to previous revision, or redeploy last good image.
- Git: standard `revert` of the offending merge on production branch.

## 10) Post‑Event (Phase 3)
- Add Redis Presence (Upstash or GCP Memorystore) for cross‑instance room discovery.
- Lift Cloud Run `--max-instances`; add autoscaling policy.
- Optional: map stable subdomain for Colyseus (e.g., `ws.<domain>` or `colyseus.<domain>`).

## 11) Notes & Best Practices
- Keep the snapshot endpoint strictly SSR/admin; do not use it for browser gap repair.
- Keep the Colyseus Schema minimal; prefer HTTP (Next) for heavy reads (mail threads, event history).
- Monitor patch sizes and overall memory; bound any Schema tails (e.g., recentMail N=10–20).

---

## Architecture for Deployment (MVP)

### Services
- Frontend: Next.js on Vercel (SSR + API routes)
  - Uses server components/Route Handlers for backend logic that is not game-loop critical (mail/event reads from Postgres, admin UI, etc.).
  - Consumes snapshot from the Colyseus server for SSR of `/game/[gameId]`.
- Backend: Colyseus on Cloud Run
  - Owns Room processes, timers, AI turns, and state.
  - Exposes a minimal HTTP surface (e.g., `GET /games/:gameId/snapshot`) on the same Express app.

### Domains & CORS
- Production
  - Vercel: `https://simulacra.vercel.app` (or your custom frontend domain)
  - Cloud Run (custom domain): `https://simulacra.cc` (WS upgrades supported)
- Preview
  - Vercel Preview URL per-branch (e.g., `https://simulacra-git-canary-*.vercel.app`)
  - Cloud Run preview: `https://simulacra-preview-uc.a.run.app`
- CORS allowlist on Colyseus server must include:
  - Vercel preview and production origins
  - `localhost` for local dev

### Environment Variables
- Frontend (Vercel)
  - `NEXT_PUBLIC_COLYSEUS_URL` → `wss://simulacra.cc` (prod), `wss://simulacra-preview-uc.a.run.app` (preview)
  - `NEXT_PUBLIC_COLYSEUS_HTTP_BASE` → `https://simulacra.cc` (prod), `https://simulacra-preview-uc.a.run.app` (preview)
  - `NEXT_PUBLIC_APP_URL` → Frontend public URL (Vercel)
  - API/DB secrets via Vercel project settings or Secret Manager integration
- Backend (Cloud Run)
  - `PORT` injected by Cloud Run; server uses it
  - `NODE_ENV=production`
  - Any LLM/DB secrets via Secret Manager (e.g., `OPENAI_API_KEY`, `DATABASE_URL`)

### Cloud Run Instance Policy (MVP)
- Set `--min-instances 1` and `--max-instances 1` for the Colyseus service
  - Rationale: Without Redis Presence driver, rooms are not discoverable cross-process; single instance avoids cross-instance routing.
- Keep `--session-affinity` enabled.
- Revisit scaling after adding Redis Presence (Phase 3).

### Docker Image (Colyseus only)
- Keep only the Colyseus server artifacts to reduce image size:
  - Remove `.next` from the image unless you plan to co-host Next (not recommended for MVP).
  - Keep `dist/server/index.js` and runtime deps.

---

## Deployment Checklists

### Pre-Deploy (Preview)
- [ ] Colyseus server: CORS allowlist includes Vercel preview origin(s)
- [ ] Cloud Run deploy flags include `--session-affinity`, `--min-instances 1`, `--max-instances 1`
- [ ] Set `NEXT_PUBLIC_COLYSEUS_URL` and `NEXT_PUBLIC_COLYSEUS_HTTP_BASE` on Vercel preview
- [ ] Snapshot route responding at `/games/:gameId/snapshot` with `Cache-Control: no-store`
- [ ] Colyseus health at `/healthz` returns 200

### Post-Deploy (Preview)
- [ ] FE SSR of `/game/[gameId]` succeeds (via snapshot)
- [ ] Browser WS connects to Colyseus from Vercel domain (wss)
- [ ] Join by `gameId` creates and re-joins rooms consistently
- [ ] Round flow: start, submit, auto-advance, timeout/NoOp
- [ ] Reconnect test: close tab / reopen on another device; seat preserved

### Pre-Prod
- [ ] Promote Vercel environment variables for production domain
- [ ] Cloud Run custom domain mapped to `simulacra.cc`
- [ ] Update CORS to include production frontend origin(s)
- [ ] Secrets mounted via Secret Manager (no plaintext in YAML)

### Event Day (Prod)
- [ ] Admin link works; Colyseus Monitor reachable (if enabled)
- [ ] Logs streaming (gcloud run services logs tail)
- [ ] On-call aware of rollback plan

---

## Future: Redis Presence & Multi-Instance Scaling (Phase 3)
- Introduce Colyseus Presence (Upstash Redis or GCP Memorystore)
- Wire matchmaker/presence to allow cross-instance room discovery
- Lift `--max-instances 1`; add horizontal autoscaling policy
- Add health/meta route to enumerate rooms for ops

# EAGx Multiplayer Launch — Task Breakdown (Draft)

Note: Draft planning file for refinement. Once approved, these will be split into GitHub issues under the `eagx` milestone and added to Project #1. PRD now lives at `eagx/PRD.md`.

Legend: [P0 must], [P1 should], [P2 nice]

## 1) Server: Express + Colyseus + Next (Cloud Run)

- [P0] Wire Express + Colyseus + Next handler (`server/index.ts`)
  - [ ] Create Express app with `cors`, `express.json`, `trust proxy`
  - [ ] Attach Colyseus via `WebSocketTransport({ server })`
  - [ ] Mount Next handler `app.all('*', handle)`
  - [ ] Mount Colyseus admin routes at `/colyseus-admin/*` (avoid clash with Next Admin `/admin`)
  - Acceptance
    - [ ] `npm run dev` serves pages and accepts WS connections on same origin
    - [ ] `/healthz` returns 200

- [P0] CORS + Health
  - [ ] Allow origins: `simulacra.cc`, `*.vercel.app`
  - [ ] Add `/healthz` endpoint with minimal checks

- [P0] Dockerfile + runtime scripts
  - [ ] Ensure build and start run Express entry (`server/index.ts`)
  - [ ] HEALTHCHECK hits `/healthz`

## 2) GameRoom Core

- [P0] Schema + lifecycle
  - [ ] Define `GameState` (round, phase, players)
  - [ ] Define `Player` (sessionId, role, connected)
  - [ ] Implement `onCreate`, `onJoin`, `onLeave`
  - [ ] Implement `allowReconnection` on ungraceful leave (120s)
  - Acceptance
    - [ ] Two browser tabs see synchronized state; reconnect restores same player

- [P0] Messaging
  - [ ] `room.onMessage('submit_action', action)` updates state
  - [ ] `room.onMessage('set_role', role)` assigns role
  - [ ] Server method `forceAdvance()` (admin)

## 3) Lobby + Join Flow (Room Codes)

- [P0] Room creation API (Express)
  - [ ] `POST /colyseus-admin/rooms` → create room, return `{roomId, code}`
  - [ ] Room metadata stores `code`

- [P0] Client join
  - [ ] Lobby page: create room, display code/QR
  - [ ] Game page `/game/[code]`: resolve `roomId` and `client.joinById(roomId)`
  - Acceptance
    - [ ] Two clients join by code; host can start and advance rounds

## 4) Reconnection (Cloud Run 60‑min cap)

- [P0] Client reconnection
  - [ ] Persist `{roomId, reconnectionToken}` to localStorage after join
  - [ ] On socket close, `client.reconnect(roomId, token)` and rebind handlers
  - Acceptance
    - [ ] Kill‑tab test: rejoins within 5s with role/state intact
    - [ ] Simulated cut test: forced disconnect rejoins within 5s

## 5) Colyseus Admin Routes (Express)

- [P0] Read
  - [ ] `GET /colyseus-admin/rooms` → list active rooms (roomId, code, clients, lastActivity)
  - [ ] `GET /colyseus-admin/rooms/:roomId` → state snapshot

- [P0] Mutate
  - [ ] `POST /colyseus-admin/rooms/:roomId/force-advance`
  - [ ] `POST /colyseus-admin/rooms/:roomId/end`

- [P1] Auth
  - [ ] `Authorization: Bearer <ADMIN_SECRET>` on admin routes
  - [ ] Basic rate‑limit and structured logs for all admin mutations

## 6) Admin UI minimal updates

- [P1] Update fetch URLs to `/colyseus-admin/*`
  - [ ] Replace Next API calls in dashboard pages
  - [ ] Show room list and details using Express endpoints

## 7) Observability

- [P1] Structured logging
  - [ ] Include `roomId`, `sessionId`, `phase`, `round` in log context

- [P1] Sentry
  - [ ] Enable DSN for server + client; ignore noisy browser errors

## 8) Cloud Run (Event Profile)

- [P0] Service settings
  - [ ] `timeout=3600`, `min-instances=1`, `max-instances=1`, `concurrency=100`, mem 1–2GiB
  - [ ] Domain mapped, HTTPS ok

- [P0] Deploy + smoke
  - [ ] Build/push image; `gcloud run services replace`
  - [ ] Smoke: create room, join from two devices, play 1 round

## 9) QA Checklist (Blocking)

- [P0] Reconnect
  - [ ] Kill‑tab test passes
  - [ ] Forced drop test passes (simulated cut)

- [P0] Deploy drain
  - [ ] Start new revision; existing clients reconnect and rebind successfully

## 10) Launch Readiness

- [P0] Runbook
  - [ ] Document “no deploys during active rooms”; rollback steps; health checks

- [P1] Docs
  - [ ] Update README and eagx/PRD.md links and envs

---

Backlog / After EAGx (not in this milestone)
- [P2] Presence store (Redis) + multi‑instance room routing
- [P2] Game log persistence + replay
- [P2] Clerk/JWT admin auth with short‑lived tokens

# EAGx Colyseus Migration — Detailed Update

## Current Direction
- Proceeding with **WebSocket-only Colyseus**; SSE fallback removed from scope to focus on stability.
- Target deploy footprint: single Express + Colyseus service on Cloud Run with room-code joins.
- Reference patterns come from `warden_dilemma` (Express bootstrap, health/admin routes, Redis-optional driver), aligned to our `ARTIFACTS.md` mapping.

## What’s Done
- **Architecture + PRD** updated to WS-only plan with admin/observability emphasis (see `prd/*.md`).
- Colyseus feature set defined: room creation/join by code, action submission handlers, reconnection via `allowReconnection`, and facilitator `forceAdvance` control.
- Deployment constraints captured: single-instance baseline (Redis optional), same-origin WS in dev with override env for prod.

## In-Flight
- Drafting Express wiring: `createApp`-style HTTP stack with `/healthz`, `/admin/rooms` (list/inspect), `/colyseus-admin/*` monitor, then pass the HTTP server into `new Server({ server, driver, presence })`.
- GameRoom sketch: lifecycle hooks (`onCreate/onJoin/onLeave`), schema-backed state, reconnection tokens stored client-side, and admin message to advance/end rounds.
- Admin & o11y: structured logs, request IDs, Sentry hooks, and a kill-switch to pause new rooms while keeping existing rooms alive.

## Risks & Mitigations
- **Cold starts / resource contention on Cloud Run** — precompute instance size + max instances this week; add synthetic WS check hitting `/healthz` + one room join.
- **Reconnection gaps** — exercise `allowReconnection` with reconnection token cache; add scripted packet-loss test to ensure state resync.
- **Room-code abuse / cross-table joins** — short-lived codes, per-IP rate limiting, and optional admin `forceEnd` route to drain a compromised room.

## Next Steps (immediate)
1) Land Express + Colyseus server entry with health/admin routes and room registration mirroring `warden_dilemma` patterns.
2) Implement GameRoom state schema + handlers; add admin `forceAdvance/forceEnd` and basic telemetry (state transitions, joins/leaves).
3) Ship client join flow by room code and reconnection token persistence; run 2–6 player end-to-end game to validate patches.
4) Run chaos/reconnect drill and record metrics to decide go/no-go for event.

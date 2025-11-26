# EAGx Artifacts and References (from Warden Dilemma)

Purpose: Keep lightweight references to proven Colyseus/Express patterns we will adapt. We are not copying runtime code yet.

Source project: `/home/bhishma/Documents/code/llm-reward-hacking-demos/warden_dilemma`

Referenced files
- server/src/index.ts — Express + Colyseus server boot (Redis drivers optional)
- server/src/http/app.ts — `createApp()` (CORS, trust proxy, JSON, request logging)
- server/src/http/health.ts — JSON health endpoints
- server/src/http/debug.ts — `matchMaker.query` room listings
- server/src/http/monitor.ts — optional Colyseus monitor under `/colyseus`
- server/src/bootstrap/rooms.ts — centralized room definitions
- server/src/bootstrap/redis.ts — Redis driver/presence env toggles
- client/src/services/colyseus.service.ts — WS URL strategy + helpers

Simulacra mapping
- `server/index.ts` — combine createApp + Next handler + Colyseus transport
- `server/routes/admin.ts` — admin read endpoints (`/admin/rooms`, `/admin/rooms/:id`) + later mutations
- `server/rooms/GameRoom.ts` — Simulacra gameplay room (token‑gated); add allowReconnection
- `client/services/colyseus.ts` — same‑origin WS + `NEXT_PUBLIC_GAME_WS` override

Notes
- Set `useDefineForClassFields: false` in tsconfig to avoid Colyseus schema sync issues.
- Keep Redis optional; EAGx runs single instance (`max-instances=1`).

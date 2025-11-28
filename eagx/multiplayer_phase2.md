# Multiplayer Phase 2 — Server‑Driven Architecture

Status: Draft
Owner: Platform/Multiplayer
Date: 2025‑11‑28

## Why (Problem Statement)
- Clients currently perform transition logic (start → action → consequence → end), which causes drift, rejoin pain, and race conditions.
- We want the backend to be the single source of truth, with stable, shareable `gameId` URLs and seamless reconnection across devices.
- Move the UI to Next.js (server‑driven pages) while keeping Colyseus for realtime. The server drives state; clients render.

## Goals
- Server authoritative game loop; clients emit intents only (no transitions).
- Stable URLs: `/game/[gameId]` (Next) with `gameId → roomId` mapping on the server.
- Reconnect/transfer across devices via `joinToken` without losing progress.
- SSR initial render from backend state; hydrate to realtime updates via Colyseus.
- Timeouts default to “no action” (NoOp); LLM handles consequences accordingly.
- Explicit strategy for event‑log vs state drift and recovery.

## Non‑Goals
- Replacing Colyseus transport.
- Eliminating websockets (SSR handles initial view; realtime still required).
- Full persistence spec; we’ll outline snapshot + event sourcing hybrid only.

---

## TL;DR Architecture
- Identity: Use Colyseus matchmaker with `filterBy(['gameId'])` so `joinOrCreate('game', { gameId })` deterministically resolves to the same room. Alternatively, set `roomId = gameId` on create (Presence‑guarded). Rely on built‑in seat reservation and `reconnectionToken` for rejoin.
- URL: `/game/[gameId]` renders via Next (App Router). Next SSR fetches a public snapshot from the Colyseus Express server; client connects to Colyseus (WS) with its `reconnectionToken`/seat reservation to subscribe.
- State: Canonical `GameState` (schema) with `phase: 'lobby'|'starting'|'action'|'consequence'|'end'`, `round`, `maxRounds`, `players[]`, `publicScores`, `pendingChoices`, `actionOptions`, `eventSeq`, `stateVersion`.
- Intents (from client): `start_game`, `submit_action { actionId }`. No client `advance_round`.
- Broadcasts (from server): `game_started`, `round_started`, `action_options`, `round_result`, `game_ended` + schema patches. Clients render based on `phase` only.
- Timeout: Per‑phase timers on server; missing human choices are `NoOp`. LLM consequence generation receives explicit `NoOp` for those players.

---

## Next.js Application (Server‑Driven UI)
- Routing
  - Page: `app/game/[gameId]/page.tsx`
  - Optional spectator: `app/spectate/[gameId]/page.tsx` (redacted private data)
- SSR Data Fetch
  - Next server calls a Colyseus HTTP endpoint (hosted in server/index.ts) to fetch a sanitized snapshot by `{ gameId }` to render the initial view. Example: `GET /games/:gameId/snapshot`.
  - Snapshot includes: `phase`, `round`, `players(public)`, `publicScores`, last `eventLog` entries, `stateVersion`, `eventSeq`.
- Hydration & Realtime
  - A small client component connects to Colyseus using `{ gameId, joinToken }` and subscribes to schema patches + event messages.
  - UI routes are a pure function of `phase`:
    - `lobby` → LobbyScreen
    - `starting` → LoadingScenario
    - `action` → ActionChoice
    - `consequence` → RoundSummary
    - `end` → EndScreen
- No client transition logic; buttons only dispatch intents. Loading states are derived from the presence/absence of required server data (e.g., disable Confirm until `actionOptions[currentPlayer]` exist).

- No bespoke registry: resolve rooms via `filterBy(['gameId'])` (or `roomId = gameId`). Colyseus Presence backs discovery across processes.
- Seating & Rejoin
  - Use seat reservation and `allowReconnection`/`reconnectionToken`. Validate on join, rebind seat on reconnect.
  - Maintain stable `playerId` across sessions; `sessionId` is ephemeral.
- Game Loop
  - Start on `start_game` from host/mod, or auto when all required players are ready.
  - Advance phases on server timers or when all choices are in. On timer expiry, write `NoOp` for missing players.
  - Generate consequences (LLM) using the set of chosen actions (human + AI).
  - Check end conditions before invoking LLM where possible (round cap, terminal score) to save tokens.
- Broadcasts (single announcer)
  - `players_init` (roles, personal objectives)
  - `game_started` (phase → `starting`)
  - `round_started` (phase → `action`, round number)
  - `action_options { playerId, options[] }`
  - `round_result { round, playerActions[], keyMoments[], scoreDelta }` (phase → `consequence`)
  - `game_ended { reason, finalScores }` (phase → `end`)
  - All schema writes update `stateVersion` and `eventSeq`.

## Default on Timeout = No Action
- Policy: If a human doesn’t submit in time, the server records `NoOp` for that player (zero cost). AI policy remains programmatic.
- LLM Contract: Consequence prompt includes explicit `NoOp` for those players so narrative and scoring reflect inactivity. No hidden server “auto‑pick”.
- UX: Client shows countdown; on expiry, it renders the round summary coming from server. Client never attempts a local fallback.

## Event Log vs State Drift
Problem: Clients can diverge if they miss events or render from an outdated local log.

Strategy:
- Versioning
  - Every schema mutation bumps `stateVersion` (monotonic int).
  - Every emitted event (e.g., `round_result`) bumps `eventSeq` (monotonic int).
- Snapshot + Diff
  - On join/rejoin, server sends full snapshot `{ stateVersion, eventSeq, state, lastKEvents }`.
  - Client keeps `lastStateVersion` and `lastEventSeq`.
- Reconciliation
  - If client detects a gap (`incoming.eventSeq > lastEventSeq + 1`) or receives a patch that doesn’t apply cleanly, it requests `GET /games/:gameId/snapshot?since={lastEventSeq}`.
  - Server may respond with `{ events[] }` if contiguous, else a full snapshot.
  - Client always prefers schema state over locally reconstructed UI state. Event log is append‑only and idempotent by `eventSeq`.
- Idempotency & Ordering
  - All events include `eventSeq`; reducers discard duplicates and ignore out‑of‑order historical events.
  - UI components derive from schema first; event log is auxiliary for history/UX.
- Truncation & Persistence
  - Persist event log and periodic snapshots (e.g., each round boundary). Truncate in‑memory logs to the last N events while keeping persisted history.

### WS vs Snapshot Divergence (Precedence + Reconciliation)
- Source of truth: the Room’s in‑memory StateManager. Both WS schema patches and the snapshot endpoint must read from it (use `remoteRoomCall('getSnapshot')` if cross‑process).
- Precedence while connected: prefer WS. Snapshots are only for bootstrap/catch‑up.
- Versioning required in both channels:
  - `stateVersion` incremented on any state mutation.
  - `eventSeq` incremented on each emitted event (`round_result`, `new_round`, etc.).
- Handshake flow:
  - SSR uses snapshot vX to render HTML.
  - On WS connect, compare `ws.stateVersion` with `ssr.stateVersion`.
    - If `ws > ssr` → hydrate from WS and ignore older snapshot fields.
    - If `ssr > ws` (rare race) → request fresh snapshot immediately and reconcile.
- Gap detection:
  - Keep `lastEventSeq` in the client store. If an incoming event’s `eventSeq` is not `+1`, fetch `GET /games/:id/snapshot?since=lastEventSeq`.
  - If contiguous events are available, apply them; otherwise replace local state with the full snapshot and resume WS.
- Timers:
  - Include `deadlineAt` (epoch ms) in snapshot and an occasional WS “tick” so UI timers re‑sync visually; server remains authoritative for timeout.
- HTTP caching:
  - Send `ETag: W/"gs-<gameId>-<stateVersion>"` and `Cache-Control: no-store`; clients use ETag to avoid accidental stale caches.

## API/Contracts (Sketch)
- Client → Server (intents)
  - `start_game`
  - `submit_action { actionId }`
- Server → Client (events)
  - `players_init { players[] }`
  - `game_started { round: 1 }`
  - `round_started { round }`
  - `action_options { playerId, options[] }`
  - `round_result { round, playerActions[], keyMoments[], scoreDelta }`
  - `game_ended { reason, finalScores }`
- Snapshot Endpoint (for Next SSR & reconciliation)
  - `GET /games/:gameId/snapshot` → `{ stateVersion, eventSeq, phase, round, players(public), publicScores, eventLogTail[] }`

## Ports, CORS, and Dev Orchestration
- All ports from env; no hard‑coded numbers.
  - `WEB_PORT`, `COLYSEUS_PORT`, `NEXT_PUBLIC_COLYSEUS_URL`, `DATABASE_URL`.
- CORS per Colyseus recipe with credentials enabled and origin whitelist from env.
- `pnpm dev` runs Next + Colyseus; prompts to free busy ports.

## Persistence & Recovery (High‑Level)
- In‑memory authoritative state per room.
- Periodic snapshot to Postgres at phase boundaries and every N events.
  - On process restart: load snapshot + replay tail events; re‑register `gameId → roomId`.

---

## Delta From Current Codebase (2025‑11‑28)

Already in place
- Standalone Colyseus + Express with proper CORS and env ports (`server/index.ts`).
- Unified broadcasts (`round_result`, `current_event`, `game_started`/`new_round`, `action_options`, `game_ended`) via a single announcer (`server/rooms/handlers/RoundAnnouncer.ts`).
- Server state pipeline (StateManager + adapters + handlers) with string phases (`server/rooms/*`, `server/types/core.ts`).
- AI roster seeded from scenario; no hardcoded roles (`server/rooms/GameRoom.ts`).
- FE consumption of broadcasts and UI updates (`providers/ColyseusProvider.tsx`, `app/game/page.tsx`).
- Dev orchestration with port prompts and env‑driven URLs (`scripts/dev.mjs`, `scripts/dev-colyseus.mjs`).

Delta work for Phase 2 (what’s left)
- GameId URLs via matchmaker (3 SP)
  - Use `filterBy(['gameId'])` (or `roomId = gameId`); FE joins with `{ gameId }`. Rejoin uses `reconnectionToken`.
- Snapshot endpoint + SSR page (10–13 SP)
  - `GET /games/:gameId/snapshot` in Colyseus Express; Next `app/game/[gameId]` SSR + hydrate.
- Server‑driven advance (3–5 SP)
  - Remove client `advance_round`; auto‑advance on all‑submitted.
- Timers + NoOp on timeout (8 SP)
  - Server timers per round; mark missing humans as NoOp and advance.
- Drift reconciliation (eventSeq/stateVersion) (5 SP)
  - Versioning + snapshot catch‑up path.
- Pre‑LLM end preflight (3 SP)
  - Skip LLM when hitting round cap / terminal score.
- (Optional this phase) Minimal persistence (5 SP)
  - Snapshot at round boundaries; reload on restart.

Delta total: ~42–47 SP (vs. original 82 SP)

---

## MVP Scope (Highest Impact, Minimal Work)

Objective: Server‑driven UX with stable URLs and resilience to disconnects, without overhauling persistence.

Included (≈ 22–26 SP)
- Stable links: Use `filterBy(['gameId'])` in matchmaker (3 SP).
- Snapshot + SSR: `GET /games/:gameId/snapshot` (Express) and `app/game/[gameId]` SSR page (9–11 SP total).
- Server auto‑advance: Remove client `advance_round`; advance when all submitted (3 SP).
- Timers + NoOp: Server‑side deadline with default “no action” (5 SP).
- Light reconciliation: Add `eventSeq` only; client requests full snapshot if it detects a gap (2–4 SP).

Excluded from MVP (defer)
- Durable persistence/restart recovery (can follow as a Phase 2.5 add‑on).
- Full `stateVersion` diff protocol (eventSeq alone is sufficient initially).
- Moderator controls/pause.

Why this MVP
- Delivers the benefits we want (authoritative server, rejoinability via URL, deterministic transitions) with the least code churn.
- Keeps Next for rendering but moves all “game data” HTTP to the Colyseus server for a single authoritative backend.

---

## Do We Need a Next “Backend”? (Routes in Colyseus Express)

Short answer: We don’t need Next API routes for the game. Use the Colyseus Express server as the single game backend; keep Next only for page rendering and assets.

Two options
- A) Hybrid (Recommended):
  - Next renders pages (SSR/CSR). All game endpoints (e.g., `GET /games/:gameId/snapshot`) live in Colyseus Express.
  - Pros: One authoritative backend for the game; fewer moving parts; Next stays focused on UI.
  - Cons: One extra hop at SSR (Next → Express) but on the same host/VPC; negligible impact.
- B) Colyseus‑Only Pages:
  - Serve HTML from Express and drop Next for game pages.
  - Pros: One process and no hops.
  - Cons: Lose Next features (App Router, bundling, images, fast refresh). Higher refactor cost now.

Decision
- Adopt A) Hybrid. We already run Next for the UI and Colyseus for WS; centralizing game HTTP in Colyseus keeps the domain logic in one place and minimizes hops without a risky UI migration.

Implementation notes
- Add `GET /games/:gameId/snapshot` to `server/index.ts` (Express). Expose only sanitized state.
- FE SSR calls `process.env.NEXT_PUBLIC_COLYSEUS_HTTP_BASE/games/:gameId/snapshot`.
- Keep `NEXT_PUBLIC_COLYSEUS_URL` for WS and introduce `NEXT_PUBLIC_COLYSEUS_HTTP_BASE` for HTTP.

---

## Idiomatic Colyseus Implementation (Room IDs, Seats, Timers)

Colyseus already provides primitives for everything we need; we should leverage them directly.

- Room identity via `gameId`
  - Option A (clean): set `roomId = gameId` in `onCreate` (guard uniqueness via Presence). Clients can `joinById(gameId)`; no registry needed.
  - Option B (minimal change, recommended for MVP): keep Colyseus’ roomId and `.filterBy(['gameId'])` on `define('game', ...)`. Clients call `joinOrCreate('game', { gameId })` and always land in the same room.

- Seat reservation and reconnection (built‑in)
  - First join reserves a seat via `joinOrCreate`; client uses the returned reservation/`reconnectionToken`.
  - Support reconnects and device transfer with `room.allowReconnection(client, seconds)` on the server and `client.reconnect(token)` on the client.

- Timers (authoritative)
  - Use `this.clock.setTimeout` inside the Room to start/cancel ACTION‑phase deadlines.
  - On timeout, mark missing humans as `NoOp` and advance the round through existing handlers.

- Custom HTTP routes (for SSR and admin)
  - Host `GET /games/:gameId/snapshot` on the same Express app. If the room is in another process, use `matchMaker.remoteRoomCall(roomId, 'getSnapshot')`.
  - A separate `POST /games` wrapper is optional; with `gameId`‑based join it’s not strictly needed.

Decision for MVP
- Use Option B (`filterBy(['gameId'])` + `joinOrCreate({ gameId })`). It avoids a registry and keeps changes low, while giving stable links.

---

## Why a Snapshot Endpoint?

Even with WS patches, a snapshot endpoint provides key benefits:
- SSR initial render: Next can render `/game/[gameId]` without waiting for a WS handshake, improving TTFB and perceived load.
- Rejoin/resume: A fresh client can fetch a full, sanitized state to catch up, then hydrate to realtime.
- Drift repair: If the browser detects event gaps, it can request a new snapshot to reconcile.
- Read‑only spectators/admin: Serve sanitized state without opening a WS per viewer.
- Security/PII: The endpoint can redact private fields by audience.

When you might skip it
- Pure SPA with only WS clients and no SSR needs. For our Next UI and rejoin guarantees, the snapshot endpoint is worth the tiny cost.

### Snapshot Consumers (Who calls it?)
- Next SSR: `app/game/[gameId]/page.tsx` calls it to render the first paint quickly and consistently.
- Browser (fallback): only on rejoin or when a gap is detected via `eventSeq` mismatch; otherwise the browser relies on WS.
- Spectator/Admin pages: read‑only views that don’t maintain a WS (or open WS in a later enhancement).
- Tooling/QA: test fixtures and smoke checks that assert minimal state without standing up a client.

---

## Browser vs Next Backend as the Colyseus Client

Browser as client (recommended for MVP)
- Pros
  - Fewer hops and lower latency: Browser ↔ Colyseus WS directly.
  - Simpler architecture: Use official `colyseus.js` reconnection and seat flows.
  - Less duplication: No need to mirror state in a Next API layer.
- Cons
  - WS endpoint visible to clients (okay for our product).
  - CORS/credentials must be correct (we already fixed this).
  - Harder to aggregate/transform streams centrally.

Next backend as client (proxying to browser via SSE/WebSocket)
- Pros
  - Centralized auth/egress control; can hide WS behind the server.
  - Opportunity to sanitize/shape messages and cache snapshots.
  - Works in constrained networks that block WS to the game backend.
- Cons
  - Extra moving parts and latency; duplicate state handling.
  - More code and failure modes; can back‑pressure under load.

MVP Choice
- Keep the browser as the Colyseus client. Use the snapshot endpoint solely for SSR/rejoin and reconciliation, not as a streaming proxy. Revisit a server‑proxy pattern only if enterprise networking constraints require it.

---

## Snapshot vs WebSocket — Side‑by‑Side (Stock App Analogy)

| Channel  | What it is | Primary uses | Payload | Pros | Caveats |
|---|---|---|---|---|---|
| Snapshot | Full, sanitized dump for bootstrap/recovery | SSR first paint, cold join/rejoin, drift repair when gaps appear | `phase`, `round`, players (public), scores, lastK eventLog entries, `stateVersion`, `eventSeq`, `deadlineAt` | Deterministic first paint, rejoin without WS, redaction by audience, good for spectators/admin | Heavier payload, not live, can be briefly stale; must send `ETag` and `Cache-Control: no-store` |
| WebSocket | Fast deltas (schema patches + discrete events) | Live gameplay updates with minimal latency | Schema patches + events carrying `eventSeq` | Low latency, tiny payloads, continuous UI updates | Deltas can be dropped or arrive out-of-order; rely on `eventSeq` and reconnection to recover |

Stock app analogy: Snapshot = “opening positions/order book”; WebSocket = “price ticks and order book deltas”. If you miss ticks, pull a fresh snapshot and keep streaming.

### Client Flow (Happy Path + Recovery)

| Step | Behavior |
|---|---|
| SSR | Render `/game/[gameId]` using snapshot vX. |
| Connect | Browser opens WS; compare `ws.stateVersion` vs `ssr.stateVersion`. If WS is newer, adopt WS immediately; otherwise keep SSR state until a newer WS patch arrives. |
| Gap detect | Track `lastEventSeq`. If an incoming event skips (`+>1`), call `GET /games/:id/snapshot?since=lastEventSeq`. If contiguous events aren’t available, fetch full snapshot and replace local state. |
| Resume | Continue normal WS‑driven updates. |

### Guardrails

| Rule | Notes |
|---|---|
| Single source of truth | Room’s StateManager; both WS and snapshot read from it (use `remoteRoomCall('getSnapshot')` cross‑process). |
| Caching discipline | Respond with `ETag: W/"gs-<gameId>-<stateVersion>"` and `Cache-Control: no-store` on snapshots. |
| Timers | Include `deadlineAt` (epoch ms) in snapshot; server enforces timeouts. Client timers are cosmetic and re‑sync visually. |


## Migration Plan (Incremental)
1) Introduce `gameId` issuance and registry mapping to `roomId`.
2) Add `GET /games/:gameId/snapshot` endpoint (sanitized).
3) Switch FE routing to `/game/[gameId]` and SSR initial snapshot.
4) Replace client transitions with server‑driven `phase` rendering.
5) Add per‑phase timers and `NoOp` on timeout.
6) Add `stateVersion`/`eventSeq` and reconciliation path.
7) Persist snapshots at round boundaries; implement restart recovery.

## Lobby & Matchmaking Flow (Option A: Direct Invite - MVP)

**Decision**: Implement direct invite pattern for MVP (Dec 12 event). Public lobby browsing deferred to post-event.

### User Flow

**Create Game:**
1. User lands on lobby screen
2. Selects scenario from dropdown (Classic, AI Safety, Custom)
3. Sets max players (2-6, default 6)
4. Clicks "Create Game"
5. → Room created with unique gameId (e.g., "ABC123")
6. → Enters waiting room state

**Waiting Room:**
- Displays room code prominently (large font)
- Copy link button (`simulacra.cc/game/ABC123`)
- QR code for easy mobile sharing
- Shows joined players in real-time:
  - ✓ You (Tech CEO) - Host
  - ✓ Alice (Journalist)
  - ⏳ Waiting...
  - ⏳ Waiting...
- Host sees "Start Game" button (always enabled)
- Non-host players see "Waiting for host to start..."

**Join Game:**
1. User receives room code/link from friend
2. Opens link → lands on `/game/ABC123`
3. SSR renders current room state (waiting room)
4. User selects available role
5. Clicks "Join Game"
6. → `client.joinOrCreate('game', { gameId: 'ABC123', role: 'Journalist', ... })`
7. Colyseus matchmaker routes to existing room with same gameId

**Start Game:**
1. Host clicks "Start Game"
2. Remaining empty slots → auto-filled with AI players
3. All clients receive `game_started` event
4. Navigate to `/game` (action phase)

### Technical Implementation

**Room Creation:**
- `GameRoom.onCreate()` generates 6-char gameId (ABC123 format)
- Stored in `state.roomCode` for client sync
- Server uses `filterBy(['gameId'])` - ensures `joinOrCreate({ gameId })` lands in same room

**Joining:**
- Client calls `joinOrCreate('game', { gameId, role, name, ... })`
- Colyseus matchmaker checks for existing room with matching gameId
- If exists → join that room
- If not → create new room with that gameId (host)

**Room Code Format:**
- 3 uppercase letters + 3 numbers (e.g., ABC123)
- Excludes ambiguous chars (0/O, 1/I/L)
- Namespace: 15.8 million codes
- Generated by `server/lib/roomCodeGenerator.ts`

**Reconnection:**
- `allowReconnection(client, 60)` on disconnect
- 60-second window to rejoin
- Preserves seat and game state
- Disabled after game ends (phase = 'end')

### Deferred Features (Post-MVP)

- **Public lobby browsing**: List of joinable games
- **Ready/not-ready status**: Player readiness indicators
- **Auto-start timer**: Force start after X minutes
- **Host migration**: Transfer host if original leaves
- **Spectator mode**: Join as observer (no role)

### Edge Cases Handled

**Room full:** Colyseus enforces `maxClients = 6`, rejects join attempts
**Host leaves during waiting:** First remaining player becomes host (Colyseus default behavior)
**Late join after start:** Rejected (phase !== 'lobby')
**Invalid room code:** 404 page or "Room not found" message

---

## Open Questions
- ~~Late joins: spectator vs claim empty seat?~~ → Resolved: No late joins post-start (MVP)
- ~~Moderator controls: pause/force advance?~~ → Deferred to post-MVP
- Public spectator link with redactions? → Deferred to post-MVP
- Maximum event log tail length in snapshot responses? → TBD during implementation

---

## Appendix A — Minimal Schema (Illustrative)
```ts
// Strings, not numeric enums
export type GamePhase = 'lobby'|'starting'|'action'|'consequence'|'end';

export interface PublicPlayer {
  id: string;
  role: string; // from scenario
  isHuman: boolean;
  publicScore: number;
}

export interface GameStatePublic {
  gameId: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  players: PublicPlayer[];
  publicScores: Record<string, number>; // roleId → score
  stateVersion: number; // monotonic
  eventSeq: number; // monotonic
}
```

## Appendix B — Timeout Handling in Prompts
- Input to LLM includes `chosenActions` for all roles. For any missing human: `{ role: X, action: 'NO_OP' }`.
- Prompt makes explicit: “If a role did not act, model real‑world inertia; apply minimal but plausible consequences.”
- Scoring: `NO_OP` cost = 0 AP. Downstream effects are LLM‑driven.

## Backlog & Estimates (Story Points)
Scale: 1, 2, 3, 5, 8, 13 (≈ 1 SP = 0.5–1 eng‑day depending on familiarity).

### Epic A — GameId via Matchmaker + Reconnect (3 SP)
- `filterBy(['gameId'])` or `roomId = gameId`; no bespoke registry (2)
- Reconnect via `allowReconnection`/`reconnectionToken` (1)

Acceptance: Joining with `{ gameId, joinToken }` rebinds seat across reconnects/devices.

### Epic B — Snapshot Endpoint & Next SSR (13 SP)
- `GET /games/:gameId/snapshot` route with sanitization (3)
- Zod schema + type exports for SSR client (3)
- Next `app/game/[gameId]/page.tsx` SSR + hydration glue (5)
- Optional spectator read‑only route `/spectate/[gameId]` (2)

Acceptance: Visiting `/game/[gameId]` renders from snapshot without WS; hydration picks up live state.

### Epic C — Server‑Driven Phases & Intents (8 SP)
- Remove client transitions; render purely from `phase` (5)
- AuthZ: restrict `start_game` to host/mod (3)

Acceptance: Clients never call `advance_round`; server broadcasts drive all transitions.

### Epic D — Timers & NoOp On Timeout (8 SP)
- Per‑phase timers, persisted in room state (3)
- NoOp record for missing humans; prompt update for LLM (3)
- Env config for durations + admin override (2)

Acceptance: If user waits past deadline, round auto‑advances with NoOp and consistent narrative.

### Epic E — Drift Reconciliation (eventSeq/stateVersion) (8 SP)
- Add `stateVersion` and `eventSeq` to schema and events (2)
- Client reconciliation path + retry snapshot if gaps (3)
- Support `?since=` for incremental catch‑up; fallback to full snapshot (3)

Acceptance: Hard reload or interrupted client resumes without inconsistencies.

### Epic F — Persistence & Recovery (13 SP)
- Snapshot persistence to Postgres at round boundaries (5)
- Restart recovery: load snapshot + rebuild `gameId → roomId` (3)
- Persist event log; keep in‑memory tail with truncation (5)

Acceptance: Kill/restart server; game resumes from last snapshot; URLs remain stable.

### Epic G — Chosen‑Actions Collector Unification (5 SP)
- Single collector producing `{ roleId → chosenAction }` for human/AI (3)
- Wire GameController to consume collector output (2)

Acceptance: Identical path for human/AI; cleaner controller code; easier testing.

### Epic H — Dev Orchestration, Ports & CORS (3 SP)
- All ports/env surfaced; kill‑port prompt (1)
- CORS with credentials and origin whitelist from env (2)

Acceptance: `pnpm dev` boots FE+WS with consistent URLs; no CORS errors.

### Epic I — Observability & Admin (5 SP)
- Structured logs with request/trace IDs; key timers (3)
- Colyseus admin monitor access behind env flag (2)

Acceptance: Can trace a full round across services; admin can inspect rooms.

### Epic J — QA & Tests (8 SP)
- Integration tests: start → options → submit → result → next round (5)
- End conditions (round cap/score) + reconnection tests (3)

Acceptance: Green test run; manual QA script documented.

### Epic K — Docs & Runbooks (3 SP)
- Update readme/env setup; add operator runbooks (3)

Acceptance: New dev can run SSR + WS locally with one command.

### Total
- Sum = 3 + 13 + 8 + 8 + 8 + 13 + 5 + 3 + 5 + 8 + 3 = 77 SP
- Rough time: Solo dev ≈ 7–10 weeks; 2 devs ≈ 4–5 weeks. Team familiarity can pull lower end.

## Risks & Unknowns
- LLM latency variability may necessitate background workers; sized out of this phase (would add 8–13 SP).
- Legacy client code paths that still assume client transitions may surface; buffer 10–15% contingency.
- Redis/presence availability for `gameId` registry in multi‑proc deploys.

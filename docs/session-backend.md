# Server‑Authoritative Session Backend (Design)

Status: Proposed (Phase 1)

Owner: ai-risk-ttx-63 epic — “Server‑Authoritative State & Next.js API Routes (Phase 1)”

Goals
- Server owns truth for game sessions (no SPA‑only state).
- Deterministic, auditable mutations with revision control.
- Clean API contracts, versionable, and testable in isolation.
- Low‑risk rollout gated behind `BACKEND_STATE=1`.

Non‑Goals (Phase 1)
- Real‑time push (SSE/WebSocket). Start with polling/ETag.
- Full auth suite. Use lightweight host/player tokens first.
- Complex persistence schema. Begin with JSON state + a few tables.

Why Now
- Eliminates divergent client state and reduces 404/shape drift during LLM route migrations.
- Enables save/resume, analytics, and replay features.

Overview
Client renders UI and sends intents; server validates, mutates, persists, and returns the canonical snapshot with a monotonically increasing `revision`. Clients include `If-Match: <revision>` on mutations and receive `409` on conflicts. Reads may supply `If-None-Match: <revision>` and receive `304` when unchanged.

Multiplayer Concept: Rooms (Lobbies)
- A Room is a pre‑game lobby where multiple humans (and AI seats) gather, claim roles, and ready up.
- Starting a Room creates a Session (a single game run). A Room may create multiple Sessions over time (rematches).
- Seats map to scenario roles and can be configured as Human or AI; host can lock seats.
- Presence and seat changes use polling with ETags in Phase 1 (optional SSE in Phase 1.5).

Data Model (Prisma sketch)
```prisma
model GameSession {
  id         String   @id @default(cuid())
  mode       String   // classic | ai_safety | custom | …
  round      Int
  phase      Int      // GamePhase enum numeric
  setup      Json     // GameSetup
  state      Json     // GameState
  maxRounds  Int
  aiPlayers  Int
  hostToken  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  endedAt    DateTime?
  revision   Int      // bump on each write
  Players    Player[]
}

model Player {
  id         String   @id @default(cuid())
  sessionId  String
  name       String
  role       String
  isAI       Boolean
  isHost     Boolean   @default(false)
  @@index([sessionId])
}

model Action {
  id         String   @id @default(cuid())
  sessionId  String
  round      Int
  playerId   String
  key        String
  title      String
  description String
  submittedAt DateTime @default(now())
  @@index([sessionId, round])
}
```

Additional Models (Rooms / Multiplayer)
```prisma
model Room {
  id              String   @id @default(cuid())
  code            String   @unique // join code, short
  name            String
  status          String   // lobby | in_game | post_game
  hostToken       String
  currentSessionId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  Seats           Seat[]
  Members         RoomMember[]
}

model RoomMember {
  id          String   @id @default(cuid())
  roomId      String
  displayName String
  playerToken String   @unique
  isHost      Boolean  @default(false)
  joinedAt    DateTime @default(now())
  lastSeenAt  DateTime @updatedAt
  @@index([roomId])
}

model Seat {
  id         String   @id @default(cuid())
  roomId     String
  roleName   String
  isAI       Boolean  @default(false)
  aiConfig   Json?
  locked     Boolean  @default(false)
  occupantId String?
  @@unique([roomId, roleName])
}
```

Store Abstraction
```ts
// server/stores/sessionStore.ts
export interface SessionStore {
  create(init: CreateArgs): Promise<Session>;
  get(id: string): Promise<Session | null>;
  update(id: string, expectedRev: number, mut: (s: Session) => Session): Promise<Session>; // 409 on mismatch
  submitActions(id: string, playerId: string, expectedRev: number, actions: ActionInput[]): Promise<Session>;
  advance(id: string, expectedRev: number): Promise<Session>; // calls LLM facade internally
  setDebrief(id: string, expectedRev: number, debrief: Debrief): Promise<Session>;
}
```

Implementations
- MemorySessionStore (Phase 1): in‑memory Map with TTL for development/tests.
- PrismaSessionStore (Phase 1): JSON `state` + relational tables for players/actions, `revision` integer.

Room Store (Phase 1)
- MemoryRoomStore + PrismaRoomStore exposing: `createRoom`, `joinRoom`, `claimSeat`, `releaseSeat`, `startSession`, `getRoom`, presence heartbeats.

API Shape (Next.js Route Handlers)
- `POST /api/session`
  - Body: `{ mode, setup?, maxRounds?, aiPlayers? }`
  - Returns: `{ id, state, revision, hostToken }`
- `GET /api/session/[id]`
  - Headers: `If-None-Match: <revision>` optional → `304` unchanged
  - Returns: `{ id, state, revision }`
- `PATCH /api/session/[id]`
  - Headers: `If-Match: <revision>` required → `409` on mismatch
  - Body: `{ patch: { maxRounds?, aiPlayers? } }`
  - Returns: `{ id, state, revision }`
- `POST /api/session/[id]/join`
  - Body: `{ name }` → assigns a human player slot (returns `playerToken`)
- `POST /api/session/[id]/action-options`
  - Body: `{ playerId }` (or infer from token)
  - Returns: `{ options }` (LLM facade, mock or real)
- `POST /api/session/[id]/actions`
  - Headers: `If-Match: <revision>`
  - Body: `{ playerId, actions: ActionOption[] }`
- `POST /api/session/[id]/advance`
  - Headers: `If-Match: <revision>`
  - Body: `{}` (host only) → resolves consequences and increments round
- `POST /api/session/[id]/debrief`
  - Body: `{}` → computes and stores debrief
- `GET /api/meta/status` (existing)
  - Returns LLM and DB readiness; add store status

Room (Lobby) Routes
- `POST /api/rooms` → `{ id, code, hostToken }`
- `GET /api/rooms/:roomId` → `{ room, seats, members, currentSessionId }` (ETag=roomRev)
- `POST /api/rooms/:roomId/join` → `{ memberId, playerToken }`
- `POST /api/rooms/:roomId/seat/claim` (player token) → `{ seat }` (409 if taken/locked)
- `POST /api/rooms/:roomId/seat/release` (player token)
- `POST /api/rooms/:roomId/seat/ai` (host token) → toggle AI/lock/config
- `POST /api/rooms/:roomId/start` (host token) → `{ sessionId }` (snapshots seats into players)
- `GET /api/rooms/:roomId/stream` (optional SSE)

Contracts & Codes
- `200` success, envelope `{ success: true, data }`
- `400` validation (Zod), `{ success: false, error }`
- `403` auth (host‑only action or invalid token)
- `404` not found session
- `409` revision mismatch, include `{ latest: { state, revision } }`
- `503` missing env (fail‑fast guard)

Multiplayer Semantics
- Seat claiming is first‑come with server enforcement on `(roomId, roleName)`.
- Start requires required seats filled; host may auto‑fill remaining with AI.
- Each human seat must submit actions (or timeout). Server auto‑submits `[]` on deadline to advance.
- Barrier to advance: all human seats submitted OR host triggers advance (configurable per room).
- `deadlineAt` is stamped on session each round for synchronized countdown.
- Members rejoin via `playerToken` and are re‑bound to their seat.
- Spectators (no seat) may subscribe to state; read‑only.

Revision & Caching
- Every response includes `revision`. Clients use:
  - Mutations: `If-Match: <revision>` → 409 on conflict
  - Reads: `If-None-Match: <revision>` → 304 if unchanged
- ETag value is the decimal string of `revision` (Phase 1 simplification).

Auth & Security (lightweight)
- `hostToken` returned on session creation; required for `advance`, `patch`, and `debrief`.
- `playerToken` from `/join` required for submitting actions.
- Tokens are opaque random strings (stored server‑side) and sent as HttpOnly cookies; header fallback for tests.

Auth additions (Rooms)
- Room `code` enables invite URLs like `/r/A1B2C3`.
- Host transfer supported; rotating `hostToken` and revoking old one.

LLM Integration
- Server routes call the existing LLM facade (`server/services/llmService.ts`).
- Mock mode bypasses key checks: set via dev flag `--mock-llm` or env `LLM_MODE=mock`.
 - For AI seats, the server invokes `generateAITurn` for each AI seat on entering ACTION phase and counts them towards the advance barrier.

Feature Flags
- `BACKEND_STATE=1` gate in the client:
  - When on, `useGameController` delegates to `services/sessionClient.ts` instead of keeping local authoritative state.
  - When off, SPA behavior remains (current default), ensuring safe rollout.
 - `MULTIPLAYER=1` enables Rooms UI and routes; when off, single‑player flow remains.

Lifecycle Flows
1) Create → Join → Start
   - `POST /session` → returns `{id, revision, hostToken}`
   - `POST /session/:id/join` (human)
   - `PATCH /session/:id` with round/ai players if needed
   - `POST /session/:id/advance` (host) to trigger first scenario if not preset
2) Round N
   - `POST /session/:id/action-options` per player as needed
   - `POST /session/:id/actions` (human submits)
   - `POST /session/:id/advance` (host)
3) End
   - `POST /session/:id/debrief`

Multiplayer Lifecycle (Rooms → Session)
1) `POST /rooms` → `{ roomId, code, hostToken }`
2) Members join: `POST /rooms/:roomId/join` → `{ memberId, playerToken }`
3) Claim seats: `POST /rooms/:roomId/seat/claim` (host toggles AI seats as needed)
4) Start: `POST /rooms/:roomId/start` → `{ sessionId }`; clients navigate to the session
5) Round loop with barrier/timeout, then debrief; optionally rematch by creating a new session in the same room

Validation & Types
- Zod schemas for every route; API expects core types from `types/core.ts` to keep React out of server.
- Structured outputs: all optional fields become required+nullable to align with OpenAI SDK constraints.

Testing Strategy
- Store unit tests (happy path, 409, TTL behavior for memory impl).
- Route handler tests importing functions directly, validating 200/400/403/404/409/503 paths.
- Hook integration tests (jsdom) pointed at `sessionClient` mock to lock user‑visible behavior.

Observability
- `GET /api/meta/status` includes `store: memory|prisma`, `db: up/down`, `llm: up/down`.
- Add per‑mutation `x-revision` echo header and `x-req-id` for tracing in logs.
 - Rooms: `GET /api/rooms/:roomId` returns ETag for seat/member revisions; SSE stream (if enabled) reports `room:update` and `presence` events.

Performance & Scaling
- Phase 1: request/response with polling and ETags; keep payloads compact by trimming transient fields (e.g., omit large chat history unless needed).
- Phase 2 (optional): SSE channel for session updates; backpressure via `revision` window.
 - Pub/Sub: for production real‑time, integrate Upstash Redis Pub/Sub or Vercel Realtime to fan‑out room/session updates across instances.

Migration Plan
1) Implement `SessionStore` + Memory impl.
2) Add `/api/session` routes (POST/GET/PATCH) and wire `runtime = 'nodejs'`.
3) Add mutation routes: `/join`, `/action-options`, `/actions`, `/advance`, `/debrief`.
4) Introduce `services/sessionClient.ts`; guard usage with `BACKEND_STATE`.
5) Add jsdom tests to prove parity (phase transitions, options loading, advance, debrief).
6) Rollout: enable `BACKEND_STATE=1` in preview; soak; then default on.

Multiplayer Add‑On Plan
7) Implement Room store and `/api/rooms` routes; add minimal Lobby UI behind `MULTIPLAYER`.
8) Add seat claim/release tests; start flow creates a session from seats.
9) Introduce SSE (optional) or polling with ETags; add Pub/Sub adapter for production.
10) Flip `MULTIPLAYER=1` in preview and soak.

Env & Flags
```env
# Feature gate
BACKEND_STATE=0        # 1 to enable server‑authoritative mode on client
MULTIPLAYER=0          # 1 to enable Rooms and lobby UI

# LLM (server)
LITELLM_API_KEY=...
LITELLM_BASE_URL=...
LLM_MODEL=gpt-4o-mini

# Game tuning (server+client)
NEXT_PUBLIC_GAME_MAX_ROUNDS=5
NEXT_PUBLIC_GAME_AI_PLAYERS=5
```

Open Questions / Risks
- Token scoping and impersonation in shared devices — mitigate by short TTL + rotation.
- Large session payloads with long chat histories — consider trimming/compacting; store chat separately if needed.
- Conflict policy beyond 409 — auto‑merge for some fields later?
- SSE limits on serverless: prefer short‑lived streams or move to managed Pub/Sub (Vercel Realtime/Ably/Pusher) for presence at scale.

---

# Test‑Driven Development (TDD) Plan

Principles
- Red → Green → Refactor in thin vertical slices (one use case at a time).
- Keep core logic pure and framework‑agnostic (stores/router) with tiny Next.js wrappers.
- Contract tests first to lock request/response shapes and status codes.

Test Layers (what to cover)
- Store unit tests
  - File: `server/stores/sessionStore.memory.test.ts`
  - Cases: create/get/update; revision bumps; 409 on stale `If‑Match`; advance flow invariants (round increments, score clamp, log append).
- Router unit tests (pure mini‑router)
  - File: `lib/api/session-router.test.ts`
  - Given method + path + body + headers → assert Response status, envelope, and `ETag`/`x-revision`.
- Handler tests (import pure router)
  - File: `tests/api/session-routes.test.ts`
  - Matrix: 200/400/403/404/409/503 across create/get/patch/join/actions/advance/debrief.
- Client tests (sessionClient)
  - File: `tests/services.sessionClient.routes.test.ts`
  - Assert consolidated paths under `/api/session/[[...parts]]` and headers: `If‑Match`/`If‑None‑Match`.
- Hook integration (feature‑flagged)
  - File: `tests/hooks.useGameController.session.test.ts`
  - With `BACKEND_STATE=1` and mocked `sessionClient`: classic start → options → submit → advance.

Red → Green → Refactor Sequence
1) Contracts (fail first)
   - Write Zod schemas for each route; tests for 400 on invalid payloads and 503 on missing env (LLM routes only).
2) `SessionStore` (memory)
   - Write failing tests for create/get/update/409; implement minimal memory store to pass.
3) Session Mini‑Router (pure function)
   - Tests for: POST /session; GET with `If‑None‑Match` → 304; PATCH with `If‑Match`; POST actions/advance/debrief with tokens.
   - Implement `lib/api/session-router.ts` that uses the store and LLM facade.
4) Next.js Catch‑All Route Wrapper
   - Add `app/api/session/[[...parts]]/route.ts` that forwards to the mini‑router.
5) Client `sessionClient`
   - Tests to assert paths and headers; implement minimal client.
6) Hook behind `BACKEND_STATE`
   - Tests to verify phase transitions and error surfacing using mocked `sessionClient`.

Core Assertions to Lock In
- Revision control
  - Every response includes `revision`; `ETag === String(revision)`.
  - Mutations without `If‑Match` → 400; stale `If‑Match` → 409 with `{ latest }` snapshot.
  - GET with `If‑None‑Match` → 304 when unchanged.
- Security
  - `advance` requires `hostToken`; `actions` requires `playerToken`; wrong tokens → 403.
- Env guard
  - `advance`/`debrief` return 503 when LLM env missing and mock mode off.
- Multiplayer‑ready fields
  - Session state carries `deadlineAt` and `submitted` map so barrier/timeout can be added later without breaking clients.

Files to Add (by TDD step)
- `server/stores/sessionStore.ts` (interface)
- `server/stores/sessionStore.memory.ts` + `server/stores/sessionStore.memory.test.ts`
- `lib/api/session-router.ts` + `lib/api/session-router.test.ts`
- `app/api/session/[[...parts]]/route.ts` (tiny wrapper)
- `services/sessionClient.ts` + `tests/services.sessionClient.routes.test.ts`
- `tests/api/session-routes.test.ts`
- `tests/hooks.useGameController.session.test.ts`

Coverage & Speed
- Keep tests fast (pure functions, mock LLM facade).
- Gate via `npm run test:coverage` in pre‑commit (already configured).

Vercel 12‑Function Limit Strategy
- Consolidate handlers:
  - Sessions: `/api/session/[[...parts]]` (one function)
  - LLM: existing `/api/llm/generate/[action]` (one function)
  - Health: `/api/meta/status` (one function)
  - Later Rooms: `/api/rooms/[[...parts]]` (one function)
- Total ≤ 4 functions.


Appendix — Minimal sessionClient (sketch)
```ts
export async function getSession(id: string, since?: number) {
  const headers: Record<string, string> = {};
  if (since != null) headers['If-None-Match'] = String(since);
  const res = await fetch(`/api/session/${id}`, { headers });
  if (res.status === 304) return null;
  const body = await res.json();
  return body.data; // { id, state, revision }
}
```

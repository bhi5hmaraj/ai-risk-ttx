# Multiplayer Phase 2 — Server‑Driven, Idiomatic Colyseus

Status: Draft
Owner: Platform/Multiplayer
Date: 2025‑11‑28

## Goals
- Server authoritative game loop; clients emit intents only.
- Stable `gameId` URLs with seamless rejoin across devices.
- Use Colyseus the idiomatic way (full state on join/reconnect + delta patches).
- Next.js used for pages/SSR only; all game logic lives beside the Colyseus server.
- Timeouts default to NoOp; server advances rounds.

## Principles
- Single source of truth: StateManager (in-memory core state per room).
- Thin transport adapters: Room/handlers translate messages → service calls → broadcasts.
- Orchestrator service: GameController advances rounds (LLM + domain logic) and returns new core state.
- No client transition logic; UI renders from server phase and events.

## Identity & Join (No Custom Registry)
- Use Colyseus matchmaker with `filterBy(['gameId'])` on `define('game', ...)`.
  - Clients call `joinOrCreate('game', { gameId })` and land in the same room deterministically.
  - Alternative (optional): set `roomId = gameId` on create (guard with Presence) and `joinById(gameId)`.
- Seats & reconnects are built‑in:
  - First join reserves a seat; client holds `reconnectionToken`.
  - Server calls `room.allowReconnection(client, seconds)`; client uses `client.reconnect(token)`.
- Stable `playerId` separate from Colyseus `sessionId` (session is ephemeral).

## Routing & SSR
- URLs: `/game/[gameId]` (Next App Router).
- SSR (server component) fetches a sanitized snapshot via HTTP from the Colyseus Express server for first paint.
- Browser hydrates to the Colyseus WS stream using `colyseus.js` (seat/reconnect flows).
- Hydration precedence: prefer newer WS state over SSR if versions differ.

## State & Phases (Authoritative)
- Phases are strings: `'lobby' | 'starting' | 'action' | 'consequence' | 'end'`.
- StateManager owns core state + players; projects to Schema via adapters.
- Colyseus sends full state on join/reconnect, then patches; no extra “browser snapshot” is needed for correctness.

## Server‑Driven Loop
- Intents from client: `start_game`, `submit_action { actionId, cost }`.
- Handlers (thin): validate/authorize → call GameController/StateManager → broadcast.
- GameController: runs AI turns + LLM, applies consequences, returns next core state.
- Server auto‑advances when all submitted; clients never call `advance_round`.

## Timers & Default NoOp
- ACTION‑phase deadline via `room.clock.setTimeout(...)`.
- On timeout, mark missing humans as NoOp (0 AP) and advance round through the same path.
- Include `deadlineAt` (epoch ms) in state so UI timers can visually re‑sync; server remains authoritative.

## Snapshot Endpoint (SSR / Non‑WS Consumers)
- Keep a single HTTP endpoint on the Colyseus Express server:
  - `GET /games/:gameId/snapshot` → sanitized state for SSR/spectators/admin.
- Implementation:
  - Room exposes `getSnapshot()` returning sanitized core state plus `deadlineAt` and an optional `stateVersion`.
  - Express route resolves the room by `{ gameId }` (via matchmaker query) and calls `matchMaker.remoteRoomCall(roomId, 'getSnapshot')`.
- Not used for browser recovery: Colyseus join/reconnect already resyncs full state.
- Response headers: `Cache-Control: no-store` and optional `ETag: W/"gs-<gameId>-<stateVersion>"`.

## Events & Broadcasts (unchanged contract)
- Schema state updates drive the UI.
- Discrete events (append‑only in the UI):
  - `players_init`, `game_started`, `new_round`, `action_options`, `round_result`, `game_ended`, `current_event`.
- Clients render purely from `phase`, last `round_result`, and per‑player `action_options`.

## Next vs Browser as Colyseus Client
- Browser connects directly via `colyseus.js` (lower latency, simpler, idiomatic seat/reconnect).
- Next only calls HTTP for SSR snapshot and page rendering; no streaming/proxying.

## Minimal APIs (MVP)
- Required now: `GET /games/:gameId/snapshot` (Express on the Colyseus server).
- Optional later: admin actions (force advance/end) on a protected admin route.

## MVP Scope (Targeted Changes)
- Remove client “advance round” path; server auto‑advance on all submitted (3 SP).
- Add ACTION timer + NoOp and wire into the same advance path (5 SP).
- Use `filterBy(['gameId'])` and accept `{ gameId }` in join options (2 SP).
- Add Room.getSnapshot() + `GET /games/:gameId/snapshot` for SSR (9 SP).
- Add `/game/[gameId]` SSR page; hydrate to WS and prefer WS state on connect (2 SP).
- Cleanup: drop legacy SSE path and duplicate hooks; keep a single Colyseus provider (3 SP).

Estimate: ~24 SP (≈ 2–3 weeks solo; ~1–2 weeks for 2 devs).

## Acceptance Criteria
- Client never sends `advance_round`; round transitions are server‑driven.
- Timeout produces NoOp for missing humans; round proceeds; UI reflects result without races.
- Reconnect from another device resumes seat (reconnectionToken) and resyncs full state.
- `/game/[gameId]` SSR renders from snapshot; browser hydrates to live WS; mismatches resolve in favor of WS.

## Risks & Notes
- Ensure phase enums are strings end‑to‑end to avoid schema encode errors.
- If you front with a proxy later, keep CORS/credentials aligned with Colyseus matchmaker headers.
- Persistence (snapshots to DB) can follow as a later phase; not required for MVP.

## Lobby & Matchmaking Flow (Option A: Direct Invite — MVP)

Decision: Implement direct‑invite pattern for the Dec 12 event. Public lobby browsing is deferred to post‑event.

### User Flow

Create Game
1. User lands on lobby screen.
2. Selects scenario from dropdown (Classic, AI Safety, Custom).
3. Sets max players (2–6, default 6).
4. Clicks “Create Game”.
5. Room is created with a unique `gameId` (e.g., ABC123).
6. User enters a waiting room state.

Waiting Room
- Displays room code prominently (large font).
- Copy link button (`simulacra.cc/game/ABC123`).
- QR code for easy mobile sharing.
- Shows joined players in real time, e.g.:
  - ✓ You (Tech CEO) — Host
  - ✓ Alice (Journalist)
  - ⏳ Waiting...
  - ⏳ Waiting...
- Host sees “Start Game” button (always enabled).
- Non‑hosts see “Waiting for host to start…”.

Join Game
1. User receives room code/link from friend.
2. Opens link → lands on `/game/ABC123`.
3. SSR renders current room state (waiting room).
4. User selects an available role.
5. Clicks “Join Game”.
6. Client calls `joinOrCreate('game', { gameId: 'ABC123', role: 'Journalist', ... })`.
7. Colyseus matchmaker routes to existing room with the same `gameId`.

Start Game
1. Host clicks “Start Game”.
2. Remaining empty slots are auto‑filled with AI players.
3. All clients receive `game_started`.
4. Clients remain on `/game/ABC123` and render ACTION phase.

### Technical Implementation

Room Creation
- `GameRoom.onCreate()` generates a 6‑char `gameId` (ABC123 format).
- Stored in Schema (e.g., `state.roomCode`) for client sync.
- Server uses `filterBy(['gameId'])` so `joinOrCreate({ gameId })` always lands in the same room.

Joining
- Client calls `joinOrCreate('game', { gameId, role, name, ... })`.
- Matchmaker checks for an existing room with matching `gameId`.
- If exists → join that room; if not → create a new room (host flow).

Room Code Format
- 3 uppercase letters + 3 numbers (e.g., ABC123).
- Excludes ambiguous chars (0/O, 1/I/L).
- Namespace ≈ 15.8 million codes.
- Generator utility at `server/lib/roomCodeGenerator.ts`.

Reconnection
- `allowReconnection(client, 60)` on disconnect (60‑second window).
- Preserves seat and game state; disabled after game ends (`phase === 'end'`).

### Deferred Features (Post‑MVP)
- Public lobby browsing (list joinable games).
- Ready/not‑ready status.
- Auto‑start timer (force start after X minutes).
- Host migration (transfer host if original leaves).
- Spectator mode (observer, no role).

### Edge Cases Handled
- Room full: Colyseus enforces `maxClients = 6`, rejects joins.
- Host leaves during waiting: first remaining player becomes host (Colyseus default).
- Late join after start: rejected (`phase !== 'lobby'`).
- Invalid room code: 404 page or “Room not found”.

### Open Questions
- (Resolved) Late joins post‑start → No late joins in MVP.
- (Deferred) Moderator controls: pause/force advance.
- (Deferred) Public spectator link with redactions.
- (TBD) Maximum event log tail length in snapshot responses.

### Waiting Room UI Design (Idiomatic Colyseus)

The waiting room follows idiomatic Colyseus patterns: rely on Schema state sync, avoid redundant custom messages.

**Data Sources**:
- `room.state.roomCode` (string) - Room code for sharing
- `room.state.players` (MapSchema<Player>) - Connected players (single source of truth)
- `room.state.phase` (string) - Current phase ('lobby', 'action', etc.)
- `room.state.maxRounds` (number) - Max rounds from lobby config
- `players_init` message - Enriched role data (objectives, resources) not in Schema

**Component Architecture**:
```typescript
// WaitingRoom.tsx
function WaitingRoom() {
  const { room, state, players } = useColyseus();

  // Read from Schema - Colyseus automatically syncs
  const roomCode = state?.roomCode || '';
  const phase = state?.phase || 'lobby';
  const playerList = players ? Array.from(players.values()) : [];

  // Determine host (first player by join order or via metadata)
  const hostSessionId = playerList[0]?.sessionId;
  const isHost = room?.sessionId === hostSessionId;

  // Render based on phase
  if (phase !== 'lobby') {
    return null; // Not waiting room phase
  }

  return (
    <div>
      <h1>Room Code: {roomCode}</h1>
      <button onClick={() => copyLink(`https://simulacra.cc/game/${roomCode}`)}>
        Copy Link
      </button>
      <QRCode value={`https://simulacra.cc/game/${roomCode}`} />

      <h2>Players ({playerList.length}/6)</h2>
      <ul>
        {playerList.map(player => (
          <li key={player.sessionId}>
            ✓ {player.name} ({player.role}) {player.sessionId === hostSessionId ? '— Host' : ''}
          </li>
        ))}
        {Array.from({ length: 6 - playerList.length }).map((_, i) => (
          <li key={`empty-${i}`}>⏳ Waiting...</li>
        ))}
      </ul>

      {isHost ? (
        <button onClick={() => room.send('start_game', {})}>
          Start Game
        </button>
      ) : (
        <p>Waiting for host to start…</p>
      )}
    </div>
  );
}
```

**State Sync Patterns**:
- ✅ Read `room.state.players` directly (MapSchema auto-syncs)
- ✅ Use `room.state.onChange()` for real-time updates (handled by ColyseusProvider)
- ✅ Phase-based rendering (`phase === 'lobby'`)
- ❌ Don't maintain separate React state for player list
- ❌ Don't send custom `player_joined`/`player_left` messages (Colyseus handles this)

**Host Detection**:
- Option 1: First player in `players` MapSchema (simple, works for MVP)
- Option 2: Add `hostSessionId` to Schema (more explicit, allows host migration)
- MVP uses Option 1 (first player = host)

**Role Selection Flow**:
1. User lands on `/game/ABC123` (SSR renders waiting room)
2. If not connected, show role picker modal
3. User selects role → calls `room.send('set_role', { role, name })`
4. Server updates `player.role` in Schema
5. Colyseus syncs to all clients → UI updates

**Share Options**:
- Copy link button: `navigator.clipboard.writeText(url)`
- QR code: Use `react-qr-code` library
- Display room code in large, readable font

**Implementation Notes**:
- Component lives at `components/game/WaitingRoom.tsx`
- Rendered by `/game/[gameId]` page when `phase === 'lobby'`
- Uses existing `useColyseus()` hook from ColyseusProvider
- No new Zustand state needed (Schema is source of truth)

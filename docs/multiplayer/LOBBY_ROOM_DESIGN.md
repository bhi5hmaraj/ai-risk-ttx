# Multiplayer Lobby Room Design (Phase 2)

Status: Draft
Owner: Multiplayer
Updated: 2025-11-29

## Goals

- Single authoritative game room per `gameId` — no split rooms.
- Host-only start. Clients see a waiting room until host starts.
- Deterministic fan‑out: all clients join the same GameRoom `roomId`.
- Keep Colyseus idioms: schema‑driven sync, thin messages, server authority.
- Minimal client churn: gate Start in UI; room swaps handled by the provider.

## Topology

- Built‑in `LobbyRoom` (Colyseus): used only for room discovery/listing.
  - `gameServer.define('lobby', LobbyRoom)`.
- `GameRoom` (existing): authoritative gameplay + waiting UI (player list, host badge, start).

## Routes (Clear Split)

- `/lobby/[gameId]`
  - Client: connect to built‑in `'lobby'` with a filter for your room (`{ name: 'game', metadata: { gameId } }`).
  - UI: shows “Waiting for host…” until a matching GameRoom is listed; once listed, join by `roomId` and render WaitingRoom from GameRoom state.

- `/game/[gameId]`
  - Host path: on “Launch Game”, create the room via `joinOrCreate('game', { gameId, gameSetup, role, name, isHuman:true })` and render WaitingRoom inside GameRoom.
  - Guest path: if not connected yet, reuse the lobby listing flow to discover and `joinById` the GameRoom.

## Server Setup (Built‑in LobbyRoom)

Expose the lobby room and enable realtime listing on your game room:

```ts
// server/index.ts
import { LobbyRoom, updateLobby } from 'colyseus';

gameServer.define('lobby', LobbyRoom);

gameServer
  .define('game', GameRoom)
  .enableRealtimeListing();

// In GameRoom.onCreate(): set metadata used by the lobby filter
this.setMetadata({ gameId });

// Whenever you change metadata later, call updateLobby(this)
// await this.setMetadata(newMeta).then(() => updateLobby(this));
```

## Client (Built‑in Lobby Listing)

Listen to lobby updates and join when your room appears:

```ts
import { Client, RoomAvailable } from 'colyseus.js';

const client = new Client(process.env.NEXT_PUBLIC_COLYSEUS_URL!);

// Filter by game room name and metadata gameId
const lobby = await client.joinOrCreate('lobby', {
  filter: {
    name: 'game',
    metadata: { gameId },
  },
});

let allRooms: RoomAvailable[] = [];

lobby.onMessage('rooms', (rooms) => {
  allRooms = rooms;
  const match = rooms.find(r => r.metadata?.gameId === gameId);
  if (match) client.joinById(match.roomId, { name, role, isHuman: true });
});

lobby.onMessage('+', ([roomId, room]) => {
  const i = allRooms.findIndex((r) => r.roomId === roomId);
  if (i !== -1) allRooms[i] = room; else allRooms.push(room);
  if (room.metadata?.gameId === gameId) client.joinById(room.roomId, { name, role, isHuman: true });
});

lobby.onMessage('-', (roomId) => {
  allRooms = allRooms.filter((r) => r.roomId !== roomId);
});
```

You can also change filters dynamically by sending a `filter` message to the lobby room.

## Messages

- Lobby messages (built‑in)
  - `rooms`, `+`, `-` — listing lifecycle.
  - `filter` — change active filter (name/metadata).
- Game messages (existing)
  - `players_init`, `start_game`, `submit_action`, `round_result`, `action_options`, `game_ended`.

## Lifecycle & Flow

1) Host creates GameRoom
- Host clicks “Launch Game” on `/lobby/[gameId]` or `/game/[gameId]`.
- Provider calls `joinOrCreate('game', { gameId, gameSetup, role, name, isHuman:true })`.
- GameRoom sets metadata `{ gameId }` and appears in the lobby listing automatically.

2) Guests wait on lobby listing
- Guest opens `/lobby/[gameId]`.
- Provider connects to `'lobby'` with `filter: { name: 'game', metadata: { gameId } }`.
- When the matching room appears, provider `joinById(roomId, { name, role, isHuman:true })`.

3) WaitingRoom inside GameRoom
- Player list/host badge render from GameRoom schema.
- Start button is visible only to host (`gameState.hostId === mySessionId`).

4) Start game (server authoritative)
- Host presses Start → send `start_game` to GameRoom.
- Server runs the start handler, broadcasts initial `round_result/current_event`, then `action_options`.

## Client Changes (Provider & UI)

- Provider gains two small helpers:
  - `connectToLobby({ gameId, role, name, gameSetup? })`
  - `connectToGameById(gameRoomId, opts)`
- WaitingRoom reads from lobby schema via provider/ Zustand (no duplicate state):
  - `hostId`, `players[]` come from LobbyRoom schema.
  - Start button shown only when `mySessionId === hostId`.
- On `game_started`, call `joinById` with the provided `gameRoomId` and leave the lobby.

### SSR / Routing Rules

- `/lobby/[gameId]`
  - Always SSR lobby snapshot.
  - If lobby does not exist, create on host path; for guests, show a “Waiting for host” state.

- `/game/[gameId]`
  - SSR game resolve:
    - If `{ started: true, gameRoomId }` → hydrate + connect directly to GameRoom.
    - Else → 302 redirect to `/lobby/[gameId]`.

## GameRoom (MVP adjustments)

- Accept `{ gameId, role, name }` on `onJoin` (no tokens required for MVP).
- Optional (post‑MVP): tokens like Warden Dilemma for explicit seat claims.

## Why this fixes current issues

- No split rooms: the **server** creates the GameRoom once and hands out its `roomId`.
- Guest/host visibility: everyone waits in **one** LobbyRoom (`filterBy(['gameId'])`).
- Start fan‑out: a single `game_started` message coordinates the room swap.

## Logging & Observability

- LobbyRoom:
  - `Lobby created` { gameId }
  - `Assigned hostId` { sessionId }
  - `Player joined lobby` { sessionId, name }
  - `Starting game` { gameId }
  - `GameRoom created` { gameRoomId }
  - `Broadcast game_started` { gameRoomId, clientCount }
- Client:
  - `lobby: connected` { filteredBy: gameId }
  - `lobby: discovered` { roomId }
  - `game: joined` { roomId, sessionId }

## Rollout Plan (MVP)

1. Server
   - Add `LobbyRoom.ts` with schema and handlers above; register as `'lobby'` in `server/index.ts`.
   - Add `GET /lobby/:gameId/snapshot`; optional `GET /games/:gameId/resolve`.
2. Hooks
   - Add `useLobbyListing()` that joins `'lobby'` with `filter` and joins GameRoom on discovery.
   - Keep Provider transport‑only; gameplay handlers live in listeners.
3. UI
   - Add/adjust `app/lobby/[gameId]/page.tsx` to use listing flow.
   - WaitingRoom stays tied to GameRoom state; host start gating unchanged.
4. Replace lobby path
   - Share/QR URLs point to `/lobby/[gameId]`. Guests never call `joinOrCreate('game')`.
5. Manual E2E
   - Host + guest across two browsers; confirm both see names in lobby and both transition to game after start.

## Frontend Migration (Delta vs Current Code)

This section captures the exact FE changes to align the codebase with the lobby→game design. It complements `colyseus-migration-tasks.md` and focuses on the delta from the current repo.

- Routes
  - Add `app/lobby/[gameId]/page.tsx` (SSR snapshot → hydrate → connect to `'lobby'`).
  - Update `app/game/[gameId]/page.tsx` to redirect to `/lobby/[gameId]` when phase=`lobby`; remove “auto‑connect to fetch roles”.
  - Share/QR links should point to `/lobby/${gameId}` (not `/game`).

- Provider
  - Add `connectToLobby({ gameId, role, name, gameSetup? })` and `connectToGameById(gameRoomId, opts)`; perform room swap on `'game_started'`.
  - Remove client‑side round advance from context (server is authoritative); keep `start_game` sender for host.
  - Handle `'players_init'` by writing to `lobbyStore.availableRoles` only (single source of truth).

- Services
  - Add `joinLobbyRoom(...)` and `joinGameById(...)` helpers to `services/colyseusClient.ts`.
  - Deprecate generic `joinGameRoom()` usage from lobby path; provider owns all joins.

- Stores
  - `lobbyStore.availableRoles` is the only place FE holds role availability; remove provider‑local copies.
  - Gate host UI with `gameState.hostId` + `sessionStore.colyseusSessionId` (no extra flags).

- Components / Hooks
  - WaitingRoom: show Start only when `hostId === mySessionId`; non‑hosts see a waiting banner.
  - RoleSelector: consume `lobbyStore.availableRoles` and disable roles with `isTaken`.
  - `useGameActionsColyseus`: do not call `advance_round`; submitting actions is the only client step.

- Cleanup (call out by path)
  - Remove “Auto‑connecting to fetch available roles…” effect from `app/game/[gameId]/page.tsx`.
  - Replace any lobby‑time `joinOrCreate('game')` with lobby connect and server‑broadcasted `gameRoomId`.
  - Ensure `providers/ColyseusProvider.tsx` writes available roles only to `lobbyStore`.

- Logging
  - Keep one‑liners to `/api/logs` for: lobby connect, `players_init` applied, host `start_game`, received `game_started`, game connect, received `action_options`.

### Acceptance (FE slice)
- Navigating to `/lobby/:gameId` shows all waiting clients and host badge.
- Only host sees Start; pressing it transitions all clients to `/game/:gameId` via `'game_started'`.
- No auto‑connect or `joinOrCreate('game')` remains in lobby flow; roles freeze dynamically via WS.

## Post‑MVP Hardening

- Join tokens (like Warden Dilemma) issued by lobby; GameRoom validates.
- Redis Presence (multi‑instance) for LobbyRoom + GameRoom.
- Persistence of lobby/game sessions.
- Rejoin flow: allow client to rejoin proper room on refresh via token.

## Acceptance Criteria

- Two browsers join same `gameId` lobby; both see matching GameRoom when created.
- Only host sees Start; guest sees "Waiting for host" until room appears.
- Host creates and starts; both clients join the same GameRoom and see gameplay state.
- No duplicate game rooms created; guests never `joinOrCreate('game')`.

## References

- Colyseus Built‑in LobbyRoom: https://docs.colyseus.io/room/built-in/lobby
- Source code reference: LobbyRoom, messages (`rooms`, `+`, `-`), and `filter` usage.

---

## Task Breakdown (MVP Implementation)

Server
- Register built‑in lobby: `gameServer.define('lobby', LobbyRoom)`.
- Ensure `game` has `.enableRealtimeListing()` and sets metadata `{ gameId }` on create; call `updateLobby(this)` when metadata changes.
- Keep existing `/games/:gameId/snapshot` for SSR of live game (optional).
- Logging: add structured logs for lobby listing and game discovery (room listed / delisted).

Client (Hook + Provider)
- Add `useLobbyListing()` helper that joins `'lobby'` with `filter` and joins GameRoom on discovery.
- Keep host gating in Zustand (`gameState.hostId` + `sessionStore.colyseusSessionId`).

UI
- Create/adjust `app/lobby/[gameId]/page.tsx` to mount the listing flow and show WaitingRoom after joining GameRoom.
- Navigation:
  - Host: “Launch Game” → create `game` and push(`/game/[gameId]`).
  - Guests: deep link to `/lobby/[gameId]` (not `/game`).

GameRoom (MVP)
- Accept `{ gameId, role, name }` on join; tokens optional for MVP.
- No changes to round logic; only entry moves from lobby signal.

Routes/SSR
- `/lobby/[gameId]`: no SSR snapshot needed; client connects to listing and waits for discovery.
- `/game/[gameId]`: optional SSR of live game snapshot; if not connected, either redirect to `/lobby/[gameId]` or run listing flow client‑side.

---

## Cleanup & Final Checklist

Remove dead/duplicated paths
- Replace all lobby‑time `joinOrCreate('game', …)` calls with lobby flow (server creates game; clients `joinById`).
- Delete client auto‑advance and duplicate round triggers (server authoritative).
- Consolidate roster broadcast: only `GameRoom.broadcastAvailableRoles()` (built by adapters); handlers delegate.
- Remove provider‑local `availableRoles` state; use Zustand `lobbyStore.availableRoles` only.
- Mark legacy Session/SSE APIs as deprecated (then delete once Colyseus flow is stable):
  - `app/api/session/[[...parts]]/route.ts`, `server/api/session-router.ts`, `server/stores/sessionStore.*`, `hooks/useGameActions.ts`.

Observability
- Ensure colored pretty logs locally (`LOG_PRETTY=true`), JSON to file when needed (`LOG_TO_FILE=true`).
- Verify logs on key edges: host assign, lobby listing connect/filter, room listed/discovered, client `joinById`.

Host gating & UX
- Start button visible only when `hostId === mySessionId` (Zustand).
- Server safety‑check remains: deny `start_game` from non‑host.
- Guests show “Waiting for host…” message; auto‑transition after discovery and join.

Race & split‑room prevention
- Only the host creates the GameRoom; guests never call `joinOrCreate('game')`.
- Metadata filter `{ gameId }` avoids joining the wrong room.

SSR & routing
- `/lobby/[gameId]` does not require SSR data; page mounts listing and waits.
- `/game/[gameId]` may SSR a live snapshot; otherwise client connects as usual.

Reconnection (MVP scope)
- Keep `allowReconnection` in GameRoom for short windows.
- Optionally keep LobbyRoom active for a brief period after `game_started` to aid late redirects.

Acceptance (tick before ship)
- [ ] Two browsers join same lobby and see each other (names/roles).
- [ ] Only host sees Start; guest sees waiting banner until discovery.
- [ ] Host creates and starts → both clients join the same GameRoom; phase transitions visible on both.
- [ ] No additional GameRoom instances created for a single start.
- [ ] Guests never `joinOrCreate('game')`; provider uses listing + `joinById`.
- [ ] Logs are readable and labeled; lobby listing events visible.

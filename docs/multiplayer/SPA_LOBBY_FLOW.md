# Multiplayer Lobby — Recommended SPA Flow (Colyseus)

This document describes the simplified, “SPA-style” lobby flow we now use for multiplayer. It matches the working UX from the Warden demo while staying idiomatic to our codebase and avoiding the pitfalls we hit earlier with split socket ownership.

## Why This Approach

- Single connection owner: `ColyseusProvider` owns the Room for both host and guests, so all listeners and Zustand projections are centralized.
- Simple UX: everyone starts at the Lobby page; host clicks Create Game; guests enter a 6‑char code and click Join; roles are chosen after joining, inside the Waiting Room.
- Less moving parts: we do not rely on the built‑in `LobbyRoom` for listing/discovery right now. This removes timing/race issues we had earlier.

## Server Requirements (Kept As-Is)

- Define the game room and set metadata for filtering and visibility.
  - `server/index.ts:70`: `gameServer.define('lobby', LobbyRoom);` (kept for future use; not required by current flow)
  - `server/index.ts:72`: `gameServer.define('game', GameRoom).enableRealtimeListing().filterBy(['gameId']);`
  - `server/rooms/GameRoom.ts:86`: `this.setMetadata({ gameId });` — the room code is stored in `state.roomCode` and exposed via metadata.
- CORS for matchmaker (already implemented): `server/index.ts:62`.
- Optional snapshot route for SSR/admin is available: `server/index.ts:83`.

## Client Architecture

- `ColyseusProvider` (single owner)
  - Creates and owns the Colyseus `Room` connection (`connect()`), attaches listeners, and projects room state + messages into Zustand.
  - Stores reconnection token in `localStorage` for potential reconnect.
  - File: `providers/ColyseusProvider.tsx:120` (sync + connect flow)

- Room listeners → store projection
  - File: `providers/colyseusRoomListeners.ts:42` — translates server messages and schema changes into `useGameStore`, `useActionStore`, and `useLobbyStore`.

## UX Flow

### Host (Create Game)

1. User visits `/lobby`.
2. Clicks “Create Game” (no role yet; roles are chosen after join).
3. Client calls `connect({ name: 'Host', role: '', isHuman: true })`.
4. Server creates (or reuses) `GameRoom`, assigns a 6‑char `roomCode`, and syncs it via schema.
5. Client routes to `/game/:roomCode` on successful connection.
6. Waiting Room shows the share link using `/game/:roomCode`. Start Game button is host‑only.

### Guest (Join by Code)

1. User visits `/lobby`.
2. Types name + room code and clicks “Join”.
3. Client calls `connect({ name, role: '', isHuman: true, gameId: code })`.
4. On success, navigates to `/game/:roomCode`.
5. Guest selects a role inside `/game/:roomCode` during lobby phase. SeatRegistry prevents duplicates.

## Role Selection Inside The Room

- Roles are chosen after joining, not on the lobby page.
- Client sends `set_role` via `useGameSenders()`; server enforces exclusivity using `SeatRegistry`.
  - File: `hooks/useGameSenders.ts:6` — `setRole(role, name)` → `room.send('set_role', { role, name })`
  - File: `server/rooms/services/SeatRegistry.ts:1` — in‑memory seat ownership
  - File: `server/rooms/handlers/PlayerManagementHandler.ts:63` — role claim, rebroadcast roster

## Starting The Game (Host Only)

- Host clicks Start in the Waiting Room, which sends `start_game`.
- Server transitions from `lobby` to `action`, generates the initial scenario, and locks the room.
  - File: `hooks/useGameSenders.ts:9` — `startGame()` → `room.send('start_game')`
  - File: `server/rooms/handlers/GameStartHandler.ts:39` — start flow, AI seeding, round announce, `lock()`

## Differences vs. Built‑in LobbyRoom Listing

- Official LobbyRoom (docs) lists `GameRoom`s and emits `rooms`, `+`, and `-` events with optional filters (`name` + `metadata`).
- Our simplified flow skips listing entirely for now and joins the `GameRoom` directly by `gameId` (the room code). This avoids the previous “split socket owner” issue.

### If/When We Reintroduce Listing

1. Keep listing within the provider lifespan (single owner):
   - Join `lobby` with filter `{ name: 'game', metadata: { gameId } }`.
   - On discovery, `joinById(roomId)` and immediately “adopt” that Room into the provider (or create an `adopt(room)` API in the provider).
2. Keep server config the same: `enableRealtimeListing()`, `filterBy(['gameId'])`, and `setMetadata({ gameId })`.

## Code References

- SPA lobby entry + routing
  - `app/lobby/page.tsx:1` — Join by code and Create Game buttons. On connect, route to `/game/:code`.
  - `components/RouteOrchestrator.tsx:1` — no redirect back to `/lobby` during lobby phase.
  - `components/game/WaitingRoom.tsx:20` — share link now points to `/game/:code`.

- Provider + listeners
  - `providers/ColyseusProvider.tsx:120` — connect flow, state projection, listeners.
  - `providers/colyseusRoomListeners.ts:42` — message handlers → Zustand.

- Server
  - `server/index.ts:70` — `define('lobby', LobbyRoom)` (kept, optional).
  - `server/index.ts:72` — `define('game', GameRoom).enableRealtimeListing().filterBy(['gameId'])`.
  - `server/rooms/GameRoom.ts:86` — `setMetadata({ gameId })` and schema `state.roomCode`.

## Configuration

- Environment: set `NEXT_PUBLIC_COLYSEUS_URL` to the WebSocket endpoint (required).
- CORS: already handled for matchmaker and WS in `server/index.ts:62`.

## QA Checklist

1. Start Colyseus server with a console visible.
2. Host on `/lobby` → Create Game → observe `/game/ABC123` route.
3. Guest on another browser → `/lobby` → Join with `ABC123`.
4. Both see Waiting Room; roles can be selected; SeatRegistry prevents duplicates.
5. Host clicks Start → both transition to Action phase; action options arrive.

## Common Gotchas

- Don’t create a second Room outside the provider; listeners and store projection won’t run.
- Ensure `NEXT_PUBLIC_COLYSEUS_URL` matches the server and is reachable from both host and guest.
- In dev, React StrictMode may double‑invoke effects; guard with refs where necessary.

## Future Enhancements (Optional)

- Auto‑reconnect: provider can attempt `client.reconnect()` on load if a token exists.
- Tokenized seats/experimenter role (Warden style) if we need stricter auth.
- Reintroduce LobbyRoom listing with a provider‑managed “adopt” flow.


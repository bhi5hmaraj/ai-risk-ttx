# Warden Alignment TODOs (MVP)

Owner: Multiplayer
Status: Tracking
Updated: 2025-11-30

Purpose: Track deltas between our implementation and the Warden Dilemma pattern, and close the gap with small, auditable changes.

## 1) AI players should not appear in Lobby — DONE

- Today: `GameRoom.onCreate` seeds AI via `buildPlayersFromSetup` → lobby shows AI.
- Warden-style: Seed AI on `start` only; lobby displays humans only.
- Fix:
  - Move `buildPlayersFromSetup` and `stateManager.setCorePlayers` from `GameRoom.onCreate` into `GameStartHandler.handleStartGame`.
  - In lobby, broadcast roles from the scenario only (no Core players). Use adapters-only projection: `buildRolesInitPayloadFromStakeholders(schema, setup.stakeholders)`.
  - Ensure Schema `players` contains only connected humans before start.

Acceptance
- Fresh lobby shows zero or one human (host) and no AI.
- After `start_game`, roster includes AI and action flow begins.

## 2) Lock room on start — DONE

- Intent: Prevent late joins once game starts (Warden locks on start).
- Fix:
  - In `GameStartHandler.handleStartGame`, after initial broadcast and action options, call `this.room.lock()` (wire room ref via handler deps or a small method).
  - Optionally unlock on end (`this.room.unlock()`) if spectating post-game is desired.

Acceptance
- Attempting to `joinById` after start returns room locked.

## 3) Seat / Role protection (MVP)

- Intent: A role maps to exactly one seat; re-joins reattach instead of creating duplicates.
- Fix:
  - Add a seat map in `StateManager` (e.g., `roleName → sessionId`).
  - On `set_role`, if role is taken by another session, reject unless sessionId matches (reattach).
  - Optional: generate lightweight `joinToken` per seat and validate on join.

Acceptance
- Duplicate `set_role` for a taken role is denied (unless it’s the same session reattaching).
- Re-join (allowReconnection window) preserves the same seat.

## 4) Host accidental “guest mode” on /lobby/:id

- Today: If host visits `/lobby/:id` before creating a room, they’ll attach to Lobby listing like a guest.
- Options:
  - UX: Funnel host through a “Create/Launch Game” entry that creates the room first.
  - Or: add `?mode=host` to `/lobby/:id` that creates/joins the GameRoom immediately for the host, while guests still list.

Acceptance
- Host flow consistently creates/joins GameRoom before listing; guests only list.

---

## Implementation Notes

- Central schema/types only: use adapters and `server/types/core.ts` — do not hand-roll types in listeners or helpers.
- Discovery dedupe: `useLobbyListing` has `startedRef/joiningRef/joinedRef` and a single `joinOnce()` used by both `rooms` and `+`.
- Navigation: server phase drives UI; avoid client “intent” redirects.

## Instrumentation
- Start handler logs a roster summary after start:
  - `total`, `humans`, `ai`, `roles` list.
- Add a small test under `tests/adapters.buildRosterFromStakeholders.test.ts` verifying roster fill semantics.

## Cross-refs

- docs/multiplayer/LOBBY_ROOM_DESIGN.md (Built-in LobbyRoom usage)
- providers/colyseusRoomListeners.ts (event→store projection)
- server/rooms/adapters/stateAdapter.ts (projection helpers)

# Postmortem: Multiplayer Lobby + State Desync (Nov 27–30, 2025)

Owner: Multiplayer team
Status: Completed – incident mitigated and root causes fixed
Severity: Sev-2 (core gameplay unreliable for some sessions)

## Summary
Between Nov 27–30, 2025, we struggled to get basic multiplayer flows reliably working. Symptoms included:
- Guests not seeing hosts (and vice‑versa)
- Duplicate player entries
- “Preparing your role…” stalls
- Start not advancing for all clients
- Action Points (AP) seemingly “shared” between different humans
- Debrief running multiple times (once per client) instead of once for the room

The core of the issue was architectural drift: we mixed server‑authoritative logic with client‑side inference and created rooms without consistent matchmaker filters. This allowed two different GameRoom instances with the same code, split socket ownership, and timing races that left clients desynchronized.

## Timeline (UTC)
- Nov 27: Migrated to Colyseus + added built‑in LobbyRoom listing utility; Provider introduced but guests connected outside Provider.
- Nov 28: Reports of desync (host/guest don’t see each other). Logger route noisy; StrictMode double‑invokes effects.
- Nov 29: Switched to SPA flow (direct GameRoom by code). Host still created room without gameId; guest with gameId spawned a separate room.
- Nov 30 AM: Fixed host creation to pass gameId; consolidated Provider ownership; seeded state early; added MapSchema listeners; AP check by session; humans‑only allSubmitted; Start preflight; improved logs.
- Nov 30 PM: Stabilized flow; remaining UI polish and charter documented. Postmortem written.

## What Happened
1) Two rooms for one code
- Host created GameRoom with no `gameId`; guest joined with `gameId`.
- With `filterBy(['gameId'])`, matchmaker didn’t find the host’s room and spawned another room with the same code. Host saw host-only world; guest saw guest-only world.

2) Split socket ownership
- Guests sometimes joined Rooms bypassing the Provider, so UI listeners and store projection didn’t run for that socket.

3) Client-side inference and races
- “Preparing your role…” appeared because the client rendered a loading overlay before initial state arrived; missing re-broadcast led to an empty role list.
- We inferred readiness client-side (AI done, human submitted), which raced with real state and produced mismatches.

4) Incorrect checks
- AP validation used the first human in the roster, not the current session’s player.
- allSubmitted() counted AI players, blocking advancement when only humans mattered.

5) Logging and visibility gaps
- Logger transport crashed in dev (/api/logs workers), losing crucial early signals.
- Depth limits hid useful context ([MAX_DEPTH_REACHED]).

6) Double join
- Dev StrictMode + page auto-connect + manual Join triggered duplicate connect calls.

## Impact
- Unreliable multiplayer experience; confusing UI; inability to complete rounds; wasted LLM cycles; engineering time consumed debugging state mirages.

## Root Causes
- Architectural inconsistency: client computed logic vs server authority.
- Missing invariant: “one room per gameId” at creation.
- Provider not the single socket owner.
- Insufficient lifecycle listeners (no MapSchema hooks for players) and missing initial seeding.
- Overly optimistic client assumptions (AP/human detection, readiness, debrief per tab).

## Contributing Factors
- StrictMode double invocation in dev without guards.
- Logger worker transport instability and shallow truncation.
- Ambiguous UI props (e.g., `isConnecting || !isConnected`).
- Weak preflight on Start (allowing partial human roster).

## What We Fixed
- Matchmaking & creation
  - Host Create Game now generates a 6‑char room code and passes `gameId` at creation; guest with the same code lands in the same room.
- Provider ownership
  - One socket owner; guards against double connect; auto-connect runs once; RoleSelector no longer reconnects.
  - Seed `room.state` immediately; attach MapSchema onAdd/onRemove/onChange for players.
- Server logic correctness
  - Start preflight: all connected humans must select a role; logs who’s pending.
  - `allSubmitted()` counts only connected humans.
  - AP validation per session (use your sessionId’s player), not “first human”.
  - Host assigned only when `isHost=true` (or legacy `gameSetup`).
- UI & messaging
  - Waiting Room shows humans ready X/Y, HOST badge, role pending chips.
  - Round snapshot “waiting” now includes humans and AIs (not just AIs).
- Logging
  - Dev logger uses stream (no worker crash); increased depth/array/key limits; added seats snapshot and preflight logs.

## What Went Well
- Clear server logs made the split-room bug obvious once we looked (two roomIds for same code).
- Colyseus Monitor remains invaluable for verifying presence.
- Centralizing listeners in the Provider simplified store projection.

## What Went Wrong
- We attempted to reuse built‑in LobbyRoom flow without Provider adoption, causing shadow sockets.
- We allowed room creation without `gameId`, breaking matchmaker invariants.
- We pushed “readiness” and AP checks into the client, which diverged.
- Missing initial state seeding caused UI stalls.

## Action Items

Backend (Colyseus)
- [ ] Add `waiting_status` server message; broadcast on join/leave/set_role/submit and round start.
- [ ] Generate debrief once at END; store in room; broadcast `debrief_ready`; expose `getDebrief()` for late joiners.
- [ ] Enforce “one room per gameId” at creation (query + refuse duplicate) as a belt‑and‑suspenders check.
- [ ] Unit tests: role claim → start → options → submit → advance → END → debrief_ready.
- [ ] Add Prometheus/health metrics for rooms, clients, round time, LLM latency.

Frontend
- [ ] Replace client‑inferred waiting UI with `waiting_status` payload.
- [ ] EndScreen to consume `debrief_ready` broadcast (remove per‑client POSTs).
- [ ] Dev‑only HUD (sessionId, roomId, code, hostId, humans ready X/Y) to speed up local triage.

Ops / Tooling
- [ ] Document “SPA flow + gameId at creation” invariant in README and in the new charter.
- [ ] Keep logger depth tunables in `.env.example` (LOG_MAX_DEPTH, LOG_MAX_ARRAY_ITEMS, etc.).

Process
- [ ] Enforce the “Client-as-a-Dumb-Terminal” charter in code reviews.
- [ ] Add a checklist to PR template: server messages, Provider listeners, no client inference.

## Five Whys (primary incident)
1. Why did host not see guest? Because host and guest were in different rooms.
2. Why different rooms? Host created room without `gameId`; guest joined with `gameId`; matchmaker created a second room.
3. Why did host create room without `gameId`? We didn’t pass `gameId` on host creation.
4. Why didn’t we enforce this invariant? We lacked a server check and the client flow assumed listing discovery.
5. Why was it hard to diagnose? Split socket ownership and shallow logs masked the real cause.

## References
- docs/architecture/CLIENT_DUMB_TERMINAL_CHARTER.md
- server/index.ts (filterBy + metadata)
- server/rooms/GameRoom.ts (host assignment)
- server/rooms/schema/GameState.ts (allSubmitted humans‑only)
- providers/ColyseusProvider.tsx (connect guards + seeding + listeners)
- components/game/WaitingRoom.tsx, RoundSnapshotCard.tsx (readiness UI)

---
This postmortem captures the key failures and our path forward. We commit to server‑authoritative design and thin clients per the charter. Future changes will adhere to that standard.


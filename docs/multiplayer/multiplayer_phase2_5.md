# Simulacra Multiplayer Architecture & State Design — Phase 2.5

Status: Draft
Owner: Platform / Multiplayer
Date: 2025‑11‑29

## Phase Alignment
- Relation to Phase 2 (Server‑Driven Colyseus + SSR Snapshot)
  - Adopts Phase 2 invariants: server‑authoritative loop, Colyseus for live sync, snapshot for SSR only.
  - Clarifies adapters (core↔schema↔client view) and hydration order (WS wins over SSR).
- Relation to Phase 3 (Event Spine, Mail, Replay)
  - Defines how Postgres events coexist with live Core state without joining the live loop.
  - Specifies where mail “tails” live (Schema) vs full threads (DB via Next API).
- Why 2.5 exists
  - Establish a single “state truth” doc to prevent drift between FE/BE and to guide new features without breaking invariants.

<!-- REVIEW: This doc is the authoritative state/flow reference between Phase 2 and Phase 3. Keep it current when adding schema fields or DB events. -->

---

## 1. Objectives
We want a multiplayer, AI‑assisted game engine that is:

- Server‑authoritative: clients only send intents; server decides outcomes.
- State‑coherent: exactly one “God state”; all other states are projections.
- Resilient: reconnects, slow networks, and crashes don’t corrupt state.
- Extensible: can add AI agents, in‑game mail, replay without rewriting core.

This doc defines how state flows between:
- Core game engine (StateManager + GameController)
- Colyseus schema (transport state)
- Browser (Zustand) (UI projection)
- Next.js backend (SSR, LLM helpers, APIs)
- Postgres (events, replay, analytics, mail threads)

---

## 2. High‑Level Components

### 2.1 Core Game Engine (“God State”)
- Types: `CoreGameState`, `CorePlayer`, `GameLogEntry`, `GameEvent`, etc.
- Owner: `StateManager` (one per room), `GameController` + `sessionEngine.applyConsequences`.
- Responsibilities: authoritative state (phase/round/coreMetric/eventLog/currentEvent/full players) and game rules (action resolution, AI turns, score, end conditions).
> Invariant 1: All meaningful game state mutations go through Core (`StateManager`) and domain logic (`GameController`/`sessionEngine`).

### 2.2 Transport State (Colyseus Schema)
- Types: `schema/GameState`, `schema/Player` (`@colyseus/schema`).
- Responsibilities: minimal normalized state for WS sync: `phase`, `round`, `maxRounds`, `publicScore`, `coreMetricName`, `roomCode`, `MapSchema<Player>` (id/name/role/isHuman/connected/AP/hasSubmitted). Future: `deadlineAt`, small `recentMail[]`.
> Schema is a projection of Core for the network, not the God state.
- Adapters: `coreToSchema`, `corePlayerToSchema`; optional `schemaToCore` for seeding.
> Invariant 2: Update `room.state` only via adapters after Core changes.

### 2.3 Client Projection (Zustand Store)
- Types: `ServerGameView` (what React reads), `GameStore` (server slice + ui slice).
- Responsibilities: single source of truth for React. Writes come from network layers (ColyseusProvider/SSR).
- Key fns: `hydrateFromSnapshot`, `updateFromWs`, `reset`; adapter `colyseusSchemaToView`.
> Invariant 3: React reads from Zustand; network layers hydrate/write the `server` slice.

### 2.4 Next.js Backend
- Responsibilities: SSR/HTML, LLM helper APIs (custom scenario builder), read‑heavy APIs (mail threads/events/admin).
- Not responsible for round advancement or room state mutation.
> Invariant 4: Live game control is Colyseus‑only. Next observes and renders.

### 2.5 Postgres (Event Store + Metadata)
- Responsibilities: durable event log per game (round start/result, actions, mail, system), replay, analytics/admin, mail threads.
- Pattern: append‑only `game_events` table; snapshots optional.
> Invariant 5: Postgres is not part of the live loop; it’s for history and replay.

<!-- REVIEW: Phase 3 will expand events/mail; for MVP keep round events only; mail minimal or deferred. -->

---

## 3. Flow of State

### 3.1 Core → Schema → Browser
1) Client sends intents (`submit_action`).
2) Handler validates/authorizes and calls domain.
3) GameController computes next state (AI/counterfactual/consequences).
4) StateManager sets Core state/players.
5) Adapters project Core → Schema.
6) Colyseus patches broadcast.
7) Provider calls `updateFromWs(schema)` → Zustand → React.

### 3.2 SSR / Snapshot
- Next server calls `GET /games/:id/snapshot` on Colyseus Express for SSR bootstrap.
- Browser `hydrateFromSnapshot()` then connects to WS.
- First WS update wins (expected newer).
- No in‑session snapshot fetches; reconnect handles runtime gaps.

### 3.3 Reconnection
- Server: `allowReconnection(client, N)`; keep Core/Schema in memory.
- Client: `client.reconnect(token)` or `joinOrCreate` if token missing; receives full Schema; Provider updates Zustand.

---

## 4. LLM / Agents

### 4.1 Design‑time (Next)
- Custom scenario builder, CopilotKit flows; validated with Zod; returns `GameSetup` to seed rooms.

### 4.2 Runtime (Colyseus)
- `GameController` uses LLM facade/Agents tools server‑side to compute AI turns and consequences; updates Core; adapters project to Schema.

---

## 5. Mail & Event Bus (Phase 3 Preview)
- `game_events` table (id, game_id, seq, type, payload, created_at).
- Live mail: append `mail.sent` event, optionally push bounded `recentMail` to Schema for badges; full threads via Next Postgres APIs.

---

## 6. Naming & Type Conventions
- Core: `CoreGameState`, `CorePlayer`.
- Schema: `SchemaGameState`, `SchemaPlayer`.
- Client: `ServerGameView`.
- DB: `DbGameEvent`, `DbScenario`.

---

## 7. Design Invariants (Summary)
1) God State = Core in `StateManager`.
2) Schema = projection of Core (adapters only). 
3) Zustand = projection of Schema (and SSR snapshot at boot).
4) Next does SSR/APIs; no live control.
5) Postgres = durable history; not in live loop.
6) Browser never polls Next for live state; only Colyseus WS.

---

## 8. Implementation Checklist
1) Add/modify Core fields first.
2) Decide if clients need live access; if so, add minimal Schema/View fields and update adapters.
3) Persist as events if replay/analytics needed.
4) Do not write Schema directly from handlers; always via adapters after Core.
5) Do not mutate Core from React; send intents to server.

---

## Phase Dependencies & Roll‑up
- Depends on Phase 2:
  - Server‑driven Colyseus loop; ACTION timer + NoOp; `filterBy(['gameId'])`; SSR snapshot route on Colyseus.
- Enables Phase 3:
  - Event spine (round + mail), replay, analytics, optional Agents mail tools.
- Out of scope in 2.5:
  - Redis Presence (multi‑instance); advanced mail/read‑state; replay UI.

<!-- REVIEW: Keep this doc in lockstep with eagx/multiplayer_phase2.md (transport rules) and eagx/multiplayer_phase3.md (events/mail). When changing adapters or adding Schema tails, update both Phase docs and this 2.5. -->

# Simulacra Multiplayer Mail & Events Architecture

## 1. Overview

This document specifies the design for a **server‑authoritative multiplayer architecture** for Simulacra, with a focus on:

* A generic **event spine** (Postgres events table)
* A **mail / messaging system** used by both humans and AI agents
* How this integrates with **Colyseus** state sync and the core game loop
* Reconnect, replay, and future extensibility (other tools, not just mail)

The doc is self‑contained and assumes:

* Node.js + TypeScript
* Colyseus for realtime multiplayer
* Postgres for durable storage
* OpenAI Agents SDK for AI orchestration (final implementation)
<!-- REVIEW: Consider phrasing this as "Agents SDK (pluggable)". Keep an interface boundary so we can swap providers (or mock) without rewriting MailService/GameController. -->

---

## 2. Core Principles

1. **Server authoritative**

   * The server is the single source of truth for game state and events.
   * Clients send **intents** only; they never directly mutate game state.

2. **Colyseus for live state, Postgres for history**

   * Colyseus Schema state is a **compact, live snapshot + small tails**.
* All durable history (round results, mail, AI actions, etc.) goes into a Postgres **events table**.
<!-- REVIEW: Good split. Add one guardrail: never write "business truth" to Schema-only fields. Anything needed for replay/debug must hit events (or snapshots). -->

3. **One generic event spine, many views**

   * Every interesting change is an event: `round_started`, `mail_sent`, `action_submitted`, `round_resolved`.
* Higher‑level APIs (mail threads, timelines, analytics) are **queries over events**, not separate stores.
<!-- REVIEW: +1. Add a note to predefine a small enum for event_type and validate payloads with Zod at the edge to avoid schema drift. -->

4. **Same infra for humans and AIs**

   * Human clients and AI agents both use the same `MailService` / `EventBus` APIs.
   * The system doesn’t care if an event originator is a human or an agent.

5. **Minimal state in Colyseus**

   * Only what is needed for real‑time UX lives in the room Schema.
* Large logs, full mail history, and analytics live in Postgres and are accessed via HTTP/API.
<!-- REVIEW: Ensure we cap any tails kept in Schema (e.g., recentMail length N) and avoid unbounded growth. -->

6. **Recoverable and replayable**

   * A game can be reconstructed from Postgres events (plus optional snapshots).
   * This supports replays, retrospectives, and debugging.

---

## 3. Domain Concepts

### 3.1 Game

* Identified by a stable `game_id` (same as `roomCode` / URL slug).
* One **Colyseus Room** per game.
* One in‑memory **StateManager** per room for the core game state.
* One logical **event stream** in Postgres: `game_events` filtered by `game_id`.
<!-- REVIEW: Consider a per-game monotonic sequence (event_id_by_game) for simpler pagination and gap detection, in addition to global id. Index `(game_id, id)` is a must. -->

### 3.2 Player / Actor

* Player has a stable `player_id` (not the Colyseus `sessionId`).
* `actor_id` in events is typically `player:{playerId}` or `ai:{roleName}`.
* `target_ids` for events (esp. mail) are lists of actor IDs.

### 3.3 Event

* Immutable record of "something that happened" in the game.
* All events share a common envelope:

```ts
interface GameEventRow {
  id: number;             // bigserial
  created_at: Date;
  game_id: string;        // ABC123
  actor_id: string;       // "player:123" | "ai:TechCEO" | "system"
  event_type: string;     // "mail_sent", "round_started", ...
  // REVIEW: Prefer a constrained set (enum/text CHECK) and validate on insert. Typos here make queries brittle. 
  target_ids: string[];   // recipients / affected actors
  payload: any;           // jsonb
}
<!-- REVIEW: Add NOT NULL defaults for arrays (target_ids := '{}'::text[]). Consider a unique de-dup key (e.g., client_generated_id) to achieve at-least-once -> exactly-once on retries. -->
```

### 3.4 Mail

Mail is **not** a separate system; it’s a specialization of events with `event_type = 'mail_sent'` and a structured payload.

Minimal payload shape:

```ts
interface MailPayload {
  subject: string;
  body: string;
  // REVIEW: Define max lengths and sanitize HTML/markdown. Persist original + sanitized? Avoid XSS when rendering. 
  thread_id: string;        // stable conversation id
  message_id: string;       // unique per message
  in_reply_to?: string;     // parent message_id
  to: string[];             // actor ids
  cc?: string[];
  bcc?: string[];
}
<!-- REVIEW: Add a UNIQUE index on (game_id, payload->>'message_id') to dedup. Also persist a compact search vector later if we need full-text. -->
```

### 3.5 Game State

Logical game state (for the game loop) is held in a **Core GameState** (your existing `GameState` type). It includes:

* phase, round, core metric
* event log (for gameplay, not necessarily full history)
* current crisis event
* per‑player state (action points, hidden scores, etc.)

The **Colyseus Schema GameState** is a **projection** of Core GameState that is suitable for live sync:

* room code
* phase (as string)
* round
* public score / core metric name
* minimal player info (name, role, isHuman, AP, hasSubmitted)
* optional short tails: last N events, last N mails, deadlines
<!-- REVIEW: Keep "optional short tails" strictly bounded and prunable to avoid memory bloat under long sessions. -->

---

## 4. High‑Level Architecture

### 4.1 Components

1. **Colyseus GameRoom**

   * Network transport + authoritative state sync.
   * Owns a `SchemaGameState` instance.
   * Delegates business logic to services.

2. **StateManager (Core State)**

   * In‑memory core game state for the room.
   * Knows about full `GameState` and `Player` objects.
   * API: `getCoreState()`, `setCoreState()`, `getCorePlayers()`, `updateCorePlayer()`, etc.

3. **GameController**

   * Orchestrates **round advancement**.
   * Talks to LLM / Agents (via `LLMService` or Agents SDK).
   * Applies consequences and returns updated core state.

4. **EventStore / EventBus**

   * Wraps Postgres `game_events` table.
   * API for appending events and running queries.

5. **MailService** (built on EventStore)

   * API for sending mail and querying mail threads/history.
   * Used by:

     * Colyseus handlers (for human mail sends)
     * Agents tools (for AI mail sends)

6. **HTTP API Layer**

   * Exposes higher‑level read APIs:

     * `/games/:gameId/mail/threads`
     * `/games/:gameId/mail/threads/:threadId`
   * (Optional) `/games/:gameId/snapshot`
<!-- REVIEW: Align with Phase 2: Snapshot is SSR-only (no browser gap repair). Make sure we don’t duplicate logic; Room.getSnapshot should be a thin read over StateManager + EventStore. -->
   * Runs in the same process as Colyseus or in a sibling process using `remoteRoomCall` to talk to rooms.

7. **OpenAI Agents / LLM Layer**

   * Agents that represent AI players or system agents.
   * Are given tools that map onto the same MailService / EventStore APIs.

---

## 5. Data Model (Postgres)

### 5.1 Core Events Table

```sql
CREATE TABLE game_events (
  id          BIGSERIAL PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),

  game_id     text NOT NULL,
  actor_id    text NOT NULL,          -- sender / actor
  event_type  text NOT NULL,
  target_ids  text[] NOT NULL,

  payload     jsonb NOT NULL
);

CREATE INDEX game_events_game_id_created_at
  ON game_events (game_id, created_at);

CREATE INDEX game_events_type_created
  ON game_events (game_id, event_type, created_at);
-- Recommended: pagination by (game_id, id) and optional thread index for hot threads
CREATE INDEX game_events_game_id_id ON game_events (game_id, id);
-- CREATE INDEX game_events_game_thread ON game_events (game_id, (payload->>'thread_id'));
```

### 5.2 Mail View (Convenience)

```sql
CREATE VIEW game_mail AS
  SELECT
    id,
    created_at,
    game_id,
    actor_id AS sender_id,
    target_ids,
    payload->>'thread_id'   AS thread_id,
    payload->>'message_id'  AS message_id,
    payload->>'in_reply_to' AS in_reply_to,
    payload->>'subject'     AS subject,
    payload->>'body'        AS body
  FROM game_events
  WHERE event_type = 'mail_sent';
```

This keeps Postgres aware of mail semantics without duplicating data.

### 5.3 Optional: Mail Read State

For cross‑device unread tracking:

```sql
CREATE TABLE mail_read_state (
  game_id     text NOT NULL,
  actor_id    text NOT NULL,
  last_read_event_id bigint NOT NULL,

  PRIMARY KEY (game_id, actor_id)
);
```

On mark‑as‑read, update `last_read_event_id`. Unread counts are computed as:

```sql
SELECT COUNT(*)
FROM game_mail
WHERE game_id = $1
  AND (sender_id = ANY($2) OR $2 = ANY(target_ids))
  AND id > $3; -- last_read_event_id
-- REVIEW: This treats "read" as a simple high-water mark per actor. OK for MVP, but per-thread read pointers give better UX. Maybe add optional per-thread row later. 
```

You can cache unread counts in Colyseus Schema for real‑time rendering.

### 5.4 Optional: Game Snapshots

To avoid replaying very long streams, you may add:

```sql
CREATE TABLE game_snapshots (
  game_id      text PRIMARY KEY,
  snapshot_at  timestamptz NOT NULL,
  state_version bigint NOT NULL,
  core_state   jsonb NOT NULL
);
-- REVIEW: Consider storing (last_event_id) to avoid scanning by created_at on resume. Ensure snapshot size stays reasonable. 
```

`core_state` holds the serialized Core GameState. On room creation/restart you can:

* Load snapshot
* Replay events with `id > last_snapshot_event_id` to bring state up to date

Snapshots can be produced on a schedule or every N events.

---

## 6. Colyseus Schema State

### 6.1 Schema Structures

We use Colyseus Schema as a **minimal, network‑friendly projection** of the richer Core GameState. The goal is to keep it small and focused on what the client needs live, while richer history (mail, events, analytics) stays in Postgres.

Current Colyseus structures, extended with mail‑related and timing fields:

```ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string;
  @type("boolean") connected: boolean = true;

  // Player identity
  @type("string") name: string = "";
  @type("string") role: string = "";
  @type("boolean") isHuman: boolean = true;

  // Per‑round game state
  @type("number") actionPoints: number = 3;
  @type("boolean") hasSubmitted: boolean = false;

  constructor(sessionId: string, options?: {
    name?: string;
    role?: string;
    isHuman?: boolean;
  }) {
    super();
    this.sessionId = sessionId;
    this.name = options?.name || `Player-${sessionId.slice(0, 4)}`;
    this.role = options?.role || "";
    this.isHuman = options?.isHuman ?? true;
  }
}

// Tail of recent mail events, for live UX only (full history is in Postgres)
export class RecentMail extends Schema {
  @type("string") id: string;          // event id as string (e.g. "evt:123")
  @type("string") threadId: string;    // logical conversation id
  @type("string") senderId: string;    // actor id (e.g. "player:123", "ai:TechCEO")
  @type(["string"]) recipients = new ArraySchema<string>();
  @type("string") subject: string;
  @type("number") createdAt: number;   // epoch ms
}
// REVIEW: Consider adding a small "visibility" bitmask or recipients array to enable client-side filtering if we keep recentMail shared. Alternatively, rely on per-client views in the future.

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();

  // Game flow
  @type("string") phase: string = "lobby"; // lobby | action | consequence | end
  @type("number") round: number = 0;
  @type("number") maxRounds: number = 5;

  // Metrics
  @type("number") publicScore: number = 75;
  @type("string") coreMetricName: string = "Democratic Legitimacy";
  // Keep Schema minimal. Any growth multiplies patch sizes. Avoid historical arrays beyond small, bounded tails.

  // Room info / routing
  @type("string") roomCode: string = ""; // stable gameId / URL slug

  // Live mail tail + deadlines (not full history)
  @type([ RecentMail ]) recentMail = new ArraySchema<RecentMail>();
  @type("number") deadlineAt: number = 0; // epoch ms when current ACTION phase expires

  createPlayer(sessionId: string, options?: {
    name?: string;
    role?: string;
    isHuman?: boolean;
  }) {
    const player = new Player(sessionId, options);
    this.players.set(sessionId, player);
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }

  // Reset per‑round submissions (server‑driven round loop)
  resetSubmissions() {
    this.players.forEach((player) => {
      player.hasSubmitted = false;
      player.actionPoints = 3; // kept in sync with GAME_CONFIG.ACTION_POINTS_PER_ROUND
    });
  }

  // Check if all connected players have submitted
  allSubmitted(): boolean {
    const activePlayers = Array.from(this.players.values()).filter(p => p.connected);
    if (activePlayers.length === 0) return false;
    return activePlayers.every(p => p.hasSubmitted);
  }
}
```

Key points:

* We reuse the existing `Player` and `GameState` shapes and **only add**:

  * `RecentMail` schema and `recentMail: ArraySchema<RecentMail>` tail on `GameState`.
  * `deadlineAt` to represent the current ACTION‑phase deadline (epoch ms).
* `maxRounds` is explicitly part of Schema so the client can render progress.
* Full mail and event history is **not** stored here; it lives in Postgres and is accessed via HTTP or tools.

### 6.2 State Projections

Core ↔ Schema mapping stays the same high‑level idea, but projections now also:

* Set `maxRounds` from Core/StateManager configuration.
* Update `deadlineAt` whenever the server schedules or updates an ACTION‑phase timeout.
* Maintain `recentMail` as a tail of the last N mail events, trimming older entries.

Projections:

* **Core → Schema** (`coreToSchema(core, schema)`):

  * Map phase enum → phase string.
  * Copy `round`, `maxRounds`, `coreMetric.name` → `coreMetricName`, `coreMetric.value` → `publicScore`.
  * Update `deadlineAt` and rebuild `recentMail` from the most recent mail events (or keep it incrementally in room logic).

* **Schema → Core** (`schemaToCore(schema, { eventLog, currentEvent })`):

  * Used only when reconstructing Core GameState (e.g. after restart) and you have additional inputs (event log, current event) from Postgres.
  * `recentMail` is treated as an optimization hint for UI; Core GameState relies on the full events stream instead.

Mail sync rule:

* When a new `mail_sent` event is appended via `MailService`, the room logic also pushes a `RecentMail` entry into `state.recentMail` and trims the array to a fixed size (N=10–20). This keeps WS payloads small while Postgres remains the source of truth for history. Monitor patch sizes and reject changes that remove pruning or increase tails without bounds.

Use an adapter to project Core GameState → Schema and back where needed:

* `coreToSchema(core, schema)` updates phase, round, score, etc.
* `schemaToCore(schema, { eventLog, currentEvent })` reconstructs a minimal Core state from Schema when needed (e.g. new process).

Mail sync:

* When a new mail is appended to Postgres, the room also:

  * pushes a `RecentMailSchema` entry into `state.recentMail`,
  * trims the array if > N.

---

## 7. Services & APIs

### 7.1 EventStore Service

TypeScript interface:

```ts
interface EventStore {
  appendEvent(input: {
    gameId: string;
    actorId: string;
    eventType: string;
    targetIds: string[];
    payload: any;
  }): Promise<{ id: number; createdAt: Date }>;

  listEventsByGame(gameId: string, options?: {
    sinceId?: number;
    limit?: number;
    eventType?: string;
  }): Promise<GameEventRow[]>;
  // Contract: results are ordered ASC by id (or seq) for deterministic pagination; default a safe limit.

  listMailThreadsForParticipant(gameId: string, actorId: string): Promise<MailThreadSummary[]>;

  getMailThread(gameId: string, threadId: string): Promise<MailThread>;
}
```

`listMailThreadsForParticipant` and `getMailThread` are essentially wrappers over SQL queries on `game_mail`.

### 7.2 MailService

Builds on `EventStore` for a clean abstraction.

```ts
interface SendMailInput {
  gameId: string;
  from: string;       // actorId
  to: string[];
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
}

interface MailService {
  sendMail(input: SendMailInput): Promise<{ eventId: number; messageId: string; threadId: string }>;

  listThreadsForActor(gameId: string, actorId: string): Promise<MailThreadSummary[]>;

  getThread(gameId: string, threadId: string): Promise<MailThread>;

  markThreadRead(gameId: string, actorId: string, threadId: string): Promise<void>;
}
<!-- REVIEW: Consider idempotent send (client-supplied messageId) and rate limits per actor to avoid spam/DoS. -->
```

`sendMail` implementation:

1. Resolve `threadId`:

   * New thread: generate `th_<uuid>`.
   * Reply: reuse provided `threadId` or infer from `inReplyTo` via `game_mail`.
2. Generate `messageId` (`msg_<uuid>`).
3. Build `MailPayload` and call `EventStore.appendEvent` with `event_type = 'mail_sent'`.
4. Only after a successful durable append, update `state.recentMail` in the room (publish‑after‑commit) and broadcast lightweight events if needed.
5. Optionally update unread counts in `mail_read_state` and Schema.
   - Ensure steps 3–5 are ordered so WS updates never precede durable append.

### 7.3 HTTP API Endpoints

Suggested endpoints:

* `GET /games/:gameId/mail/threads?actorId=player:123`

  * Returns list of threads where `actorId` is sender or recipient.

* `GET /games/:gameId/mail/threads/:threadId`

  * Returns full ordered message list.

* (SSR-only) `GET /games/:gameId/snapshot`

  * Returns current Core GameState snapshot plus some recent events for SSR / spectators.

Auth & Visibility
- Derive `actorId` from the authenticated session on the server; do not trust querystring for authorization.
- Enforce per‑recipient visibility in thread reads.

These endpoints are used by:

* Frontend for mail UI (thread list + thread view)
* SSR for initial render of `/game/[gameId]`
* Admin tools / retrospectives
<!-- REVIEW: Add authn/authz notes. ActorId must be derived from session, not trusted from querystring. Enforce per-actor visibility on server. -->

---

## 8. Colyseus Room Integration

### 8.1 GameRoom responsibilities

* Maintain `GameStateSchema` instance for live sync.
* Own a `StateManager` instance for Core GameState.
* Use `GameController` to advance rounds.
* Use `MailService` for mail events.
* Expose Colyseus message handlers as **thin shells** around services.

### 8.2 Example: Human Sends Mail

1. Client sends Colyseus message:

```ts
room.send("send_mail", {
  to: ["player:Journalist"],
  subject: "Clarify the polling numbers",
  body: "...",
  threadId: "th_123" // optional
});
```

2. Room handler:

```ts
this.onMessage("send_mail", async (client, msg) => {
  const actorId = this.playerManagement.getActorIdForSession(client.sessionId);
  const { to, subject, body, threadId } = msg;
  // REVIEW: Validate with Zod (lengths, recipients exist, subject/body not empty). Consider stripping HTML here.

  const result = await this.mailService.sendMail({
    gameId: this.state.roomCode,
    from: actorId,
    to,
    subject,
    body,
    threadId,
  });

  // Optionally broadcast a lightweight event to clients
  this.broadcast("mail_sent", {
    threadId: result.threadId,
    messageId: result.messageId,
    from: actorId,
    to,
    subject,
  });
});
// REVIEW: Broadcasting a lightweight event is fine, but Schema recentMail should be the primary source for UI to avoid double sources of truth. Keep the event optional.
```

3. `MailService.sendMail` appends to Postgres and updates `state.recentMail`.
4. All connected clients receive updated Schema (with `recentMail` patched) + `mail_sent` discrete event.

### 8.3 Example: AI Agent Sends Mail

AI agents don’t talk to Colyseus directly; they call a tool that hits the same MailService.

* The tool implementation calls the **HTTP API** or a direct service if running in the same process.
* Colyseus room observes the new mail via direct `MailService` call (if in-process) and updates Schema.
* From the client perspective, AI mail and human mail are indistinguishable.

---

## 9. OpenAI Agents & Tooling

### 9.1 Agent Tool: send_mail

Define an Agents tool that surfaces `MailService.sendMail`:

* **Name**: `send_mail`
* **Params**:

  * `to`: string[] (actor IDs)
  * `subject`: string
  * `body`: string
  * `threadId?`: string

The implementation behind the tool:

* Validates `gameId` and the calling agent’s role.
* Delegates to `MailService.sendMail`.
* Returns a summary (threadId, messageId, timestamp).

### 9.2 Agent Tool: list_threads / get_thread

Expose read tools:

* `list_threads_for_actor(actorId)`
* `get_thread(threadId)`

Agents can use these to:

* Recall past communication
* Decide who to contact next
* Maintain continuity across rounds

### 9.3 Heartbeat / Orchestration

For proactive actions (not just responses to human requests):

* A "heartbeat" orchestrator loop (timer or event‑driven) can:

  * Call Agents SDK with context (current game state + recent events)
  * Ask: "Do you want to take any actions or send mail?"
  * If agent chooses to send mail, it calls `send_mail` tool.

The heartbeat loop does **not** bypass the MailService; all mail still flows through the same infra.

---

## 10. Flows & Edge Cases

### 10.1 Player Rejoin (Normal)

1. Player reconnects via Colyseus (`allowReconnection`).
2. Colyseus sends full `GameStateSchema` snapshot:

   * phase, round, publicScore, coreMetricName
   * players
   * `recentMail` tail
3. On UI mount, client optionally calls HTTP:

   * `GET /games/:gameId/mail/threads?actorId=player:123` to populate mailbox list
   * `GET /games/:gameId/mail/threads/:threadId` as user opens a thread

### 10.2 Server Restart / Room Resurrection

1. New `GameRoom` is created for `gameId`.
2. On `onCreate`:

   * Load last snapshot from `game_snapshots` (if used) or a minimal initial state.
   * Optionally replay events from `game_events` (ordered by `(game_id, id)` or per‑game `seq`) to bring `StateManager` up to date.
<!-- REVIEW: Define a cutoff strategy (snapshot interval or max replay window) to bound startup time. Long replays can block the room. -->
3. Project Core GameState → Schema.
4. Clients rejoin and get consistent state.
5. Mail history is unaffected; it’s entirely in Postgres.

### 10.3 Very Long Mail History

* Schema only stores `recentMail` (last N messages).
* Older messages are fetched on demand via HTTP.
* Thread queries use `game_mail` view and pagination, e.g. `?before=<eventId>&limit=50`.

### 10.4 Multi‑Device Read State

* Each device uses `markThreadRead` or similar endpoint.
* `MailService` updates `mail_read_state`.
* Unread counts are recomputed or incrementally updated and reflected in Schema.

### 10.5 Privacy / Visibility

* You can apply **per‑client filters** when rendering mail in the UI:

  * Clients only show messages where `actorId` is sender or in `target_ids`.
* Prefer HTTP for full threads with server‑side auth/visibility; keep `recentMail` non‑sensitive or per‑recipient only for MVP. Add StateView later if needed.

---

## 11. Optional Snapshot Endpoint

A `/snapshot` HTTP endpoint is **optional** but useful:

* `GET /games/:gameId/snapshot`

  * Returns a JSON snapshot of Core GameState plus recent events.
  * Used for SSR initial render of `/game/[gameId]` and admin tools.

Suggested response shape:

```ts
interface GameSnapshot {
  gameId: string;
  stateVersion: number;
  phase: string;
  round: number;
  coreMetric: { name: string; value: number; description: string };
  players: Array<{
    id: string;
    name: string;
    role: string;
    isHuman: boolean;
  }>;
  recentEvents: Array<{ id: number; type: string; createdAt: string; payload: any }>;
  recentMail: MailThreadSummary[];
  deadlineAt?: number;
}
```

Implementation:

* Colyseus Room exposes `getSnapshot()` method that reads from `StateManager` and EventStore.
* Express route calls `remoteRoomCall` to fetch snapshot.
<!-- REVIEW: Align shape with Phase 2 doc (include deadlineAt, optional stateVersion, recent tails). Avoid duplicating logic across docs. -->

If you choose to skip this for MVP, the rest of the design still holds; SSR will simply render a skeleton and hydrate once WS connects.

---

## 12. Future Extensions

1. **Generalized actions / tools**

   * Mail is one instance of the event spine.
   * Other events/actions (buffs, public statements, leaks, market shocks) can reuse the same infra with new `event_type` + payload shapes.

2. **Analytics & retrospectives**

   * Build high‑level views entirely from `game_events`:

     * Timeline view (all event types)
     * Per‑role dashboard (what did this actor do when?)
     * AI vs Human comparison (how often did AI initiate communication?)

3. **Full replay**

   * Reconstruct game state at any event id:

     * Start from snapshot
     * Apply events up to `N`
   * Use this for replay UI and debugging.

4. **Moderation / red team tools**

   * Use same events table to flag suspect events or unusual mail patterns.

---

## 13. Implementation Checklist

**Phase 1 – Foundations**

* [ ] Implement Postgres `game_events` table.
* [ ] Implement `EventStore.appendEvent` and basic queries.
* [ ] Implement `MailService` on top of EventStore.
* [ ] Wire `MailService.sendMail` into GameRoom via a `send_mail` Colyseus message.
* [ ] Add `recentMail` and `deadlineAt` to `GameStateSchema`.
<!-- REVIEW: Before adding more fields to Schema, measure patch sizes under load (N games x M players). Keep tails tiny (e.g., 10–20). -->

**Phase 2 – Frontend Mail UI**

* [ ] Add mailbox UI: thread list, thread view, compose/reply.
* [ ] Hook up Colyseus `mail_sent` events and `recentMail` to update UI.
* [ ] Implement HTTP endpoints for listing threads and fetching thread history.

**Phase 3 – AI Integration**

* [ ] Define Agents tools: `send_mail`, `list_threads_for_actor`, `get_thread`.
* [ ] Give each AI role a dedicated agent with access to these tools.
* [ ] Implement heartbeat loop that periodically prompts agents and lets them choose actions (including mail).

**Phase 4 – Persistence & Replay**

* [ ] Add `game_snapshots` table (optional).
* [ ] Implement snapshotting in a background job or on interval.
* [ ] Implement replay util for debugging and retrospective views.

This design keeps Colyseus focused on **live state**, Postgres on **durable history**, and Mail as just one first‑class citizen in a generic, future‑proof event architecture.

---

## 14. MVP Cut (Dec 12) — Scope, Sequence, and Gates

Objective: Ship a reliable, server‑driven multiplayer loop by Dec 12. Keep mail/event‑spine minimal and defer agents/advanced UX.

### In‑Scope (must ship)
- Server‑driven loop
  - Auto‑advance on all submitted (remove client `advance_round`).
  - ACTION timer via `room.clock`; on timeout, mark NoOp and advance.
  - Phases are string enums end‑to‑end (avoid schema encode errors).
- Identity & join
  - `filterBy(['gameId'])`; join via `joinOrCreate('game', { gameId })`.
  - Seat reconnection via `allowReconnection` + `reconnectionToken`.
- SSR bootstrap
  - `GET /games/:gameId/snapshot` (SSR only). No browser gap‑repair; rely on Colyseus reconnect.
- Event spine (minimal)
  - Append `round_started` / `round_result` only (validated with Zod).
  - DB indexes: `(game_id, id)`, `(game_id, event_type, created_at)`.
- Observability
  - Structured logs with roomId/sessionId and key timers; error path logs.

### Nice‑to‑Have (time‑permitting)
- Minimal mail slice
  - `send_mail` with subject/body only (no CC/BCC, no read‑state).
  - Keep `recentMail` tail in Schema, bounded (10–20); full threads via HTTP.
- Admin endpoints (protected)
  - Force end / force advance for onsite debugging.

### Out‑of‑Scope (post‑event)
- Agents using mail tools; heartbeat orchestration.
- Mail read‑state, CC/BCC, rich formatting.
- Replay/retrospectives UI; analytics dashboards.
- Public lobby browsing; spectator mode; host migration.

### Sequence (fastest to confidence)
1) Phase‑2 hardening (2–4 days)
   - Auto‑advance; ACTION timer + NoOp; `filterBy(['gameId'])`; SSR snapshot.
2) Event spine foundations (1–2 days)
   - Table + Zod edge validation; indexes; append round events.
3) Optional minimal mail (2–3 days)
   - `send_mail` → append event → update bounded `recentMail`; one inbox view.
4) Ops guardrails (1 day)
   - Patch size check; DB connection pooling; error budgets.

### Acceptance Criteria (Go/No‑Go)
- Reconnect reliably restores seat and full state (manual test + logs).
- No client `advance_round`; server transitions phases; timers fire; NoOp applied.
- SSR `/game/[gameId]` renders promptly; hydration favors WS state if newer.
- DB writes p95 < 10ms; no unbounded Schema growth; patch sizes stable under N players.

### Risks & Mitigations
- Consistency: WS updates before durable append.
  - Mitigate with publish‑after‑commit (broadcast/patch after successful DB write) or single‑process ordering.
- Schema bloat: tails accumulate.
  - Bound tails (10–20); prune aggressively; measure patch sizes.
- Data drift: event_type typos / payload drift.
  - Zod validation at insert; constrain `event_type` to enum; add tests.
- Auth/visibility: trusting query params for actorId.
  - Derive actor from session; enforce visibility in server queries.

### Guardrails
- Keep Colyseus Schema minimal; prefer HTTP for heavy history.
- Avoid duplicating logic across rooms and HTTP; Room.getSnapshot is a thin read.
- Defer agents and rich mail to post‑event; focus on reliability first.

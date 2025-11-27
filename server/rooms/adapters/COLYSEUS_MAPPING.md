# Mapping Our Architecture to Colyseus State System

## Colyseus State Synchronization Model

Reference:
- https://docs.colyseus.io/state - Server-side state definition
- https://docs.colyseus.io/state/view - Client-side state consumption

### How Colyseus Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (Room)                                │
│                                                                 │
│  class GameRoom extends Room<GameState> {                      │
│    onCreate() {                                                 │
│      this.setState(new GameState());  ← Single source of truth │
│    }                                                            │
│                                                                 │
│    onMessage("action", (client, data) => {                     │
│      this.state.someField = newValue;  ← Mutation triggers    │
│    })                                         patch generation  │
│  }                                                              │
│                                                                 │
│  class GameState extends Schema {                              │
│    @type("string") phase;  ← Decorated fields auto-sync       │
│    @type("number") round;                                      │
│    @type({ map: Player }) players;                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ WebSocket (binary patches)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT                                        │
│                                                                 │
│  room.state.onChan

ge((state) => {                        │
│    // Entire state tree changed                                │
│  });                                                            │
│                                                                 │
│  room.state.players.onAdd((player, key) => {                  │
│    // New player joined                                        │
│  });                                                            │
│                                                                 │
│  room.state.listen("round", (newValue, oldValue) => {         │
│    // Specific field changed                                   │
│  });                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points**:
1. **Schema is the Network Contract** - Only `@type` decorated fields sync
2. **Mutations = Patches** - When you change `this.state.x = y`, Colyseus generates a binary patch
3. **Automatic Diffing** - Clients only receive what changed (bandwidth efficient)
4. **Observable** - Clients get fine-grained change callbacks

## Our Architecture: Why We Need More

### Problem: Schema ≠ Business Logic

Colyseus Schema is optimized for:
- ✅ Network efficiency (minimal bandwidth)
- ✅ Client rendering (only what UI needs)
- ✅ Fast synchronization

But our business logic needs:
- ❌ Full event history (`eventLog[]`)
- ❌ Rich role objects (objectives, constraints)
- ❌ Submitted actions for LLM context
- ❌ Previous round data for analysis

**If we put everything in Schema**:
- Clients download full game history (wasteful)
- Network traffic grows with every round
- Clients see hidden AI objectives (security issue)
- Schema becomes bloated

### Solution: Colyseus Schema + In-Memory State

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER (Our Architecture)                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Colyseus Schema (Network Layer)                        │  │
│  │  • this.state.phase = "action"  ← Clients see this     │  │
│  │  • this.state.round = 2                                 │  │
│  │  • this.state.publicScore = 75                          │  │
│  │  • this.state.players.get("p1").actionPoints = 3        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ▲                                    │
│                           │ coreToSchema()                     │
│                           │ (projection)                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  StateManager (In-Memory, NOT synchronized)             │  │
│  │  • Full Core GameState                                  │  │
│  │    - eventLog: GameLogEntry[]  ← Never sent to clients │  │
│  │    - currentEvent: { ... }                              │  │
│  │  • Full Core Players                                    │  │
│  │    - role.hiddenObjective  ← Secret!                    │  │
│  │    - actions: ActionOption[]  ← Full action history    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  GameController (Business Logic)                        │  │
│  │  • Works with Core types (not Schema)                   │  │
│  │  • Calls LLM services                                   │  │
│  │  • Returns updated Core state                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Concrete Mapping

### 1. Colyseus State Definition (Server)

**What Colyseus Recommends**:
```typescript
class GameState extends Schema {
  @type("string") phase;
  @type("number") round;
  @type({ map: Player }) players;
}
```

**What We Do**:
```typescript
// server/rooms/schema/GameState.ts
class GameState extends Schema {
  @type("string") phase;         // ← Synchronized
  @type("number") round;          // ← Synchronized
  @type("number") publicScore;    // ← Synchronized
  @type({ map: Player }) players; // ← Synchronized

  // NO: eventLog, currentEvent, etc. (not in Schema!)
}

// server/rooms/adapters/stateManager.ts
class StateManager {
  private coreState: CoreGameState;  // ← eventLog lives here!
  private corePlayers: Map<...>;     // ← full roles live here!
}
```

### 2. State Mutation (Server)

**What Colyseus Recommends**:
```typescript
onMessage("advance_round", () => {
  this.state.round += 1;  // ← Direct mutation, auto-syncs
});
```

**What We Do**:
```typescript
onMessage("advance_round", async () => {
  // 1. Read: Schema → Core (with enrichment)
  const coreState = schemaToCore(this.state, {
    eventLog: this.stateManager.getCoreState().eventLog,
    currentEvent: this.stateManager.getCoreState().currentEvent,
  });

  // 2. Business Logic: Core → Core
  const { newState } = await this.gameController.advanceRound(coreState, ...);

  // 3. Write: Core → StateManager (persist full state)
  this.stateManager.setCoreState(newState);

  // 4. Write: Core → Schema (project for network)
  coreToSchema(newState, this.state);  // ← this.state mutations trigger sync
});
```

**Why the complexity?**
- GameController needs full history (eventLog)
- Schema only syncs current game state
- StateManager bridges the gap

### 3. Client State Consumption

**What Colyseus Recommends**:
```typescript
room.state.onChange(() => {
  console.log("State changed:", room.state.phase, room.state.round);
});
```

**What We Do (with Zustand)**:
```typescript
// Client-side Zustand store
const useGameStore = create((set, get) => ({
  // Local state
  selectedActions: [],
  timeRemaining: 300,

  // Colyseus state (reactive)
  colyseusState: null,

  // Connect to Colyseus
  connectToRoom: async (roomCode) => {
    const room = await client.joinById(roomCode);

    // Wire up Colyseus state to Zustand
    room.state.onChange(() => {
      set({ colyseusState: room.state });
    });

    room.state.listen("round", (newRound) => {
      set({ timeRemaining: 300 }); // Reset timer on new round
    });
  },

  // Derived state (from Colyseus)
  get humanPlayer() {
    const state = get().colyseusState;
    return state?.players.get(room.sessionId);
  },

  // Actions (send to server)
  submitAction: (actionId, cost) => {
    room.send("submit_action", { actionId, cost });
  },
}));
```

**Data Flow**:
1. Server mutates `this.state.round = 2`
2. Colyseus sends binary patch to client
3. `room.state.onChange()` fires
4. Zustand updates `colyseusState`
5. React components re-render (watching Zustand)

### 4. Observables and Listeners

**Colyseus Provides**:
```typescript
// Global state change
room.state.onChange((state) => { ... });

// Specific field
room.state.listen("round", (newValue, oldValue) => { ... });

// Map/Array changes
room.state.players.onAdd((player, key) => { ... });
room.state.players.onRemove((player, key) => { ... });
room.state.players.onChange((player, key) => { ... });
```

**How We Use It**:
```typescript
// In Zustand setup
room.state.onChange(() => {
  // Full state sync (lazy approach - fine for our game size)
  set({ colyseusState: room.state });
});

// Alternative: Fine-grained (more efficient)
room.state.listen("round", (newRound) => {
  set(state => ({ ...state, round: newRound }));
});

room.state.players.onAdd((player, sessionId) => {
  console.log(`${player.name} joined`);
});
```

## Key Architectural Decisions

### Decision 1: Schema is Minimal

**Why**:
- Bandwidth efficiency (important for 20+ concurrent games)
- Security (hide AI objectives, hidden scores)
- Simplicity (clients only need rendering data)

**Trade-off**:
- Server needs dual state (Schema + Core)
- Adapter layer complexity

### Decision 2: StateManager Holds Full State

**Why**:
- GameController needs full history for LLM context
- Can't reconstruct eventLog from Schema
- Allows complex business logic without bloating network

**Trade-off**:
- In-memory state (lost on server restart - ok for demo, needs persistence for production)
- Must keep StateManager ↔ Schema synchronized

### Decision 3: Adapters, Not Lenses

**Why**:
- Colyseus Schema mutation-based (not lens-compatible)
- Information loss (Core → Schema) makes true lenses impossible
- TypeScript lens libraries add complexity

**Trade-off**:
- Manual synchronization (mitigated by contract tests)
- Not mathematically proven (lenses have laws)

### Decision 4: Contract Tests Enforce Sync

**Why**:
- Catches adapter drift at test time
- Property-based tests cover edge cases
- Documents expected behavior

**Trade-off**:
- Not compile-time safe (types can't catch logic errors)
- Must remember to run tests

## Comparison to Pure Colyseus Approach

### Pure Colyseus (Simple)
```typescript
class GameState extends Schema {
  @type("string") phase;
  @type("number") round;
  @type([EventLogEntry]) eventLog;  // ← Syncs ALL history!
  @type({ map: Player }) players;
}

onMessage("advance_round", () => {
  this.state.round += 1;
  this.state.eventLog.push(new EventLogEntry(...));  // ← Network overhead!
});
```

**Pros**: Simple, no adapters
**Cons**: Sends full history to all clients, bandwidth grows unbounded

### Our Approach (Hybrid)
```typescript
// Schema: Minimal
class GameState extends Schema {
  @type("string") phase;
  @type("number") round;
  // NO eventLog!
}

// StateManager: Full
class StateManager {
  coreState: { eventLog: [...] }  // ← In-memory only
}
```

**Pros**: Efficient network, rich server logic
**Cons**: Adapter complexity, dual state

## AI Agent Flow: How AI Players Interact with State

### AI Agents as "Virtual Clients"

AI players are **server-side only** - they don't connect via WebSocket. Instead, they access state directly during game logic:

```
┌──────────────────────────────────────────────────────────────────┐
│                    SERVER (GameRoom)                              │
│                                                                  │
│  Human Player Action:                                            │
│  ┌──────────────┐                                               │
│  │ Client sends │ → onMessage("submit_action")                  │
│  │ via WS       │    │                                           │
│  └──────────────┘    ▼                                           │
│                  this.state.players.get(id).hasSubmitted = true  │
│                                                                  │
│  AI Player Action (during advance_round):                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Convert Schema → Core                                 │   │
│  │    const coreState = schemaToCore(this.state, {...})     │   │
│  │    const corePlayers = schemaPlayersToCore(...)          │   │
│  │                                                           │   │
│  │ 2. Call GameController with Core state                   │   │
│  │    const { newState, newPlayers } =                      │   │
│  │      await gameController.advanceRound(                  │   │
│  │        coreState,                                        │   │
│  │        corePlayers  ← includes AI players                │   │
│  │      )                                                    │   │
│  │                                                           │   │
│  │ 3. GameController internally:                            │   │
│  │    - Identifies AI players (isHuman === false)           │   │
│  │    - Calls LLM service for each AI:                      │   │
│  │      generateAITurn(aiPlayer, coreState, history)        │   │
│  │      → Returns { options, chosenActions }                │   │
│  │    - Updates Core state with AI actions                  │   │
│  │    - Generates consequences with LLM                     │   │
│  │                                                           │   │
│  │ 4. Project Core → Schema                                 │   │
│  │    coreToSchema(newState, this.state)                    │   │
│  │    aiPlayers.forEach(p =>                                │   │
│  │      corePlayerToSchema(p, this.state.players.get(p.id)) │   │
│  │    )                                                      │   │
│  │                                                           │   │
│  │ 5. Colyseus auto-syncs to all clients                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Why AI Agents Need Full Core State

```typescript
// AI LLM service needs:
interface AITurnContext {
  gameState: CoreGameState;  // Includes:
    // - eventLog: history of all rounds
    // - currentEvent: ongoing crisis
    // - coreMetric: current public score

  player: CorePlayer;  // Includes:
    // - role.hiddenObjective: AI's secret goal
    // - role.publicObjective: AI's stated goal
    // - hiddenScore: progress toward secret goal
    // - actions: past actions taken

  previousActions: PlayerRoundActions[];  // What other players did
}

// This data is NOT in Colyseus Schema (too much to sync)
// So we maintain it in StateManager and enrich during conversion
```

### Example: AI Turn Generation During Round Advancement

```typescript
// GameRoom.ts - advance_round handler
onMessage("advance_round", async (client, data) => {
  // 1. Enrich Schema with full state from StateManager
  const coreState = this.stateManager.getCoreState();
  const corePlayers = this.stateManager.getCorePlayers();

  // 2. GameController processes AI turns
  const { newState, newPlayers } = await this.gameController.advanceRound(
    this.roomId,
    coreState,      // ← Has full eventLog
    corePlayers,    // ← Has full role objects with hidden objectives
    humanOptions    // ← Human player's available actions
  );

  // Inside GameController:
  // const aiPlayers = players.filter(p => !p.isHuman);
  // const aiTurns = await Promise.all(
  //   aiPlayers.map(ai => llmService.generateAITurn(
  //     ai,               // ← Has role.hiddenObjective
  //     coreState,        // ← Has eventLog for context
  //     previousActions   // ← From eventLog
  //   ))
  // );

  // 3. StateManager persists updated Core state (including AI actions)
  this.stateManager.setCoreState(newState);
  this.stateManager.setCorePlayers(newPlayers);

  // 4. Project essential fields to Schema (triggers client sync)
  coreToSchema(newState, this.state);
  newPlayers.forEach(p => {
    const schemaPlayer = this.state.players.get(p.id);
    if (schemaPlayer) corePlayerToSchema(p, schemaPlayer);
  });

  // 5. Clients receive update via WebSocket (Colyseus automatic)
  //    - Humans see: round incremented, AI players' AP changed, phase updated
  //    - Humans DON'T see: AI hidden objectives, full action history, eventLog
});
```

### AI Agent State Requirements

| Data | In Schema? | Why/Why Not |
|------|-----------|-------------|
| AI player `name` | ✅ Yes | Clients need to display AI name |
| AI player `role` | ✅ Yes | Clients need to show AI role |
| AI player `actionPoints` | ✅ Yes | Clients need to see AP consumption |
| AI player `hasSubmitted` | ✅ Yes | Clients need to know if AI submitted |
| AI `role.hiddenObjective` | ❌ No | SECRET - only server LLM knows |
| AI `hiddenScore` | ❌ No | SECRET - tracks progress on hidden goal |
| AI `actions` (full history) | ❌ No | Too much data, not needed for rendering |
| `eventLog` (all rounds) | ❌ No | Grows unbounded, clients only need current event |

## Colyseus Drivers: Persistence and Scalability

Reference: https://docs.colyseus.io/server/driver

### What Are Drivers?

Colyseus drivers provide:
1. **Presence** - Track which rooms exist across multiple server instances
2. **Matchmaking** - Find/join rooms by criteria
3. **Pub/Sub** - Send messages between room instances

**Default**: In-memory (single process, no persistence)
**Production**: Redis, MongoDB, Postgres drivers available

### Our Current Setup (Phase 1)

```typescript
// server/index.ts
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
  // No driver specified → uses LocalDriver (in-memory)
});
```

**Why in-memory is fine for Phase 1**:
- Single server instance (no horizontal scaling needed)
- Rooms recreated on server restart (acceptable for demo)
- No persistence requirements yet

### Future: Adding Redis Driver (Phase 5+)

When you need:
- Multiple server instances (horizontal scaling)
- Room persistence across restarts
- Cross-server matchmaking

```typescript
// Future: server/index.ts
import { RedisDriver } from "@colyseus/redis-driver";

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
  driver: new RedisDriver({
    host: process.env.REDIS_HOST,
    port: 6379,
  }),
});
```

**With Redis**:
- Room presence stored in Redis (survives server restart)
- StateManager still in-memory (eventLog lost on crash)
- Need to add StateManager persistence separately

### StateManager vs Colyseus Driver

```
┌─────────────────────────────────────────────────────────┐
│              Colyseus Driver (Redis)                    │
│  • Room metadata (roomId, code, player count)           │
│  • Room discovery/matchmaking                           │
│  • Pub/sub for cross-server messages                   │
│  • Does NOT store game state (Schema or Core)           │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────────┐
│             GameRoom (in-memory)                        │
│  • Colyseus Schema (synchronized to clients)            │
│  • StateManager (our in-memory Core state)              │
│  • Both lost on server crash                            │
└─────────────────────────────────────────────────────────┘
```

### Adding Full Persistence (Future)

If you want rooms to survive server restarts:

**Option 1: Snapshot to Database**
```typescript
class GameRoom extends Room {
  async onDispose() {
    // Save to Postgres before room closes
    await prisma.gameSnapshot.create({
      data: {
        roomId: this.roomId,
        coreState: JSON.stringify(this.stateManager.toJSON()),
        schema: JSON.stringify(this.state),
      }
    });
  }

  async onCreate(options) {
    if (options.restoreFromSnapshot) {
      const snapshot = await prisma.gameSnapshot.findUnique({
        where: { roomId: options.roomId }
      });
      this.stateManager = StateManager.fromJSON(snapshot.coreState);
    }
  }
}
```

**Option 2: Event Sourcing** (advanced)
- Store all game events (actions, LLM responses)
- Replay events to reconstruct state
- Enables time-travel debugging

## Bottom Line

We're using Colyseus **exactly as intended** for network state synchronization, but adding a server-side layer for business logic that doesn't need to be synchronized. This is a common pattern in Colyseus applications where:

1. **Schema** = "What clients need to render the game"
2. **Server State** = "What business logic needs to make decisions"
3. **AI Agents** = Server-side only, access full Core state directly
4. **Drivers** = Handle room discovery/scaling (not state persistence)

The adapter layer bridges these two worlds with explicit conversions and contract tests to prevent drift.

This maps to Colyseus's own recommendations for complex games where not all server state needs to be synchronized (see their "best practices" docs about keeping Schema lean).

# State Management Architecture

## Overview

The Colyseus migration uses a **dual state system** where Colyseus handles multiplayer synchronization and Zustand manages UI/local state.

## Architecture

### Colyseus State (Server-Side, Multiplayer Sync)
**Location:** `server/rooms/schema/GameState.ts`

**Responsibilities:**
- Player roster and connection status
- Current phase and round
- Public score / core metric value
- Action submissions (hasSubmitted flags)
- Real-time synchronization across all clients

**Schema:**
```typescript
class GameState extends Schema {
  @type("string") phase: string;           // "lobby" | "action" | "consequence" | "end"
  @type("number") round: number;
  @type("number") publicScore: number;     // Current metric value
  @type("string") coreMetricName: string;  // e.g., "Democratic Legitimacy"
  @type("string") roomCode: string;
  @type({ map: Player }) players: MapSchema<Player>;
}

class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("string") role: string;
  @type("boolean") isHuman: boolean;
  @type("number") actionPoints: number;
  @type("boolean") hasSubmitted: boolean;
  @type("boolean") connected: boolean;
}
```

### Zustand State (Client-Side, UI & History)
**Location:** `stores/gameStore.ts`

**Responsibilities:**
- Event log history (GameLogEntry[])
- Current event details
- Action options for players
- UI state (loading, errors)
- Game setup metadata

**Schema:**
```typescript
interface GameStore {
  gameState: GameState;      // From types/core.ts
  players: Player[];         // Cached from Colyseus
  gameSetup: GameSetup | null;
}

interface GameState {
  phase: GamePhase;           // Enum version
  round: number;
  coreMetric: CoreMetric;     // { name, description, value }
  eventLog: GameLogEntry[];   // NOT synced via Colyseus
  currentEvent: GameEvent | null;
}
```

## Data Flow

### Client Connection & State Sync
```typescript
// 1. Join Colyseus room
const room = await colyseusClient.joinByCode(roomCode, {
  name: playerName,
  role: selectedRole,
});

// 2. Subscribe to Colyseus state changes
room.onStateChange(() => {
  // Update Zustand with Colyseus data
  useGameStore.setState({
    gameState: {
      phase: mapPhase(room.state.phase),
      round: room.state.round,
      coreMetric: {
        name: room.state.coreMetricName,
        value: room.state.publicScore,
        description: "...",
      },
      // Preserve local history
      eventLog: useGameStore.getState().gameState.eventLog,
      currentEvent: useGameStore.getState().gameState.currentEvent,
    },
  });
});
```

### Human Action Submission
```typescript
function submitAction(action: ActionOption) {
  // 1. Send to Colyseus (multiplayer sync)
  room.send("submit_action", {
    actionId: action.title,
    actionPointsSpent: action.cost,
  });
  
  // 2. Optimistic UI update in Zustand
  useGameStore.setState((state) => ({
    players: state.players.map(p => 
      p.isHuman ? { ...p, hasSubmittedActions: true } : p
    ),
  }));
}
```

### AI Agent Execution (Server-Side)
```typescript
// In GameRoom.ts
async processAITurn(aiPlayer: Player) {
  // 1. AI reads Colyseus state directly (server-side)
  const context = {
    phase: this.state.phase,
    round: this.state.round,
    publicScore: this.state.publicScore,
    players: this.state.players,
  };
  
  // 2. Generate AI action via LLM
  const aiAction = await llmService.generateAITurn(aiPlayer, context);
  
  // 3. Update Colyseus state (broadcasts to all clients)
  aiPlayer.hasSubmitted = true;
  aiPlayer.actionPoints -= aiAction.cost;
}
```

**Key Point:** AI agents run on the server and access `room.state` directly. They don't use Zustand or WebSocket - they're part of the Colyseus game room logic.

## Field Mapping

| Concept | Colyseus (Sync) | Zustand (UI) |
|---------|-----------------|--------------|
| Phase | `room.state.phase` (string) | `gameState.phase` (enum) |
| Round | `room.state.round` | `gameState.round` |
| Score | `room.state.publicScore` | `gameState.coreMetric.value` |
| Metric Name | `room.state.coreMetricName` | `gameState.coreMetric.name` |
| Players | `room.state.players` (live) | `players[]` (cached) |
| Event Log | ❌ Not stored | ✅ `gameState.eventLog` |
| Current Event | ❌ Not stored | ✅ `gameState.currentEvent` |
| Action Options | ❌ Not stored | ✅ `players[].actions` |

## Benefits

1. **Separation of Concerns**
   - Colyseus: Real-time multiplayer state
   - Zustand: UI state and history

2. **Performance**
   - Colyseus state stays small (fast sync)
   - Event log not synchronized (reduces bandwidth)

3. **Backward Compatibility**
   - Existing components continue using Zustand
   - Gradual migration, no big rewrite

4. **Scalability**
   - AI agents access state directly (no client needed)
   - Human clients only sync what they need

## Migration Timeline

**Phase 1: Colyseus Foundation** (Nov 27-28) ✅
- Server setup, schemas, message handlers

**Phase 2: Client Integration** (Dec 2-3)
- Create `services/colyseusClient.ts`
- Hook: `useColyseusRoom()`
- Wire up state synchronization

**Phase 3: Hybrid Operation** (Dec 4-5)
- Colyseus: phase, round, players, submissions
- Zustand: event log, UI state
- Existing `useGameController` calls Colyseus

**Phase 4: Post-Event Refinement**
- Move consequence generation to server
- Store event log in Postgres
- Deprecate old API routes

---

## Schema Synchronization: Colyseus ↔ TypeScript Types

### The Challenge

We have **two schema definitions** that need to stay in sync:

1. **Colyseus Schema** (`server/rooms/schema/GameState.ts`)
   - Uses `@colyseus/schema` decorators
   - Required for multiplayer state synchronization
   - Example: `@type("string") phase: string`

2. **TypeScript Types** (`types/core.ts`)
   - Plain TypeScript interfaces
   - Used by AI prompts, game logic, existing code
   - Example: `phase: GamePhase` (enum)

**Problem:** If we change one, we must manually update the other, or they'll diverge.

### Approaches (Ranked by xlr8 Effectiveness)

#### 🌟 Tier 1: **Schema-Driven Code Generation** (North Star)
**Reference:** [xlr8/solutions/schema-driven-codegen.md](https://github.com/bhi5hmaraj/xlr8/blob/main/devex/solutions/schema-driven-codegen.md)

**Strategy:** Define a single source of truth (e.g., Zod schema or Colyseus class) and **generate** all other representations.

*   **For Messages:** Define Zod schemas in `shared/messages.ts` → Infer TypeScript types automatically.
    ```typescript
    // shared/messages.ts
    export const SubmitActionSchema = z.object({ ... });
    export type SubmitAction = z.infer<typeof SubmitActionSchema>; // Zero drift
    ```
*   **For GameState:** Use a tool to generate TypeScript interfaces from Colyseus schema (or vice-versa).
    *   *Potential Tool:* `colyseus-schema-to-typescript` or custom script.

**Pros:**
- ★★★★★ Eliminates drift by construction
- Single source of truth
- Automatable via build scripts

**Cons:**
- Upfront setup cost
- Requires tooling integration

---

#### ✅ Tier 2: **Adapter Layer with Runtime Validation** (Current Strategy)
**Strategy:** Keep schemas separate but link them with explicit adapters and Zod validation.

1.  **Colyseus Schema:** `server/rooms/schema/GameState.ts` (Source for Server)
2.  **Core Types:** `types/core.ts` (Source for AI/Logic)
3.  **Adapters:** `lib/schemaAdapters.ts` (The Bridge)
4.  **Validation:** Zod schemas validate data at boundaries (e.g., AI responses).

**Why this for now?**
- Low upfront cost (critical for Dec 12 deadline)
- "Makes Drift Expensive" (Tier 2) via validation
- Can migrate to Tier 1 (Codegen) later incrementally

---

#### ⚠️ Tier 3: **Manual Synchronization** (Avoid)
**Strategy:** Manually update both files.
- ★☆☆☆☆ High risk of drift. Do not use.

---

### Recommended Strategy for This Project

**Adopt Tier 1 (Codegen) for Messages, Tier 2 (Adapters) for State (for now):**

1.  **Messages:** Use **Zod-First** approach.
    - Define schemas in `shared/messages.ts`.
    - Infer types: `z.infer<typeof Schema>`.
    - **Result:** Zero drift for client-server communication.

2.  **Game State:** Use **Adapter Pattern**.
    - Explicit `colyseusToCore()` mapper.
    - Runtime checks where possible.
    - *Future:* Build a script to generate `types/core.ts` from Colyseus schema.

---

### Example Test

```typescript
// lib/schemaAdapters.test.ts
describe('Schema Adapters', () => {
  it('should round-trip convert Colyseus to Core and back', () => {
    const colyseusState = {
      phase: "action",
      round: 2,
      publicScore: 65,
      coreMetricName: "Public Trust",
    };
    
    const coreState = colyseusToCore(colyseusState);
    expect(coreState.phase).toBe(GamePhase.ACTION);
    expect(coreState.round).toBe(2);
    expect(coreState.coreMetric.value).toBe(65);
    
    const backToColyseus = coreToColyseus(coreState);
    expect(backToColyseus.phase).toBe("action");
    expect(backToColyseus.publicScore).toBe(65);
  });
});
```

### Maintenance Checklist

When changing schemas:
- [ ] Update Colyseus schema (`server/rooms/schema/GameState.ts`)
- [ ] Update TypeScript types (`types/core.ts`)
- [ ] Update adapter functions (`lib/schemaAdapters.ts`)
- [ ] Update field mapping table in `STATE_ARCHITECTURE.md`
- [ ] Run adapter tests
- [ ] Update AI prompts if field names changed

---

## AI Agent State Usage

**AI agents use Colyseus state exclusively:**
- ✅ Run server-side in GameRoom
- ✅ Access `this.state` directly
- ✅ No WebSocket client needed
- ✅ Updates broadcast to all human players

**Human players use both:**
- ✅ Colyseus state (via WebSocket sync)
- ✅ Zustand state (UI/history)

**Result:** Single source of truth (Colyseus) with optimal client experience (Zustand for local UI).

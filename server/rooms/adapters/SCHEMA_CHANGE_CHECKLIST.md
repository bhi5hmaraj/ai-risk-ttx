# Schema Change Checklist

## Overview

This document provides a **step-by-step checklist** for modifying schemas while maintaining synchronization across all representations. Follow this checklist whenever you add/remove/modify fields.

**Golden Rule**: Every schema change touches at minimum **5 locations**. Missing even one causes drift.

## 🤖 Automated Testing (NEW!)

**Instead of manual checklist, run automated tests:**

```bash
# These tests will FAIL if you forget to update any location
pnpm test server/rooms/adapters/__tests__/schema-sync.test.ts

# Tests catch:
# - Missing adapter coverage
# - Mismatched field counts
# - Missing @type decorators
# - Inconsistent defaults
# - Type mismatches
# - Incomplete round-trips
```

**How it works:**
1. You add a field to Core or Schema
2. Run tests → They fail (field not handled in adapter)
3. Update adapters following checklist below
4. Run tests → They pass (synchronization verified)

**See**: `__tests__/schema-sync.test.ts` for implementation

---

## Manual Checklist (Backup)

Use this if automated tests don't catch your specific case:

## Quick Reference

| Change Type | Locations to Update | Tests to Add | Priority |
|-------------|-------------------|--------------|----------|
| Add field to game state | 5 locations | 2 tests | P0 |
| Add field to player | 5 locations | 2 tests | P0 |
| Remove field | 5 locations + cleanup | 1 test | P1 |
| Rename field | 5 locations + migration | 2 tests | P1 |
| Change field type | 5 locations + validation | 3 tests | P0 |

## Detailed Checklist

### Scenario 1: Adding a New Field to Game State

**Example**: Add `maxRounds: number` to game state

#### Step 1: Identify Target Schema

Determine which schema needs the field:
- ✅ **Core GameState**: Business logic needs it (e.g., for end condition)
- ✅ **Colyseus Schema**: Clients need to display it
- ❓ **UI State**: Does Zustand need a copy? (usually inherits from Colyseus)

#### Step 2: Update Core Types

**File**: `types/core.ts`

```typescript
export interface GameState {
  phase: GamePhase;
  round: number;
  coreMetric: CoreMetric;
  eventLog: GameLogEntry[];
  currentEvent: GameEvent | null;
  maxRounds: number;  // ← ADD THIS
}
```

**Checklist**:
- [ ] Added to interface
- [ ] Added JSDoc comment explaining purpose
- [ ] Default value documented (if any)
- [ ] TypeScript compiles without errors

#### Step 3: Update Colyseus Schema

**File**: `server/rooms/schema/GameState.ts`

```typescript
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: string = "lobby";
  @type("number") round: number = 0;
  @type("number") publicScore: number = 75;
  @type("string") coreMetricName: string = "Democratic Legitimacy";
  @type("string") roomCode: string = "";
  @type("number") maxRounds: number = 8;  // ← ADD THIS
}
```

**Checklist**:
- [ ] Added `@type()` decorator (required for Colyseus sync!)
- [ ] Set default value
- [ ] TypeScript compiles
- [ ] Decorator type matches field type (`"number"`, `"string"`, `"boolean"`, etc.)

#### Step 4: Update Adapter - schemaToCore

**File**: `server/rooms/adapters/stateAdapter.ts`

```typescript
export function schemaToCore(
    schema: ColyseusGameState,
    options: {
        eventLog?: CoreGameState['eventLog'];
        currentEvent?: CoreGameState['currentEvent'];
    } = {}
): CoreGameState {
    const phaseMap: Record<string, GamePhase> = { /* ... */ };

    return {
        phase: phaseMap[schema.phase] ?? GamePhase.LOBBY,
        round: schema.round,
        coreMetric: {
            name: schema.coreMetricName,
            value: schema.publicScore,
            description: `The ${schema.coreMetricName} score`,
        },
        eventLog: options.eventLog ?? [],
        currentEvent: options.currentEvent ?? null,
        maxRounds: schema.maxRounds,  // ← ADD THIS
    };
}
```

**Checklist**:
- [ ] Added field mapping
- [ ] Handles default case (if schema.maxRounds is undefined)
- [ ] TypeScript compiles

#### Step 5: Update Adapter - coreToSchema

**File**: `server/rooms/adapters/stateAdapter.ts`

```typescript
export function coreToSchema(
    core: CoreGameState,
    schema: ColyseusGameState
): void {
    const phaseMap: Record<GamePhase, string> = { /* ... */ };

    schema.phase = phaseMap[core.phase] ?? 'lobby';
    schema.round = core.round;
    schema.publicScore = core.coreMetric.value;
    schema.coreMetricName = core.coreMetric.name;
    schema.maxRounds = core.maxRounds;  // ← ADD THIS
}
```

**Checklist**:
- [ ] Added projection
- [ ] Handles any transformations (if needed)
- [ ] TypeScript compiles

#### Step 6: Update StateManager Initialization

**File**: `server/rooms/adapters/stateManager.ts`

```typescript
export interface StateManagerOptions {
    initialCoreMetricName?: string;
    initialCoreMetricValue?: number;
    maxRounds?: number;  // ← ADD THIS
}

export class StateManager {
    constructor(options: StateManagerOptions = {}) {
        this.maxRounds = options.maxRounds ?? 8;  // Use from options

        this.coreState = {
            phase: GamePhase.LOBBY,
            round: 0,
            coreMetric: { /* ... */ },
            eventLog: [],
            currentEvent: null,
            maxRounds: this.maxRounds,  // ← ADD THIS
        };
    }
}
```

**Checklist**:
- [ ] Added to options interface
- [ ] Added to initialization
- [ ] Default value matches other schemas
- [ ] TypeScript compiles

#### Step 7: Update GameRoom Initialization

**File**: `server/rooms/GameRoom.ts`

```typescript
onCreate(options: any) {
    // Initialize Colyseus Schema
    this.setState(new ColyseusGameState());
    this.state.phase = "lobby";
    this.state.round = 0;
    this.state.maxRounds = options.maxRounds || 8;  // ← ADD THIS

    // StateManager initialization (in constructor)
    this.stateManager = new StateManager({
        maxRounds: options.maxRounds || 8,  // ← ADD THIS
    });
}
```

**Checklist**:
- [ ] Schema initialized
- [ ] StateManager initialized with same value
- [ ] Handles options parameter (if needed)
- [ ] TypeScript compiles

#### Step 8: Add Contract Tests

**File**: `server/rooms/adapters/__tests__/adapter.test.ts`

```typescript
describe('maxRounds field', () => {
    test('schemaToCore preserves maxRounds', () => {
        const schema = new ColyseusGameState();
        schema.maxRounds = 10;

        const core = schemaToCore(schema);

        expect(core.maxRounds).toBe(10);
    });

    test('coreToSchema projects maxRounds', () => {
        const core: CoreGameState = {
            phase: GamePhase.LOBBY,
            round: 0,
            coreMetric: { name: 'Test', value: 50, description: 'Test' },
            eventLog: [],
            currentEvent: null,
            maxRounds: 12,  // ← Test new field
        };

        const schema = new ColyseusGameState();
        coreToSchema(core, schema);

        expect(schema.maxRounds).toBe(12);
    });

    test('round-trip preserves maxRounds', () => {
        const originalCore: CoreGameState = {
            /* ... */
            maxRounds: 15,
        };

        const schema = new ColyseusGameState();
        coreToSchema(originalCore, schema);

        const reconstructed = schemaToCore(schema, {
            eventLog: originalCore.eventLog,
            currentEvent: originalCore.currentEvent,
        });

        expect(reconstructed.maxRounds).toBe(originalCore.maxRounds);
    });
});
```

**Checklist**:
- [ ] Test schemaToCore conversion
- [ ] Test coreToSchema projection
- [ ] Test round-trip preservation
- [ ] Tests pass (`pnpm test`)

#### Step 9: Update Documentation

**Files**:
- `FORMAL_SPEC.md` - Update state space definition
- `README.md` - Update usage examples (if public-facing)

```markdown
# FORMAL_SPEC.md

CoreState := (
  phase: Phase,
  round: ℕ,
  coreMetric: CoreMetric,
  eventLog: List[GameLogEntry],
  currentEvent: Maybe[GameEvent],
  maxRounds: ℕ  ← ADD THIS
)
```

**Checklist**:
- [ ] Updated formal spec
- [ ] Updated any diagrams
- [ ] Updated examples

#### Step 10: Rebuild and Test

```bash
# Rebuild server
pnpm run build:server

# Run tests
pnpm test server/rooms/adapters

# Integration test
tsx scripts/test-colyseus.ts
```

**Checklist**:
- [ ] Build succeeds
- [ ] Unit tests pass
- [ ] Integration test passes
- [ ] No TypeScript errors

---

## Scenario 2: Adding a Field to Player

**Example**: Add `lastActionTimestamp: number` to track when player last acted

### Locations to Update

| # | File | What to Change |
|---|------|----------------|
| 1 | `types/core.ts` | Add to `Player` interface |
| 2 | `server/rooms/schema/GameState.ts` | Add to `Player` class with `@type()` |
| 3 | `server/rooms/adapters/stateAdapter.ts` | Update `schemaPlayerToCore()` |
| 4 | `server/rooms/adapters/stateAdapter.ts` | Update `corePlayerToSchema()` |
| 5 | `server/rooms/GameRoom.ts` | Initialize in `onJoin()` |
| 6 | `server/rooms/GameRoom.ts` | Update in relevant handlers (e.g., `submit_action`) |
| 7 | `__tests__/adapter.test.ts` | Add tests |

### Detailed Steps

#### 1. Update Core Player Type
```typescript
// types/core.ts
export interface Player {
  id: string;
  role: Role;
  isHuman: boolean;
  actionPoints: number;
  actions: ActionOption[];
  hasSubmittedActions: boolean;
  hiddenScore: number;
  lastActionTimestamp: number;  // ← ADD THIS
}
```

#### 2. Update Colyseus Player Schema
```typescript
// server/rooms/schema/GameState.ts
export class Player extends Schema {
    @type("string") sessionId: string;
    @type("boolean") connected: boolean = true;
    @type("string") name: string = "";
    @type("string") role: string = "";
    @type("boolean") isHuman: boolean = true;
    @type("number") actionPoints: number = 3;
    @type("boolean") hasSubmitted: boolean = false;
    @type("number") lastActionTimestamp: number = 0;  // ← ADD THIS
}
```

#### 3-4. Update Adapters
```typescript
// stateAdapter.ts - schemaPlayerToCore
export function schemaPlayerToCore(
    player: ColyseusPlayer,
    options: { /* ... */ } = {}
): CorePlayer {
    return {
        id: player.sessionId,
        role: options.fullRole ?? { /* ... */ },
        isHuman: player.isHuman,
        actionPoints: player.actionPoints,
        actions: options.actions ?? [],
        hasSubmittedActions: player.hasSubmitted,
        hiddenScore: options.hiddenScore ?? 0,
        lastActionTimestamp: player.lastActionTimestamp,  // ← ADD THIS
    };
}

// stateAdapter.ts - corePlayerToSchema
export function corePlayerToSchema(
    core: CorePlayer,
    schema: ColyseusPlayer
): void {
    schema.role = core.role.name;
    schema.isHuman = core.isHuman;
    schema.actionPoints = core.actionPoints;
    schema.hasSubmitted = core.hasSubmittedActions;
    schema.lastActionTimestamp = core.lastActionTimestamp;  // ← ADD THIS
}
```

#### 5-6. Update GameRoom
```typescript
// GameRoom.ts - onJoin
onJoin(client: Client, options: any) {
    this.state.createPlayer(client.sessionId, { /* ... */ });

    this.stateManager.addPlayer({
        id: client.sessionId,
        /* ... */
        lastActionTimestamp: Date.now(),  // ← ADD THIS
    });
}

// GameRoom.ts - submit_action handler
this.onMessageZod("submit_action", SubmitActionSchema, (client, data) => {
    const player = this.state.players.get(client.sessionId);
    player.actionPoints -= data.cost;
    player.hasSubmitted = true;
    player.lastActionTimestamp = Date.now();  // ← ADD THIS

    this.stateManager.updateCorePlayer(client.sessionId, {
        actionPoints: player.actionPoints,
        hasSubmittedActions: true,
        lastActionTimestamp: Date.now(),  // ← ADD THIS
    });
});
```

#### 7. Add Tests
```typescript
test('lastActionTimestamp preserved in conversion', () => {
    const timestamp = Date.now();
    const corePlayer: CorePlayer = {
        /* ... */
        lastActionTimestamp: timestamp,
    };

    const schema = new ColyseusPlayer('test');
    corePlayerToSchema(corePlayer, schema);

    expect(schema.lastActionTimestamp).toBe(timestamp);
});
```

---

## Scenario 3: Removing a Field

**Example**: Remove deprecated `roomCode` field (moved to separate system)

### Steps

1. **Mark as deprecated** (don't remove immediately):
```typescript
/**
 * @deprecated Use room ID directly instead
 */
roomCode: string;
```

2. **Remove from Core types first**:
```typescript
// types/core.ts - REMOVE
// roomCode: string;  ← Delete
```

3. **Remove from adapters**:
```typescript
// stateAdapter.ts - REMOVE all references
// schema.roomCode = ...  ← Delete
```

4. **Remove from Schema** (keep for one version if clients depend on it):
```typescript
// schema/GameState.ts
// @type("string") roomCode: string = "";  ← Comment out first, delete later
```

5. **Remove from StateManager**
6. **Remove from GameRoom**
7. **Remove tests**
8. **Update documentation**

**Checklist**:
- [ ] Verify no code references field (global search)
- [ ] Update any clients that depend on field
- [ ] Remove from all schemas
- [ ] Remove tests
- [ ] Update docs

---

## Scenario 4: Changing Field Type

**Example**: Change `round: number` to `round: { current: number, max: number }`

### Approach: Add New, Migrate, Remove Old

#### Step 1: Add New Field (Scenario 1)
- Add `roundInfo: { current: number, max: number }` following Scenario 1

#### Step 2: Dual-Write Period
```typescript
// Write to both old and new
this.state.round = newRound;  // Old
this.state.roundInfo = { current: newRound, max: 8 };  // New
```

#### Step 3: Update Consumers
- Update all code to read from `roundInfo.current` instead of `round`

#### Step 4: Remove Old Field (Scenario 3)
- Delete `round` field after migration complete

**Caution**: This requires coordination with clients!

---

## Common Pitfalls

### Pitfall 1: Forgetting @type Decorator

```typescript
// ❌ WRONG - Field won't sync!
export class GameState extends Schema {
    maxRounds: number = 8;  // Missing @type decorator
}

// ✅ RIGHT
export class GameState extends Schema {
    @type("number") maxRounds: number = 8;
}
```

**Detection**: Field doesn't appear in client `room.state`

### Pitfall 2: Mismatched Defaults

```typescript
// ❌ WRONG - Different defaults cause drift!
// Schema
@type("number") maxRounds: number = 8;

// StateManager
maxRounds: options.maxRounds ?? 10;  // Different!

// ✅ RIGHT - Same default everywhere
const DEFAULT_MAX_ROUNDS = 8;
```

**Detection**: State consistency assertion fails

### Pitfall 3: Forgetting to Update Adapters

```typescript
// ❌ WRONG - Added to Schema but not adapter
export class GameState extends Schema {
    @type("number") maxRounds: number = 8;
}

export function coreToSchema(core, schema) {
    schema.round = core.round;
    // Missing: schema.maxRounds = core.maxRounds;
}

// ✅ RIGHT - Update both sides
```

**Detection**: Contract tests fail (if you wrote them!)

### Pitfall 4: Breaking TypeScript Types

```typescript
// ❌ WRONG - Type doesn't match decorator
@type("string") maxRounds: number = 8;  // Says string, is number!

// ✅ RIGHT
@type("number") maxRounds: number = 8;
```

**Detection**: TypeScript error or runtime crash

---

## Verification Checklist

After making any schema change, run this checklist:

```bash
# 1. TypeScript compiles
pnpm run build:server
# Should succeed with no errors

# 2. Contract tests pass
pnpm test server/rooms/adapters/__tests__/adapter.test.ts
# All tests green

# 3. Integration test passes
tsx scripts/test-colyseus.ts
# Should connect and run game flow

# 4. No state desync
# Check server logs for "STATE DESYNC DETECTED"

# 5. Clients see new field
# Connect with browser, inspect room.state in console
```

## Automation Ideas (Future)

### Idea 1: Linter Rule

```typescript
// Custom ESLint rule: "Ensure @type decorator on Schema fields"
class GameState extends Schema {
    @type("number") round: number;  // ✅ Has decorator
    maxRounds: number;               // ❌ Linter error: Missing @type
}
```

### Idea 2: Schema Diff Tool

```bash
# Detect schema changes and prompt for updates
pnpm run schema:check

Output:
  Detected change: GameState.maxRounds added

  Checklist:
  [ ] Update stateAdapter.ts - schemaToCore()
  [ ] Update stateAdapter.ts - coreToSchema()
  [ ] Update StateManager.ts
  [ ] Add contract tests

  Run: pnpm run schema:update
```

### Idea 3: Codegen (Tier 1)

```bash
# Generate adapters from Schema definitions
pnpm run schema:codegen

# Generates:
# - stateAdapter.ts (from Schema + Core types)
# - Contract tests
# - Type guards
```

## Summary

**Every schema change requires updating 5+ locations**:

1. Core types (`types/core.ts`)
2. Colyseus Schema (`server/rooms/schema/*.ts`)
3. Adapter - Schema → Core (`stateAdapter.ts`)
4. Adapter - Core → Schema (`stateAdapter.ts`)
5. StateManager initialization (`stateManager.ts`)
6. GameRoom initialization (`GameRoom.ts`)
7. Contract tests (`__tests__/adapter.test.ts`)
8. Documentation (`FORMAL_SPEC.md`, etc.)

**Use this checklist religiously to prevent state drift!**

If you find yourself making frequent schema changes, consider migrating to **Tier 1 (Codegen)** from your STATE_ARCHITECTURE.md.

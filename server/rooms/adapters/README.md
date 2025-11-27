# State Adapter Architecture

## Problem Statement

We have two schema representations that must stay synchronized:

1. **Core GameState** (`types/core.ts`) - Rich business logic format with full history
2. **Colyseus Schema** (`server/rooms/schema/GameState.ts`) - Minimal network sync format

See `/eagx/STATE_ARCHITECTURE.md` for architectural context.

## Solution: Bidirectional Adapters + Contract Testing

**Tier 2 Approach**: Explicit adapters with property-based tests to catch drift.

### Design Principles

1. **Colyseus Schema is NOT the source of truth** - It's a view of Core state
2. **Information flows in both directions** - Schema → Core (on messages), Core → Schema (after updates)
3. **Information loss is explicit** - Core has fields Schema doesn't (eventLog, full roles)
4. **Adapters are thin** - Just field mapping, no business logic

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      React Components                              │    │
│  │  (GameScreen, ActionSelection, EventLog, etc.)                     │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Zustand Store (UI State)                        │    │
│  │  • Local UI state (timers, selected actions, modals)              │    │
│  │  • Derived state from Colyseus (humanPlayer, canSubmit, etc.)     │    │
│  │  • Action creators (submitAction, startGame, etc.)                │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              Colyseus Client (colyseus.js)                         │    │
│  │  • room.state → triggers Zustand updates                           │    │
│  │  • room.send("message", data) → to server                          │    │
│  │  • Automatic state synchronization via WebSocket                   │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │ WebSocket
                                 │ (bidirectional sync)
                                 │
┌────────────────────────────────┼────────────────────────────────────────────┐
│                                ▼                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              Colyseus Schema (Network Layer)                       │    │
│  │  • Minimal synchronized state (phase, round, players, score)      │    │
│  │  • @type decorators for automatic sync                             │    │
│  │  • Optimized for bandwidth                                         │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                              │
│                    ┌─────────┴─────────┐                                    │
│                    │                   │                                    │
│          Read      ▼                   ▼      Write                         │
│  ┌────────────────────────┐   ┌────────────────────────┐                   │
│  │  schemaToCore()        │   │  coreToSchema()        │                   │
│  │  (Enrichment)          │   │  (Projection)          │                   │
│  └──────────┬─────────────┘   └────────────┬───────────┘                   │
│             │                               │                               │
│             ▼                               ▲                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              StateManager (In-Memory)                              │    │
│  │  • Full Core GameState (with eventLog, currentEvent)               │    │
│  │  • Full Core Players (with complete role objects, actions)         │    │
│  │  • Source of truth for non-synchronized data                       │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                  GameController (Business Logic)                   │    │
│  │  • advanceRound(coreState, corePlayers)                            │    │
│  │  • Calls LLM services (AI turns, consequences, counterfactual)     │    │
│  │  • Returns updated Core state                                      │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    LLM Services                                    │    │
│  │  • generateAITurn() - AI player actions                            │    │
│  │  • generateConsequences() - Round outcomes                         │    │
│  │  • generateCounterfactual() - Baseline comparison                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                         SERVER (Colyseus Room)                               │
└──────────────────────────────────────────────────────────────────────────────┘

```

### Data Flow Example: Player Submits Action

1. **User clicks action** → React component calls Zustand action
2. **Zustand dispatches** → `room.send("submit_action", { actionId, cost })`
3. **Server validates** → Zod schema check, AP check
4. **Schema updated** → `player.hasSubmitted = true`, `player.actionPoints -= cost`
5. **Colyseus auto-syncs** → WebSocket pushes delta to client
6. **Zustand reacts** → `room.state.onChange` triggers store update
7. **React re-renders** → UI shows updated AP and submission state

### Data Flow Example: Advance Round (Full GameController)

1. **Host clicks "Next Round"** → `room.send("advance_round")`
2. **Server enriches** → `schemaToCore()` + StateManager enrichment
3. **Business logic** → `GameController.advanceRound(coreState, corePlayers)`
4. **LLM calls** → Generate AI actions, consequences, counterfactual (parallel)
5. **Core state updated** → New round, event log entry, scores updated
6. **StateManager persists** → Full Core state saved in-memory
7. **Schema projects** → `coreToSchema()` pushes essential fields to Schema
8. **Colyseus syncs** → Clients receive new round, phase, scores
9. **Zustand updates** → UI reactively shows new game state

## Files

- `stateAdapter.ts` - Bidirectional conversion functions
- `stateManager.ts` - In-memory Core state manager (keeps full history)
- `__tests__/adapter.test.ts` - Contract tests

## Usage in GameRoom

### Pattern: Enrich on Read, Project on Write

```typescript
class GameRoom extends Room<ColyseusGameState> {
    private stateManager: StateManager; // Holds full Core state

    async onMessage("advance_round", async (client, data) => {
        // 1. Convert Schema → Core (with enrichment from stateManager)
        const coreState = this.stateManager.getCoreState();
        const corePlayers = this.stateManager.getCorePlayers();

        // 2. Call business logic with Core types
        const { newState, newPlayers } = await this.gameController.advanceRound(
            this.roomId,
            coreState,
            corePlayers
        );

        // 3. Update in-memory Core state
        this.stateManager.setCoreState(newState);
        this.stateManager.setCorePlayers(newPlayers);

        // 4. Project Core → Schema (for network sync)
        coreToSchema(newState, this.state);
        newPlayers.forEach(p => {
            const schemaPlayer = this.state.players.get(p.id);
            if (schemaPlayer) corePlayerToSchema(p, schemaPlayer);
        });
    });
}
```

### Why This Works

- **Schema stays minimal** - Only fields clients need for rendering
- **Core state preserved** - Full eventLog, roles, etc. kept in-memory
- **No drift** - Adapter functions are the single source of mapping logic
- **Testable** - Contract tests verify adapter correctness

## Testing Strategy

See `__tests__/adapter.test.ts` for:

1. **Round-trip tests** - Core → Schema → Core preserves essential data
2. **Invariant tests** - Conversions maintain business rules
3. **Property-based tests** - Random inputs exercise edge cases
4. **Regression tests** - Specific bug cases stay fixed

## When to Use Codegen

If you find yourself:
- Adding >10 fields to schemas
- Making frequent breaking changes
- Spending >30% of time fixing adapter drift

Then migrate to **Tier 1: Schema-Driven Codegen**. Until then, adapters + tests are sufficient.

## Maintenance Checklist

When adding a field:

- [ ] Update source schema (Core or Schema)
- [ ] Update adapter functions (`toCore`, `toSchema`)
- [ ] Update contract tests
- [ ] Run `pnpm test:contracts`
- [ ] Verify no TypeScript errors
- [ ] Commit together

## Related Docs

- `/eagx/STATE_ARCHITECTURE.md` - Architectural analysis
- `/eagx/colyseus-migration-tasks.md` - Migration plan
- `tests/contracts/README.md` - Testing guide

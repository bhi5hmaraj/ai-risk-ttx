# Edge Cases, Fault Tolerance, and State Recovery

## Overview

This document addresses what happens when the ideal synchronization flow breaks down: disconnections, server crashes, partial updates, race conditions, and state drift.

## State Drift Taxonomy

### Type 1: Client Disconnection (Transient)

**Scenario**: Client loses network connection but server keeps running

```
Time: t0 ─────────────────────── t1 ─────────────── t2
Client: Connected ──X── Disconnected ──✓── Reconnected
Server: Round 3 ────────► Round 4 ────────► Round 4
Schema: players[id].connected = true → false → true
```

**What Colyseus Provides**:
```typescript
// GameRoom.ts
onLeave(client: Client, consented: boolean) {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    player.connected = false;  // Schema update
  }

  // Allow reconnection within 120 seconds
  return this.allowReconnection(client, 120);
}

// Client automatically attempts reconnection
```

**State Reconciliation**:
1. **Client reconnects** → Colyseus sends full Schema state
2. **Client applies state** → Zustand store updates
3. **UI re-renders** → Shows current game state
4. **No action needed** → Server is source of truth

**Formal Model**:
```
Let σ_client(t) = client's view of Schema at time t
Let σ_server(t) = server's actual Schema at time t

Disconnection: σ_client(t) undefined for t ∈ [t_disconnect, t_reconnect]
Reconnection:  σ_client(t_reconnect) := σ_server(t_reconnect)  (full sync)

Invariant: After reconnection, σ_client = σ_server
```

**Edge Case: Reconnection Timeout**

```typescript
onLeave(client, consented) {
  this.clock.setTimeout(() => {
    // Client didn't reconnect within 120s
    const player = this.state.players.get(client.sessionId);
    if (player && !player.connected) {
      // Option 1: Remove player from game
      this.state.players.delete(client.sessionId);
      this.stateManager.removePlayer(client.sessionId);

      // Option 2: Mark as AI player (bot takeover)
      player.isHuman = false;
      this.stateManager.updateCorePlayer(client.sessionId, {
        isHuman: false
      });
    }
  }, 120_000);
}
```

**Test Case**:
```typescript
test('client reconnects within window', async () => {
  const room = await client.create("game");
  room.connection.close();  // Simulate disconnect

  await sleep(5000);  // Wait 5s

  const reconnected = await client.reconnect(room.id, room.sessionId);
  expect(reconnected.state.round).toBe(room.state.round);
});
```

### Type 2: Partial State Update (Race Condition)

**Scenario**: Multiple clients submit actions simultaneously

```
Client A: submit_action(action1, cost=2) ────┐
                                             ├──► Server
Client B: submit_action(action2, cost=2) ────┘

Server State:
  t0: playerA.actionPoints = 3, playerB.actionPoints = 3
  t1: Process A's message → playerA.actionPoints = 1
  t2: Process B's message → playerB.actionPoints = 1

Both updates succeed (no conflict, different players)
```

**Colyseus Sequential Processing**:
```typescript
// Messages are processed sequentially per room
onMessage("submit_action", (client, message) => {
  // Atomic: This completes before next message processed
  const player = this.state.players.get(client.sessionId);

  // Check CURRENT state (race-safe)
  if (player.actionPoints >= message.cost) {
    player.actionPoints -= message.cost;
    player.hasSubmitted = true;
  } else {
    client.send("error", { message: "Not enough action points" });
  }
});
```

**Why This Works**:
- Colyseus processes messages sequentially within a room
- State mutations are synchronous (no async race conditions)
- Schema changes are atomic (all-or-nothing)

**Edge Case: Double Submission**

```typescript
// Client bug: submits action twice
onMessage("submit_action", (client, message) => {
  const player = this.state.players.get(client.sessionId);

  // Guard: Idempotency check
  if (player.hasSubmitted) {
    client.send("error", { message: "Already submitted" });
    return;
  }

  // ... rest of logic
});
```

**Test Case**:
```typescript
test('double submission rejected', async () => {
  const room = await client.create("game");

  room.send("submit_action", { actionId: "a1", cost: 1 });
  room.send("submit_action", { actionId: "a2", cost: 1 });  // Should fail

  await sleep(100);

  const player = room.state.players.get(room.sessionId);
  expect(player.actionPoints).toBe(2);  // Only one action applied
});
```

### Type 3: Server Crash (Catastrophic)

**Scenario**: Server process dies during game

```
Time:     t0 ───────────────────── t_crash
Server:   Round 3, processing AI turns... 💥 CRASH
Schema:   Lost (in-memory)
StateManager: Lost (in-memory)
Clients:  Disconnected
```

**Current Behavior** (Phase 1):
- ❌ Game state lost (no persistence)
- ❌ Clients can't reconnect (room doesn't exist)
- ❌ Must restart game from lobby

**Why This Is Acceptable for Phase 1**:
- Demo/testing environment
- Short game sessions (~30 min)
- Server restarts are rare
- Players can quickly restart

**Future Solution** (Phase 5+): Snapshot to Database

```typescript
class GameRoom extends Room<ColyseusGameState> {
  private saveInterval: NodeJS.Timeout;

  onCreate(options) {
    // Auto-save every 30 seconds
    this.saveInterval = this.clock.setInterval(async () => {
      await this.saveSnapshot();
    }, 30_000);
  }

  async saveSnapshot() {
    try {
      await prisma.gameSnapshot.upsert({
        where: { roomId: this.roomId },
        create: {
          roomId: this.roomId,
          roomCode: this.state.roomCode,
          schemaState: JSON.stringify(this.serializeSchema()),
          coreState: JSON.stringify(this.stateManager.toJSON()),
          lastSaved: new Date(),
        },
        update: {
          schemaState: JSON.stringify(this.serializeSchema()),
          coreState: JSON.stringify(this.stateManager.toJSON()),
          lastSaved: new Date(),
        }
      });

      this.logger.info(this.rid, "Snapshot saved", { roomId: this.roomId });
    } catch (error) {
      this.logger.error(this.rid, "Failed to save snapshot", { error });
    }
  }

  async onDispose() {
    // Final snapshot before room closes
    await this.saveSnapshot();
    this.clock.clear();
  }

  private serializeSchema() {
    return {
      phase: this.state.phase,
      round: this.state.round,
      publicScore: this.state.publicScore,
      players: Array.from(this.state.players.entries()).map(([id, p]) => ({
        sessionId: p.sessionId,
        name: p.name,
        role: p.role,
        actionPoints: p.actionPoints,
        hasSubmitted: p.hasSubmitted,
      }))
    };
  }
}
```

**Recovery Flow**:
```typescript
onCreate(options) {
  if (options.restoreFromSnapshot) {
    const snapshot = await prisma.gameSnapshot.findUnique({
      where: { roomId: options.roomId }
    });

    if (snapshot) {
      // Restore Schema
      const schemaData = JSON.parse(snapshot.schemaState);
      this.state.phase = schemaData.phase;
      this.state.round = schemaData.round;
      // ... restore other fields

      // Restore StateManager
      const coreData = JSON.parse(snapshot.coreState);
      this.stateManager = StateManager.fromJSON(coreData);

      this.logger.info(this.rid, "Restored from snapshot", {
        round: this.state.round,
        age: Date.now() - snapshot.lastSaved.getTime()
      });
    }
  }
}
```

**Trade-offs**:
- ✅ Games survive server restarts
- ✅ Can replay from last checkpoint
- ❌ Adds database I/O overhead
- ❌ Snapshots may be stale (30s lag)
- ❌ Requires Prisma schema migration

### Type 4: Schema-Core Desync (Logic Bug)

**Scenario**: Bug in adapter causes Schema ≠ project(Core)

```
Expected Flow:
  Core.round = 4 ──project──► Schema.round = 4

Buggy Flow:
  Core.round = 4 ──project──► Schema.round = 3  ❌ DRIFT!
```

**Detection via Assertion**:
```typescript
onMessage("advance_round", async (client, data) => {
  const coreState = this.stateManager.getCoreState();
  const corePlayers = this.stateManager.getCorePlayers();

  const { newState, newPlayers } = await this.gameController.advanceRound(...);

  // Persist Core
  this.stateManager.setCoreState(newState);
  this.stateManager.setCorePlayers(newPlayers);

  // Project Core → Schema
  coreToSchema(newState, this.state);

  // ASSERTION: Verify sync (dev mode only)
  if (process.env.NODE_ENV !== 'production') {
    const reconstructed = schemaToCore(this.state, {
      eventLog: newState.eventLog,
      currentEvent: newState.currentEvent,
    });

    if (reconstructed.round !== newState.round) {
      this.logger.error(this.rid, "STATE DESYNC DETECTED", {
        core: newState.round,
        schema: this.state.round,
        reconstructed: reconstructed.round,
      });

      // Option 1: Force resync
      coreToSchema(newState, this.state);  // Retry

      // Option 2: Crash loudly (fail-fast)
      throw new Error(`State desync: Core.round=${newState.round}, Schema.round=${this.state.round}`);
    }
  }
});
```

**Prevention via Contract Tests**:
```typescript
test('project-enrich round-trip preserves round', () => {
  fc.assert(
    fc.property(arbitraryCoreState, (core) => {
      const schema = new ColyseusGameState();
      coreToSchema(core, schema);

      const reconstructed = schemaToCore(schema, {
        eventLog: core.eventLog,
        currentEvent: core.currentEvent,
      });

      expect(reconstructed.round).toBe(core.round);
    })
  );
});
```

**Recovery**:
1. **Detect**: Assertion fails, log error
2. **Alert**: Send Sentry error with full state dump
3. **Force resync**: Re-project Core → Schema
4. **Continue**: Game continues (clients may see brief glitch)

### Type 5: Inconsistent Enrichment Context

**Scenario**: StateManager and Schema disagree

```
Schema.round = 5
StateManager.coreState.round = 4  ❌ OUT OF SYNC!
```

**Root Cause**: Forgot to update StateManager after round advancement

**Prevention via Tight Coupling**:
```typescript
class GameRoom {
  private syncState(newCore: CoreGameState, newPlayers: CorePlayer[]) {
    // Update StateManager
    this.stateManager.setCoreState(newCore);
    this.stateManager.setCorePlayers(newPlayers);

    // Update Schema
    coreToSchema(newCore, this.state);
    newPlayers.forEach(p => {
      const sp = this.state.players.get(p.id);
      if (sp) corePlayerToSchema(p, sp);
    });

    // Verify sync
    this.assertStateConsistency();
  }

  private assertStateConsistency() {
    const coreRound = this.stateManager.getCoreState().round;
    const schemaRound = this.state.round;

    if (coreRound !== schemaRound) {
      throw new Error(`Round desync: Core=${coreRound}, Schema=${schemaRound}`);
    }
  }
}
```

**Test Case**:
```typescript
test('StateManager and Schema stay synchronized', async () => {
  const room = await testServer.createRoom();

  // Advance through 3 rounds
  for (let i = 0; i < 3; i++) {
    await room.send("advance_round");
    await sleep(100);

    // Verify consistency
    const coreRound = room.stateManager.getCoreState().round;
    const schemaRound = room.state.round;
    expect(coreRound).toBe(schemaRound);
  }
});
```

### Type 6: LLM Call Failure (External Dependency)

**Scenario**: LLM service times out or returns error

```
advance_round ────► GameController.advanceRound()
                    ├─► generateAITurn() ──X── Timeout!
                    ├─► generateConsequences() ──✓── Success
                    └─► Result: Partial data
```

**Current Handling**:
```typescript
// GameController.ts
async advanceRound(...) {
  const aiTurnPromises = aiPlayers.map(async (ai) => {
    try {
      const result = await this.deps.llm.generateAITurn(ai, gameState, prevActions);
      if (!result) throw new Error("AI turn generation failed");
      return { playerId: ai.id, result };
    } catch (error) {
      this.logger.error(rid, "AI turn failed", { role: ai.role.name, error });
      // FALLBACK: Random action
      return {
        playerId: ai.id,
        result: { options: [], chosenActions: [] }  // No action
      };
    }
  });

  const [counterfactual, ...aiResults] = await Promise.all([
    counterfactualPromise,
    ...aiTurnPromises
  ]);

  // CRITICAL: Counterfactual is required
  if (!counterfactual) {
    throw new Error("Failed to generate counterfactual");  // Abort round
  }
}
```

**Recovery Strategy**:
```typescript
// Tiered fallback
async generateAITurnWithFallback(player, state, prevActions) {
  // Tier 1: Primary LLM (Gemini 2.0)
  try {
    return await this.llm.generateAITurn(player, state, prevActions);
  } catch (error1) {
    this.logger.warn("Primary LLM failed, trying fallback");
  }

  // Tier 2: Fallback LLM (GPT-4o-mini)
  try {
    return await this.fallbackLLM.generateAITurn(player, state, prevActions);
  } catch (error2) {
    this.logger.warn("Fallback LLM failed, using heuristic");
  }

  // Tier 3: Rule-based heuristic
  return this.generateHeuristicAction(player, state);
}

generateHeuristicAction(player, state) {
  // Simple rule: Do nothing if uncertain
  return { options: [], chosenActions: [] };

  // Or: Use pre-defined action templates
  // Or: Choose randomly from previous rounds
}
```

**User Experience**:
```typescript
onMessage("advance_round", async (client) => {
  try {
    await this.advanceRoundInternal();
  } catch (error) {
    if (error.message.includes("LLM")) {
      // Inform players of degraded experience
      this.broadcast("round_failed", {
        message: "AI service temporarily unavailable. Using simplified AI behavior.",
        canRetry: true,
      });

      // Don't crash - continue with fallback
      await this.advanceRoundWithFallback();
    } else {
      // Unexpected error - crash and report
      this.logger.error(this.rid, "Unexpected error", { error });
      throw error;
    }
  }
});
```

### Type 7: Client Clock Skew

**Scenario**: Client timer desyncs from server timer

```
Server: Round ends at t=300s
Client: Timer shows 10s remaining (clock skew)

User submits action at t=295s (client time)
Server receives at t=305s (server time) ❌ Too late!
```

**Solution**: Server is Source of Truth

```typescript
// Server
onMessage("submit_action", (client, message) => {
  const currentPhase = this.state.phase;

  // Reject if not in ACTION phase (time-independent)
  if (currentPhase !== "action") {
    client.send("error", {
      message: "Not in action phase",
      serverPhase: currentPhase
    });
    return;
  }

  // Process action
  // ...
});
```

**Client Handling**:
```typescript
// Zustand store
room.onMessage("error", (data) => {
  if (data.message === "Not in action phase") {
    // Force sync client state
    set({
      phase: data.serverPhase,
      showTimeoutModal: true
    });
  }
});
```

**Best Practice**: Don't rely on client timers for game logic

## Monitoring & Observability

### Metrics to Track

```typescript
class GameRoom {
  private metrics = {
    stateDesyncs: 0,
    llmFailures: 0,
    reconnections: 0,
    snapshotSaves: 0,
    avgRoundDuration: 0,
  };

  private recordMetric(name: string, value: number) {
    this.metrics[name] = value;

    // Send to monitoring service (e.g., Prometheus, Datadog)
    if (this.monitoring) {
      this.monitoring.gauge(`game.${name}`, value, {
        roomId: this.roomId,
        round: this.state.round,
      });
    }
  }
}
```

### Health Checks

```typescript
// server/index.ts
expressApp.get('/healthz', (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    rooms: gameServer.rooms.size,
    memory: process.memoryUsage(),
  };

  res.status(200).json(health);
});

// Detailed health check
expressApp.get('/healthz/detailed', (req, res) => {
  const rooms = Array.from(gameServer.rooms.values()).map(room => ({
    roomId: room.roomId,
    clients: room.clients.length,
    round: room.state.round,
    phase: room.state.phase,
  }));

  res.json({ rooms });
});
```

## Testing Strategy for Edge Cases

### 1. Chaos Testing

```typescript
describe('Chaos: Random disconnections', () => {
  test('game continues with player disconnections', async () => {
    const clients = await Promise.all([
      testClient.create("game"),
      testClient.create("game"),
      testClient.create("game"),
    ]);

    // Start game
    await clients[0].send("start_game");

    // Randomly disconnect/reconnect clients
    for (let round = 0; round < 5; round++) {
      const victim = clients[Math.floor(Math.random() * clients.length)];
      victim.connection.close();

      await sleep(2000);

      await victim.reconnect();
      await clients[0].send("advance_round");
    }

    // Verify game completed
    expect(clients[0].state.round).toBe(5);
  });
});
```

### 2. Snapshot Recovery Testing

```typescript
test('recover from snapshot after crash', async () => {
  // Create game and play 2 rounds
  const room1 = await client.create("game");
  await room1.send("advance_round");
  await room1.send("advance_round");

  const roomId = room1.roomId;
  const round = room1.state.round;

  // Simulate crash (force disconnect)
  await testServer.shutdown();

  // Restart server
  await testServer.start();

  // Restore from snapshot
  const room2 = await client.create("game", {
    restoreFromSnapshot: true,
    roomId
  });

  expect(room2.state.round).toBe(round);
});
```

### 3. Concurrent Update Testing

```typescript
test('concurrent action submissions handled correctly', async () => {
  const clients = await Promise.all([
    testClient.create("game"),
    testClient.create("game"),
  ]);

  // Submit simultaneously
  await Promise.all([
    clients[0].send("submit_action", { actionId: "a1", cost: 2 }),
    clients[1].send("submit_action", { actionId: "a2", cost: 2 }),
  ]);

  await sleep(100);

  // Both should succeed (different players)
  expect(clients[0].state.players.get(clients[0].sessionId).hasSubmitted).toBe(true);
  expect(clients[1].state.players.get(clients[1].sessionId).hasSubmitted).toBe(true);
});
```

## Summary: Resilience Levels

| Level | Protection | Cost | Phase |
|-------|-----------|------|-------|
| **L0: None** | No recovery | Free | Dev only |
| **L1: Reconnection** | Transient disconnects | Low (built-in) | ✅ Phase 1 |
| **L2: Assertions** | Catch desync bugs | Low (dev mode) | ✅ Phase 1 |
| **L3: LLM Fallbacks** | Degraded AI | Medium | 🔄 Phase 3 |
| **L4: Snapshots** | Server crashes | High (DB writes) | 🔜 Phase 5+ |
| **L5: Event Sourcing** | Time travel | Very high | 🔮 Future |

**Current Status (Phase 1)**: L1 + L2 (sufficient for demo)

**Production Readiness (Dec 12)**: Need L1 + L2 + L3

**Long-term**: Consider L4 after EAGx event

## Recommendations

1. **Immediate (Phase 1-2)**:
   - ✅ Implement reconnection window (120s)
   - ✅ Add state consistency assertions (dev mode)
   - ✅ Add idempotency checks (hasSubmitted)
   - ⚠️ Test with `scripts/test-colyseus.ts` + chaos scenarios

2. **Before EAGx (Phase 3-4)**:
   - 🔄 Add LLM fallback mechanisms
   - 🔄 Add client error recovery (retry logic)
   - 🔄 Add monitoring/metrics (Sentry)
   - 🔄 Load testing with disconnections

3. **Post-EAGx (Phase 5+)**:
   - 🔜 Implement snapshot persistence
   - 🔜 Add Redis driver for scaling
   - 🔜 Event sourcing for debugging

**Bottom Line**: Your current architecture handles most edge cases gracefully. The main risks are LLM failures (mitigate with fallbacks) and server crashes (acceptable for Phase 1, add snapshots later).

# Colyseus Migration - Task Breakdown Guide

This document explains the comprehensive task breakdown for migrating from SSE to Colyseus with a **contract-first approach**.

## Quick Start

```bash
# Run the setup script to load all tasks into Beads
./scripts/setup-colyseus-migration-tasks.sh

# View ready work (tasks with no blockers)
bd ready

# Show dependency tree for a specific phase
bd dep tree ai-risk-ttx-[ID]
```

## Contract-First Philosophy

**Why contracts first?**

The migration uses a **contract-first approach** to ensure all teams/components agree on interfaces before implementation begins. This prevents:
- Integration issues discovered late
- Refactoring due to mismatched expectations
- Type mismatches between client/server
- Breaking changes during development

**What are contracts?**

Contracts are TypeScript interfaces, Zod schemas, JSON Schemas, and Colyseus Schema classes that define:
- **State schemas** - How game state is synchronized
- **Message contracts** - All client ↔ server communications
- **Agent tool schemas** - AI agent function signatures
- **Config schemas** - Firebase Remote Config shape
- **API contracts** - REST endpoints and responses

## Task Structure (29 tasks total)

### Phase 0: Contracts & Infrastructure Setup (7 tasks)
**Goal:** Define all interfaces before writing implementation code

| Task | Description | Why Critical |
|------|-------------|--------------|
| 0.1 | Define Colyseus State Schema | State sync is core to Colyseus - wrong schema = broken sync |
| 0.2 | Define Message Handler contracts | Prevents client/server type mismatches |
| 0.3 | Define Agent Tool contracts | AI agents need stable function signatures |
| 0.4 | Define Firebase Config schema | Config changes shouldn't break games |
| 0.5 | Define Room Code & Auth contract | Security and UX depend on this |
| 0.6 | Feature Flag infrastructure | Enables safe gradual rollout |
| 0.7 | Structured logging | Essential for debugging production issues |

**Key Deliverables:**
- `shared/messages.ts` - All message type definitions
- `game-server/schemas/*.ts` - Colyseus Schema classes
- `game-server/agents/tools.ts` - Agent tool definitions
- `lib/firebase-config.ts` - Config type definition

**Time Estimate:** 1-2 days (Day 0-1)

---

### Phase 1: Proof of Concept (4 tasks)
**Goal:** Validate Colyseus solves SSE connection problems

| Task | Description | Blocks |
|------|-------------|--------|
| 1.1 | Express + Colyseus + Next handler setup | Sets up architecture |
| 1.2 | Basic GameRoom with state sync | Validates schema contract |
| 1.3 | React client integration | Tests message contracts |
| 1.4 | Connection reliability testing | **Decision gate:** proceed or pivot? |

**Decision Gate (End of Phase 1):**
- ✅ Can connect to Colyseus room?
- ✅ State synchronization working?
- ✅ Reconnection feels better than SSE?

**If NO:** Stop and reassess. Timebox debugging to 2 hours. May need to fix SSE instead.

**Time Estimate:** 2 days (Days 1-2)

---

### Phase 2: Core Game Loop (5 tasks)
**Goal:** Full game playable end-to-end via Colyseus

| Task | Description | Key Contract |
|------|-------------|--------------|
| 2.1 | Room code system | Uses 0.5 (Room Code contract) |
| 2.2 | Action submission flow | Uses 0.2 (Message contracts) |
| 2.3 | AI Agent integration | Uses 0.3 (Agent Tools) + 0.4 (Config) |
| 2.4 | Full round testing | Validates entire flow |
| 2.5 | Human-to-human chat | Nice-to-have feature |

**Decision Gate (End of Phase 2):**
- ✅ Can play full game from lobby to end?
- ✅ AI opponents working correctly?
- ✅ Multiple simultaneous games isolated?

**Time Estimate:** 4 days (Days 3-6)

---

### Phase 3: Multiplayer Edge Cases (3 tasks)
**Goal:** Handle real-world failure scenarios

| Task | Description | Why Important |
|------|-------------|---------------|
| 3.1 | Disconnection handling (60s window) | IRL event = flaky WiFi |
| 3.2 | Concurrent action prevention | Race conditions = data corruption |
| 3.3 | Game lifecycle management | Memory leaks = server crashes |

**Edge Cases Covered:**
- Player disconnects mid-round
- Multiple players submit simultaneously
- Idle timeout (30 min)
- Max duration (3 hours)
- Room disposal and cleanup

**Time Estimate:** 3 days (Days 7-9)

---

### Phase 4: Admin Dashboard (2 tasks)
**Goal:** Debug live games during IRL event

| Task | Description | Priority |
|------|-------------|----------|
| 4.1 | Colyseus Admin API routes (/colyseus-admin/*) | HIGH - needed for troubleshooting |
| 4.2 | Admin dashboard UI (Next /admin) | HIGH - on-site debugging |

**Why This Matters:**
During the IRL event, you need to diagnose issues in **< 5 minutes**. This requires:
- List all active games
- View detailed room state
- Force advance round (if stuck)
- Kick disconnected players
- Export state for post-mortem

**Time Estimate:** 2 days (Days 10-11)

---

### Phase 5: Production Deployment (3 tasks)
**Goal:** Deploy to Cloud Run with gradual rollout

| Task | Description | Risk Mitigation |
|------|-------------|-----------------|
| 5.1 | Dockerfile for Express-first server | Containerize Express + Colyseus + Next handler |
| 5.2 | Cloud Run staging deployment | Test external network |
| 5.3 | Gradual rollout (10% → 50%) | Uses 0.6 (Feature Flags) |

**Rollout Strategy:**
- **Day 12:** Staging deployment, beta test with 3-5 users
- **Day 13:** Production 10%, monitor Sentry for 4 hours
- **Day 14:** Production 50%, monitor for 24 hours
- **Day 18:** GO/NO-GO decision (100% or rollback to SSE)

**Time Estimate:** 2 days (Days 12-13)

---

### Phase 6: Stress Testing (3 tasks)
**Goal:** Validate production readiness under load

| Task | Description | Target |
|------|-------------|--------|
| 6.1 | Load test (20 concurrent games) | CPU/memory within limits |
| 6.2 | Long-duration test (4 hours) | No memory leaks |
| 6.3 | Network resilience test | 95%+ reconnection rate |

**Performance Targets:**
- AI action generation: < 10 seconds
- Consequence generation: < 15 seconds
- WebSocket latency: < 200ms
- Memory per game: < 100MB
- Error rate: < 0.1%

**Time Estimate:** 2 days (Days 14-15)

---

### Contract Validation (2 tasks)
**Goal:** Automated testing of all contract definitions

| Task | Description | Coverage |
|------|-------------|----------|
| CV.1 | Contract testing suite | 100% of interfaces |
| CV.2 | API documentation generation | Auto-generated from types |

**Why This Matters:**
- Catches breaking changes before production
- Tests run in CI/CD pipeline
- Documentation always up-to-date

**Time Estimate:** 1 day (parallel with other work)

---

## Dependency Graph

```
Phase 0 (Contracts)
  ↓
Phase 1 (Proof of Concept)
  ↓
Phase 2 (Core Game Loop)
  ↓
Phase 3 (Edge Cases)
  ↓
Phase 4 (Admin Dashboard)
  ↓
Phase 5 (Production Deployment)
  ↓
Phase 6 (Stress Testing)
```

**Key Dependencies:**
- All implementation tasks **block on** contract definitions
- Each phase **blocks on** the previous phase completing
- Contract validation runs **in parallel** with implementation

## Contract Examples

### Example 1: Message Contract

```typescript
// shared/messages.ts

import { z } from 'zod';

// Client → Server: Submit action
export const SubmitActionMessageSchema = z.object({
  actionId: z.string(),
  actionPointsSpent: z.number().min(1).max(3),
  reasoning: z.string().optional(),
});

export type SubmitActionMessage = z.infer<typeof SubmitActionMessageSchema>;

// Server → Client: Round advanced
export const RoundAdvancedEventSchema = z.object({
  round: z.number(),
  phase: z.enum(['lobby', 'action', 'consequence', 'end']),
  timeLimit: z.number().optional(),
});

export type RoundAdvancedEvent = z.infer<typeof RoundAdvancedEventSchema>;
```

**Usage in GameRoom:**

```typescript
onMessage('submit_action', (client, message) => {
  // Validate with Zod schema
  const validated = SubmitActionMessageSchema.parse(message);

  // Type-safe access
  const { actionId, actionPointsSpent } = validated;

  // Process action...
});
```

### Example 2: State Schema Contract

```typescript
// game-server/schemas/GameState.ts

import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id: string;
  @type('string') name: string;
  @type('string') role: string;
  @type('boolean') isHuman: boolean;
  @type('number') hiddenScore: number = 0;
  @type('number') actionPoints: number = 3;
  @type('boolean') hasSubmitted: boolean = false;
}

export class GameState extends Schema {
  @type('string') phase: 'lobby' | 'action' | 'consequence' | 'end' = 'lobby';
  @type('number') round: number = 0;
  @type('number') publicScore: number = 75;
  @type('string') coreMetricName: string = 'Democratic Legitimacy';
  @type({ map: Player }) players = new MapSchema<Player>();
}
```

**Automatic synchronization:**
```typescript
// Client automatically receives updates when:
room.state.phase = 'action'; // ← State change propagates to all clients
```

### Example 3: Agent Tool Contract

```typescript
// game-server/agents/tools.ts

export const submitActionTool = {
  type: 'function',
  function: {
    name: 'submit_action',
    description: 'Submit your selected action for this round',
    parameters: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'The ID of the action you want to take',
        },
        reasoning: {
          type: 'string',
          description: 'Your reasoning for selecting this action',
        },
      },
      required: ['actionId'],
    },
  },
};

// Handler implementation
export async function handleSubmitAction(
  agentId: string,
  params: { actionId: string; reasoning?: string }
): Promise<{ success: boolean }> {
  // Implementation...
}
```

**Agent usage:**
```typescript
const agent = new Agent({
  tools: [submitActionTool],
});

// Agent can now call submit_action with type-safe parameters
```

## Testing Strategy

### Contract Tests (Run First)

```typescript
// __tests__/contracts/messages.test.ts

describe('SubmitActionMessage contract', () => {
  test('accepts valid message', () => {
    const valid = { actionId: 'act-1', actionPointsSpent: 2 };
    expect(() => SubmitActionMessageSchema.parse(valid)).not.toThrow();
  });

  test('rejects invalid message', () => {
    const invalid = { actionId: 123 }; // Wrong type
    expect(() => SubmitActionMessageSchema.parse(invalid)).toThrow();
  });

  test('validates actionPointsSpent range', () => {
    const tooMany = { actionId: 'act-1', actionPointsSpent: 5 };
    expect(() => SubmitActionMessageSchema.parse(tooMany)).toThrow();
  });
});
```

### Integration Tests (Run After Implementation)

```typescript
// __tests__/integration/game-flow.test.ts

describe('Full game round', () => {
  test('completes round with human + AI players', async () => {
    const room = await createTestRoom();
    await room.addHumanPlayer('Alice');
    await room.addAIPlayers(5);

    await room.startRound();
    await room.submitAction('Alice', 'act-1');
    await room.waitForAIActions();
    await room.processConsequences();

    expect(room.state.round).toBe(1);
    expect(room.state.phase).toBe('action'); // Ready for next round
  });
});
```

## Rollback Plan

If Colyseus migration encounters blocking issues:

1. **Before Day 18 (T-3 days):**
   - Set `COLYSEUS_ROLLOUT_PERCENT=0`
   - All users fall back to SSE
   - Migration work continues in background

2. **Day 18 Decision:**
   - **Confident?** → Set to 100%, use Colyseus for IRL event
   - **Not confident?** → Keep at 0%, use SSE for event (85% reliability acceptable)

3. **Emergency Rollback (During Event):**
   ```bash
   # From anywhere (phone, laptop)
   gcloud run services update simulacra \
     --update-env-vars COLYSEUS_ROLLOUT_PERCENT=0
   ```
   - Takes < 2 minutes
   - Existing Colyseus games finish naturally
   - New connections use SSE

## Success Criteria

### Week 1 (End of Day 5)
- [ ] ✅ Can 2 developers explain how Colyseus works?
- [ ] ✅ Did 10 test games complete without connection drops?
- [ ] ✅ Does debugging feel easier than SSE?
- [ ] ✅ Is core game loop playable end-to-end?

### Week 2 (End of Day 10)
- [ ] ✅ Admin dashboard deployed and tested
- [ ] ✅ Edge cases handled (disconnection, races, cleanup)
- [ ] ✅ Staging deployment successful

### Week 3 (End of Day 15)
- [ ] ✅ Production 50% rollout stable
- [ ] ✅ Stress tests pass (20 concurrent games)
- [ ] ✅ Error rate < 1%, latency < 200ms

### Week 4 (Day 18 - IRL Event T-3 days)
- [ ] ✅ GO/NO-GO decision: Colyseus or SSE backup?
- [ ] ✅ Dry run with 18-24 people completed
- [ ] ✅ Tech support on standby

## Tips for Working with Tasks

### View Ready Work

```bash
bd ready
```

Shows all tasks with **no blockers** that you can start immediately.

### Start Phase 0 First

```bash
bd update ai-risk-ttx-[ID] --status in_progress
```

Mark a contract definition task as in-progress and start defining interfaces.

### Show Dependency Tree

```bash
bd dep tree ai-risk-ttx-[ID]
```

Visualize what blocks on this task completing.

### Close Completed Tasks

```bash
bd close ai-risk-ttx-[ID]
```

Mark task as done. Beads will automatically unblock dependent tasks.

### Track Progress

```bash
bd stats
```

See overall completion percentage and velocity.

## Common Pitfalls

### ❌ Starting Implementation Before Contracts

**Problem:** Write GameRoom code before defining message contracts → client/server type mismatch discovered late

**Solution:** Complete all Phase 0 tasks before Phase 1

### ❌ Skipping Contract Tests

**Problem:** Contracts drift from implementation → runtime errors in production

**Solution:** Write contract tests first (CV.1), run in CI/CD

### ❌ Not Testing Reconnection Early

**Problem:** Discover reconnection issues during IRL event

**Solution:** Phase 1.4 (Connection Testing) is a decision gate - don't proceed unless reconnection works

### ❌ Skipping Admin Dashboard

**Problem:** Can't debug live games during event

**Solution:** Phase 4 is HIGH priority - don't skip even if time is tight

### ❌ No Rollback Plan Testing

**Problem:** Panic during event if Colyseus fails

**Solution:** Test feature flag rollback (0.6) multiple times before event

## Questions?

Check the main migration plan: `docs/COLYSEUS_MIGRATION_PLAN.md`

Or view task details:
```bash
bd show ai-risk-ttx-[ID]
```

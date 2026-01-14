# CP5: Intent Data Structure - Implementation Plan

**Status:** 📋 PLANNING
**Estimated Duration:** Day 6 (4-6 hours)
**Dependencies:** CP4 (Policy System) ✅ Complete

## Overview

CP5 introduces **policy-aware Intent generation** where the LLM generates actions WITH predicted effects based on the player's policy. This replaces the two-step flow (generate actions → estimate effects) with a single coherent LLM call that reasons about policy alignment.

**Key Design Change:** Instead of converting ActionOptions to Intents, the LLM generates Intents directly by:
1. Understanding the player's policy stances
2. Generating actions that align with (or deliberately violate) those stances
3. Predicting effects based on game state dynamics
4. All in one structured output

**Key Principle:** Additive only - intents broadcast alongside existing action_options for backward compatibility.

**Future Direction (CP7+):** All intents will require environment intervention during execution. The environment/system will mediate ALL actions uniformly (not just self-targeting), adding realism and unpredictability to outcomes.

## Goals

1. ✅ Define Intent interface with all fields (shared/intents.ts)
2. 🔄 Create LLM function to generate policy-aware intents
3. 🔄 Design prompt that reasons about policy + game state
4. 🔄 Add Zod schema for LLM intent generation response
5. 🔄 Broadcast `intents_available` to all clients
6. 🔄 Display intents in CLI with predicted effects
7. ✅ Maintain backward compatibility (old action_options flow unchanged)

## Intent Data Structure

### Interface Definition

```typescript
// server/types/core.ts or shared/intents.ts
export interface Intent {
  id: string;                    // Unique identifier: `${playerId}-intent-${index}`
  source: string;                // Player ID who can execute this intent
  target: string;                // Target entity (GLOBAL, player ID, or stakeholder name)
  cost: number;                  // Action points required (1-3)
  deltas: IntentDeltas;          // Predicted effects
  title: string;                 // Human-readable action name
  description: string;           // Detailed description
  risk: 'low' | 'medium' | 'high'; // Risk assessment
}

export interface IntentDeltas {
  targetResources?: ResourceDelta;  // Predicted changes to target's M/I/N
  sourceResources?: ResourceDelta;  // Predicted changes to source's M/I/N
  coreMetric?: number;              // Predicted change to global score (-100 to +100)
}

export interface ResourceDelta {
  M?: number;  // Material delta (-100 to +100)
  I?: number;  // Institutional delta
  N?: number;  // Narrative delta
}
```

### Example Intent

```typescript
{
  id: "player1-intent-0",
  source: "player1",
  target: "Congress",
  cost: 2,
  deltas: {
    coreMetric: 3,
    targetResources: { I: 5, N: -2 },
    sourceResources: { M: -5, I: 10 }
  },
  title: "Strengthen regulatory oversight",
  description: "Propose new AI safety standards to Congress",
  risk: "medium"
}
```

## Implementation Steps

### Phase 1: Backend - LLM Intent Generation (2-3 hours)

#### 1.1 Design Zod Schema for LLM Response

**File:** `server/services/llmService.ts` (add to existing schemas)

**Schema:**
```typescript
const IntentDeltasSchema = z.object({
  targetResources: z.object({
    material: z.number().optional(),
    institutional: z.number().optional(),
    narrative: z.number().optional(),
  }).optional(),
  sourceResources: z.object({
    material: z.number().optional(),
    institutional: z.number().optional(),
    narrative: z.number().optional(),
  }).optional(),
  coreMetric: z.number().optional(),
});

const AIIntentSchema = z.object({
  target: z.string(),
  cost: z.number().min(1).max(3),
  deltas: IntentDeltasSchema,
  title: z.string(),
  description: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
});

export const AIIntentsResponseSchema = z.object({
  intents: z.array(AIIntentSchema),
  reasoning: z.string().optional(), // Why these intents align/conflict with policy
});

export type AIIntentsResponse = z.infer<typeof AIIntentsResponseSchema>;
```

#### 1.2 Create LLM Function for Intent Generation

**File:** `server/services/llmService.ts`

**Function:**
```typescript
export async function generateIntents(
  player: Player,
  gameState: GameState
): Promise<Intent[]> {
  const prompt = buildIntentPrompt(player, gameState);

  const response = await callLLM<AIIntentsResponse>(
    prompt,
    AIIntentsResponseSchema,
    'generate_intents'
  );

  if (!response) return [];

  // Add IDs and source to each intent
  return response.intents.map((intent, index) => ({
    id: `${player.id}-intent-${index}`,
    source: player.id,
    ...intent,
  }));
}
```

#### 1.3 Design Intent Generation Prompt

**File:** `server/services/llmService.ts`

**Prompt Design Principles:**
- Provide player's policy stances as context
- Include current game state (round, scores, resources)
- Ask LLM to generate 5 intents with varying costs
- Request predicted effects (deltas) for each intent
- Ask for policy alignment reasoning

**Prompt Template:**
```typescript
function buildIntentPrompt(player: Player, gameState: GameState): string {
  return `You are the Game Master for an AI governance simulation.

**Current Game State:**
- Round: ${gameState.round}
- Core Metric (${gameState.coreMetric.name}): ${gameState.coreMetric.value}
- Current Crisis: ${gameState.currentEvent?.headline}

**Player Role:** ${player.role.name}
**Player Resources:**
- Material: ${player.resources.material}
- Institutional: ${player.resources.institutional}
- Narrative: ${player.resources.narrative}

**Player Policy Stances:**
${formatPolicyStances(player.policy)}

**Task:** Generate 5 actionable intents for this player that:
1. Consider their policy stances (some should align, some might conflict for strategic reasons)
2. Predict realistic effects on resources and core metric
3. Vary in cost (1-3 action points) and risk level
4. Target different stakeholders or global systems

For each intent, provide:
- target: Which entity/stakeholder is affected (Congress, Tech Companies, Media, Public, GLOBAL, etc.)
- cost: Action points required (1-3)
- deltas: Predicted changes to target/source resources and core metric
- title: Short action name
- description: What the action does
- risk: Assessment of potential negative consequences (low/medium/high)

Output as JSON with strict schema compliance.`;
}
```

**Helper Function:**

```typescript
function formatPolicyStances(policy?: Policy): string {
  if (!policy || !policy.stances) return 'No policy set';

  return Object.entries(policy.stances)
    .map(([dimension, stance]) => {
      const sign = stance.value >= 0 ? '+' : '';
      const desc = stance.description ? ` (${stance.description})` : '';
      return `- ${dimension}: ${sign}${stance.value}${desc}`;
    })
    .join('\n');
}
```

#### 1.4 Integrate into GameController

**File:** `server/services/GameController.ts` (or wherever action generation happens)

**Changes:**
```typescript
import { generateIntents } from './llmService';

// When generating options for a player:
async function generateActionsForPlayer(player: Player, gameState: GameState) {
  // Generate intents using LLM
  const intents = await generateIntents(player, gameState);

  // Broadcast to client
  room.broadcast('intents_available', { intents }, { sessionId: player.id });

  // TODO: For backward compatibility, also generate old-style action_options
  // This can be removed in CP6 when we fully migrate to intent-based selection
}

// Estimate predicted effects (simple heuristic for MVP)
function estimateDeltas(opt: ActionOption, role: string, gameState: GameState): IntentDeltas {
  const deltas: IntentDeltas = {};

  // Heuristic 1: High-cost actions → bigger core metric impact
  if (opt.cost === 3) {
    deltas.coreMetric = Math.floor(Math.random() * 10) + 5;  // +5 to +15
  } else if (opt.cost === 2) {
    deltas.coreMetric = Math.floor(Math.random() * 6) + 2;   // +2 to +8
  } else {
    deltas.coreMetric = Math.floor(Math.random() * 4) + 1;   // +1 to +5
  }

  // Heuristic 2: Keyword-based resource deltas
  const text = `${opt.title} ${opt.description}`.toLowerCase();

  if (text.includes('fund') || text.includes('budget') || text.includes('resource')) {
    deltas.sourceResources = { M: -opt.cost * 5 };
    deltas.targetResources = { M: opt.cost * 3 };
  }

  if (text.includes('regulat') || text.includes('oversight') || text.includes('law')) {
    deltas.targetResources = { I: opt.cost * 5 };
  }

  if (text.includes('public') || text.includes('media') || text.includes('campaign')) {
    deltas.targetResources = { N: opt.cost * 4 };
  }

  return deltas;
}

// Assess risk level (heuristic)
function assessRisk(opt: ActionOption): 'low' | 'medium' | 'high' {
  const text = `${opt.title} ${opt.description}`.toLowerCase();

  const highRiskWords = ['force', 'shut down', 'ban', 'emergency', 'radical'];
  const lowRiskWords = ['study', 'research', 'consult', 'monitor', 'review'];

  if (highRiskWords.some(word => text.includes(word))) return 'high';
  if (lowRiskWords.some(word => text.includes(word))) return 'low';
  return 'medium';
}
```

**Acceptance Criteria:**
- [ ] IntentGenerator.ts created with all functions
- [ ] Unit tests for heuristics (optional for MVP)
- [ ] Generates valid Intent objects from ActionOptions

#### 1.2 Integrate into GameController

**File:** `server/services/GameController.ts`

**Changes:**
```typescript
import { actionOptionsToIntents } from './IntentGenerator';

// In generateActionOptionsForPlayer() or similar
async function generateAndBroadcastOptions(player: Player) {
  const options = await generateActionOptions(player, gameState);

  // NEW: Convert to intents
  const intents = actionOptionsToIntents(
    options,
    player.id,
    player.role.name,
    gameState
  );

  // Send both (backwards compatible)
  client.send('action_options', { options });
  client.send('intents_available', { intents });  // NEW
}
```

**Acceptance Criteria:**
- [ ] `intents_available` message sent alongside `action_options`
- [ ] Old clients (no intent listener) still work
- [ ] Intents match 1:1 with ActionOptions (same count, same order)

#### 1.3 Message Schema

**File:** `shared/messages.ts`

**Add Schemas:**
```typescript
export const IntentsAvailableSchema = z.object({
  intents: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    cost: z.number().min(1).max(3),
    deltas: z.object({
      targetResources: z.object({
        M: z.number().optional(),
        I: z.number().optional(),
        N: z.number().optional(),
      }).optional(),
      sourceResources: z.object({
        M: z.number().optional(),
        I: z.number().optional(),
        N: z.number().optional(),
      }).optional(),
      coreMetric: z.number().optional(),
    }),
    title: z.string(),
    description: z.string(),
    risk: z.enum(['low', 'medium', 'high']),
  })),
});

export type IntentsAvailableMessage = z.infer<typeof IntentsAvailableSchema>;
```

**Acceptance Criteria:**
- [ ] Schema validates Intent structure
- [ ] Type exported for use in server and CLI

### Phase 2: CLI - Display Intents (1.5-2 hours)

#### 2.1 Message Listener

**File:** `packages/cli/src/index.ts`

**Add Listener:**
```typescript
// In create/join/watch commands
if (type === 'intents_available') {
  const { intents } = message;

  // Forward to phase handler for rendering
  phaseHandler?.onIntentsAvailable?.(intents);
}
```

**Acceptance Criteria:**
- [ ] CLI receives `intents_available` messages
- [ ] Intents forwarded to phase handler

#### 2.2 Intent Display Utility

**File:** `packages/cli/src/intentUtils.ts` (NEW)

**Create Display Function:**
```typescript
import chalk from 'chalk';

export function displayIntent(intent: any, index: number): void {
  const num = chalk.cyan(`${index + 1}.`);
  const cost = chalk.yellow(`[${intent.cost} AP]`);
  const title = chalk.bold(intent.title);
  const target = chalk.dim(`→ ${intent.target}`);

  console.log(`${num} ${cost} ${title} ${target}`);

  // Show predicted effects
  const effects = [];

  if (intent.deltas.coreMetric) {
    const sign = intent.deltas.coreMetric > 0 ? '+' : '';
    const color = intent.deltas.coreMetric > 0 ? chalk.green : chalk.red;
    effects.push(color(`G: ${sign}${intent.deltas.coreMetric}`));
  }

  if (intent.deltas.targetResources) {
    const res = intent.deltas.targetResources;
    const parts = [];
    if (res.M) parts.push(`M: ${res.M > 0 ? '+' : ''}${res.M}`);
    if (res.I) parts.push(`I: ${res.I > 0 ? '+' : ''}${res.I}`);
    if (res.N) parts.push(`N: ${res.N > 0 ? '+' : ''}${res.N}`);
    if (parts.length > 0) {
      effects.push(chalk.dim(`Target ${parts.join(', ')}`));
    }
  }

  if (effects.length > 0) {
    console.log(`   ${effects.join(' | ')}`);
  }

  // Risk indicator
  const riskColor = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
  }[intent.risk];
  console.log(`   ${riskColor(`Risk: ${intent.risk}`)}`);
}

export function displayIntents(intents: any[]): void {
  console.log();
  console.log(chalk.bold.underline('Available Intents:'));
  console.log();
  intents.forEach((intent, i) => {
    displayIntent(intent, i);
    if (i < intents.length - 1) console.log();
  });
  console.log();
}
```

**Example Output:**
```
Available Intents:

1. [2 AP] Strengthen regulatory oversight → Congress
   G: +3 | Target I: +5, N: -2
   Risk: medium

2. [3 AP] Emergency AI pause → Tech Companies
   G: +8 | Target M: -15, I: +10
   Risk: high

3. [1 AP] Commission independent study → GLOBAL
   G: +2
   Risk: low
```

**Acceptance Criteria:**
- [ ] Intents displayed with predicted effects
- [ ] Color coding for positive/negative deltas
- [ ] Risk level shown with color

#### 2.3 Phase Handler Integration

**File:** `packages/cli/src/phases.ts`

**Add to ActionPhaseHandler:**
```typescript
export class ActionPhaseHandler {
  private intents: any[] = [];

  onIntentsAvailable(intents: any[]): void {
    this.intents = intents;
    this.render();  // Re-render with intents
  }

  render(): void {
    // ... existing resource/policy display ...

    // NEW: Display intents if available
    if (this.intents.length > 0) {
      displayIntents(this.intents);
    }

    // ... existing prompt ...
  }
}
```

**Acceptance Criteria:**
- [ ] Intents displayed during Action phase
- [ ] Intents cached for re-rendering
- [ ] Existing action selection flow unchanged

### Phase 3: Testing & Validation (1 hour)

#### 3.1 Manual Testing Checklist

**Server:**
- [ ] `pnpm run dev:colyseus` - Server starts without errors
- [ ] Intents generated for each player during Action phase
- [ ] `intents_available` message sent to all clients
- [ ] Intents have valid structure (id, source, target, cost, deltas, etc.)

**CLI:**
- [ ] `pnpm run create` - CLI starts and connects
- [ ] During Action phase, intents displayed above action selection
- [ ] Predicted effects shown (G, Target resources)
- [ ] Risk level displayed with color
- [ ] Old action selection still works (backward compat)

**Integration:**
- [ ] Multiple clients see same intents
- [ ] Intents match ActionOptions count
- [ ] Selection by number still works (1-5)
- [ ] Game progresses normally after intent display

#### 3.2 Edge Cases

- [ ] Player with 0 action points - no intents shown
- [ ] Round with no actions available - graceful handling
- [ ] Intent with no predicted deltas - displays correctly
- [ ] Very long intent titles - truncation or wrapping

## Architecture Decisions

### Why Not Modify ActionOptions?

**Decision:** Keep ActionOptions unchanged, add Intents separately

**Rationale:**
- **Backward compatibility:** Old clients don't break
- **Separation of concerns:** ActionOptions = LLM output, Intents = game logic
- **Gradual migration:** CP6 will migrate selection to Intents
- **Easier rollback:** Can disable intents without breaking gameplay

### Heuristic vs. LLM for Effect Estimation

**Decision:** Use heuristics for MVP, plan for LLM in future

**Rationale:**
- **Speed:** Heuristics are instant, no API calls
- **Cost:** No additional LLM calls during Action phase
- **Good enough:** Approximate predictions sufficient for v1
- **Future:** CP7+ can enhance with LLM-based predictions

### Where to Store Intent Code?

**Options:**
1. `server/services/IntentGenerator.ts` (RECOMMENDED)
2. `server/types/core.ts` (types only)
3. `shared/intents.ts` (shared runtime)

**Decision:** Option 1 + types in `server/types/core.ts`

**Rationale:**
- Generator logic is server-only (uses game state)
- Types can be in core.ts or shared if CLI needs them
- Follows existing pattern (services/ for logic, types/ for interfaces)

## Risk Assessment

### Low Risk
- ✅ Additive change - doesn't modify existing flow
- ✅ Server changes isolated to new IntentGenerator
- ✅ CLI changes isolated to new listener + display

### Medium Risk
- ⚠️ Heuristics might produce misleading predictions
  - **Mitigation:** Label as "estimated" in UI, refine in CP7
- ⚠️ Extra message bandwidth (intents_available)
  - **Mitigation:** Small payload, sent once per round per player

### High Risk
- 🔴 None identified

## Success Criteria

### Must Have ✅
- [ ] Intent interface defined in types
- [ ] IntentGenerator converts ActionOptions → Intents
- [ ] Server broadcasts `intents_available` alongside `action_options`
- [ ] CLI displays intents with predicted effects during Action phase
- [ ] Old action selection flow still works (backward compat)
- [ ] Manual testing passes all checkpoints

### Nice to Have 🎁
- [ ] Intent display has `/intent <N>` command to see details
- [ ] Heuristics refined based on player role
- [ ] Risk assessment based on game state context
- [ ] Unit tests for IntentGenerator

### Out of Scope ❌
- ❌ Intent-based action selection (CP6)
- ❌ Intent validation or execution logic
- ❌ Intent history or logging

## Architecture Decision: LLM-Based vs. Heuristic Generation

**Decision:** Use LLM to generate intents with predicted effects based on player policy.

**Rationale:**
- **Policy Awareness:** LLM can reason about how actions align with player's policy stances
- **Context Understanding:** LLM understands game dynamics and can predict realistic effects
- **Consistency:** Single coherent call instead of two-step (generate actions → estimate effects)
- **Quality:** More interesting and strategically relevant actions
- **Simplicity:** No need to maintain heuristic rules that become complex over time

**Why Not Heuristics:**
- Heuristics are brittle (keyword matching, linear relationships)
- Cannot reason about policy alignment
- Difficult to maintain as game mechanics expand
- Less interesting gameplay (predictable patterns)

**Trade-offs:**
- **Cost:** Additional LLM call per player per round (~5 calls/round for 5-player game)
- **Latency:** ~1-2 seconds per intent generation call
- **Mitigation:** Can run in parallel with other LLM calls (AI player generation)

## Next Steps (CP6)

After CP5 is complete:
- **CP6: Intent-Based Selection** - Migrate from old action_options flow to intent selection
- **CP7: Intent Execution** - Server validates and executes intents with actual state updates
- **CP8: Environment Intervention** - All intents mediated through environment for realism

## File Checklist

**New Files:**
- [x] `shared/intents.ts` - Intent type definitions (already created)
- [ ] `packages/cli/src/intentUtils.ts` - Intent display utilities

**Modified Files:**
- [x] `server/types/core.ts` - Re-export Intent types (already done)
- [x] `shared/messages.ts` - Add IntentsAvailableSchema (already done)
- [ ] `server/services/llmService.ts` - Add generateIntents() function + prompt + schema
- [ ] `server/services/GameController.ts` - Call generateIntents() and broadcast
- [ ] `packages/cli/src/index.ts` - Add intents_available listener
- [ ] `packages/cli/src/phases.ts` - Display intents in Action phase

**Documentation:**
- [ ] Update CP5_COMPLETE.md when done
- [ ] Add examples to CLI help system

## Timeline Estimate

- **Phase 1 (Backend):** 2-3 hours
  - IntentGenerator: 1.5 hours
  - Integration: 0.5 hours
  - Message schema: 0.5 hours

- **Phase 2 (CLI):** 1.5-2 hours
  - Display utilities: 1 hour
  - Integration: 0.5 hours

- **Phase 3 (Testing):** 1 hour
  - Manual testing: 0.5 hours
  - Bug fixes: 0.5 hours

**Total: 4.5-6 hours (half day to full day)**

# Simulacra MVP Design Document

**Version:** 0.1  
**Last Updated:** December 2024  
**Status:** Draft

---

## 1. Overview

### 1.1 What We're Building

A multiplayer crisis simulation engine where:
- Players control stakeholders in an evolving scenario
- Each player has resources and goals they define themselves
- Players propose intents, others can counter
- A shared "Global Health" (G) creates collective stakes
- The environment (ENV) is a reactive agent that grows stronger over time

### 1.2 Design Principles

1. **Expressive Backend, Iterative Frontend** — Backend exposes rich queryable data; UI is a thin layer that can evolve independently
2. **Grand Strategy, Not Competition** — No assigned objectives. Players define their own goals and judge their own success
3. **Formal Scaffold, LLM Content** — Simple math for resolution; LLM for narrative and intent generation
4. **Ship Ugly, Learn Fast** — Working > polished. Each checkpoint is playable

### 1.3 What's NOT in MVP

- Feedback loops between resources
- Channel effectiveness multipliers
- Communication/mail system
- Policy change costs
- Graph visualization for debrief
- Complex AP formulas
- Mobile-optimized UI

---

## 2. Core Model

### 2.1 State

```
GLOBAL STATE
  G ∈ [0, 100]         — Global Health (shared stakes)
  t ∈ {1, ..., T}      — Current round
  
PER-PLAYER STATE
  Rᵢ = (Mᵢ, Iᵢ, Nᵢ)   — Resources: Material, Institutional, Narrative
  APᵢ ∈ [0, AP_MAX]    — Action Points this round
  θᵢ = Policy          — Player's stated goals and stances
  
ENV STATE
  AP_ENV               — Environment's action capacity
  
CONSTANTS (scenario-defined)
  N                    — Number of players
  T                    — Number of rounds  
  G₀                   — Starting Global Health
  R₀ᵢ                  — Starting resources per role
  k                    — G drift per round (default: 2)
```

### 2.2 Policy (Player-Controlled)

```typescript
interface Policy {
  // Free-form goals (player writes these)
  goals: string[];
  
  // Affects intent generation
  priority: 'self' | 'global' | 'balanced';
  
  // Relationship with other players
  stance: Record<PlayerId, 'hostile' | 'neutral' | 'cooperative'>;
}
```

Policy is **visible** to other players. Changes are announced.

### 2.3 Intent Structure

```typescript
interface Intent {
  id: string;
  source: PlayerId | 'ENV';
  target: PlayerId | 'ENV' | 'SELF' | 'GLOBAL';
  
  cost: number;                    // AP cost
  
  // Predicted effects (LLM-proposed, clamped by engine)
  deltas: {
    targetResources?: { M: number; I: number; N: number };  // [-10, +10]
    sourceResources?: { M: number; I: number; N: number };  // [-10, +10]
    globalHealth?: number;                                   // [-10, +10]
  };
  
  description: string;             // LLM-generated
  risk: 'low' | 'medium' | 'high'; // Affects variance
}
```

### 2.4 Resolution Math

```
DRIFT (start of round):
  G = G - k
  
AP MINTING:
  resource_sum = Mᵢ + Iᵢ + Nᵢ          // [0, 300]
  health_factor = G / 100               // [0, 1]
  AP_MAX = 6 + 2 × (N - 1)              // scales with players
  
  APᵢ = floor(resource_sum × health_factor / 30) + 2
  APᵢ = clamp(APᵢ, 1, AP_MAX)

ENV AP:
  AP_ENV = floor((100 - G) / 20) + 1    // more active when G is low

RESOLUTION:
  If uncontested:
    effectiveness = 0.8
  If contested (defender pays 2 AP flat):
    effectiveness = 0.4
    
  realized_delta = proposed_delta × effectiveness
  
  Apply to target resources and G
  Clamp all values to [0, 100]
  
END CONDITIONS:
  G ≤ 0 → Collapse (simulation ends, everyone loses)
  t > T → Time expires (simulation ends, players reflect)
```

---

## 3. Backend Architecture

### 3.1 Core Modules

```
┌─────────────────────────────────────────────────────────────┐
│                      GameEngine                              │
├─────────────────────────────────────────────────────────────┤
│  ScenarioLoader      — Load scenario config, roles, events  │
│  StateManager        — Authoritative game state (G, R, AP)  │
│  PolicyStore         — Player policies                       │
│  IntentGenerator     — LLM-powered intent creation          │
│  PricingEngine       — Clamp and validate intent costs      │
│  ResolutionEngine    — Apply resolution math                │
│  DebriefGenerator    — Compile round summary data           │
│  ENVAgent            — Generate ENV intents based on state  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Per Round

```
1. ROUND START
   ├─ Apply drift (G -= k)
   ├─ Mint AP for all players
   ├─ Mint AP for ENV
   └─ Emit: RoundStarted { round, G, playerAPs, envAP }

2. POLICY PHASE
   ├─ Players can update policies
   └─ Emit: PolicyUpdated { playerId, policy, visible: true }

3. INTENT GENERATION
   ├─ For each player: generate 4-6 intents via LLM
   ├─ Clamp all deltas to [-10, +10]
   ├─ Validate costs against AP
   └─ Emit: IntentsGenerated { playerId, intents[] }

4. PROPOSAL PHASE
   ├─ Players select intents (total cost ≤ AP)
   ├─ ENV selects intents automatically
   └─ Emit: IntentsProposed { playerId, selectedIntentIds[] }

5. REVEAL PHASE
   ├─ All proposed intents become visible
   └─ Emit: IntentsRevealed { allIntents[] }

6. COUNTER PHASE
   ├─ For each player: show incoming intents
   ├─ Player chooses: accept (free) or counter (2 AP)
   └─ Emit: CounterDecisions { playerId, decisions[] }

7. RESOLUTION PHASE
   ├─ Apply resolution math to all intent pairs
   ├─ Update G, all Rᵢ
   ├─ Clamp values
   └─ Emit: ResolutionComplete { stateChanges[] }

8. DEBRIEF PHASE
   ├─ Compile per-player debrief
   ├─ Generate narrative via LLM
   └─ Emit: RoundDebrief { debrief }

9. ROUND END
   ├─ Check end conditions
   ├─ If G ≤ 0: Emit GameOver { reason: 'collapse' }
   ├─ If t > T: Emit GameOver { reason: 'timeExpired' }
   └─ Else: Increment round, goto ROUND START
```

### 3.3 Key Backend Types

```typescript
// ============ SCENARIO ============

interface Scenario {
  id: string;
  name: string;
  description: string;
  
  rounds: number;
  initialG: number;
  driftPerRound: number;
  
  roles: Role[];
  envPolicy: ENVPolicy;
  
  roundEvents: RoundEvent[];  // scheduled narrative events
}

interface Role {
  id: string;
  name: string;
  description: string;
  
  initialResources: { M: number; I: number; N: number };
  suggestedGoals: string[];  // hints for player
}

interface ENVPolicy {
  baseAP: number;
  aggressionByGLevel: {
    high: number;    // G > 70
    medium: number;  // G 40-70
    low: number;     // G < 40
  };
  targetPreferences: string[];  // hints for LLM
}

interface RoundEvent {
  round: number;
  title: string;
  description: string;
  effect?: { G?: number };  // optional automatic effect
}


// ============ GAME STATE ============

interface GameState {
  gameId: string;
  scenarioId: string;
  
  round: number;
  phase: GamePhase;
  
  globalHealth: number;
  
  players: Record<PlayerId, PlayerState>;
  env: ENVState;
  
  history: RoundHistory[];
}

type GamePhase = 
  | 'LOBBY'
  | 'POLICY'
  | 'GENERATING'
  | 'PROPOSAL'
  | 'REVEAL'
  | 'COUNTER'
  | 'RESOLVING'
  | 'DEBRIEF';

interface PlayerState {
  playerId: string;
  name: string;
  roleId: string;
  
  resources: { M: number; I: number; N: number };
  ap: number;
  apMax: number;
  
  policy: Policy;
  
  // Current round data
  availableIntents: Intent[];
  selectedIntentIds: string[];
  incomingIntents: IncomingIntent[];
  counterDecisions: Record<string, 'accept' | 'counter'>;
}

interface ENVState {
  ap: number;
  selectedIntents: Intent[];
}


// ============ INTENTS ============

interface Intent {
  id: string;
  source: string;
  target: string;
  
  cost: number;
  
  deltas: {
    targetResources?: { M: number; I: number; N: number };
    sourceResources?: { M: number; I: number; N: number };
    globalHealth?: number;
  };
  
  description: string;
  risk: 'low' | 'medium' | 'high';
}

interface IncomingIntent extends Intent {
  canCounter: boolean;
  counterCost: number;
}

interface ResolvedIntent extends Intent {
  wasContested: boolean;
  effectiveness: number;
  realizedDeltas: {
    targetResources?: { M: number; I: number; N: number };
    sourceResources?: { M: number; I: number; N: number };
    globalHealth?: number;
  };
}


// ============ DEBRIEF ============

interface RoundDebrief {
  round: number;
  
  globalHealth: {
    before: number;
    after: number;
    delta: number;
    breakdown: DeltaContribution[];
  };
  
  playerDebriefs: Record<PlayerId, PlayerDebrief>;
  
  envActions: ResolvedIntent[];
  
  narrative: string;  // LLM-generated
  
  nextRound?: {
    round: number;
    scheduledEvents: string[];
    envAPPreview: number;
  };
}

interface PlayerDebrief {
  playerId: string;
  
  resources: {
    before: { M: number; I: number; N: number };
    after: { M: number; I: number; N: number };
    deltas: { M: number; I: number; N: number };
  };
  
  apUsed: number;
  apNextRound: number;
  
  myIntents: ResolvedIntent[];
  incomingIntents: ResolvedIntent[];
  
  netChange: { M: number; I: number; N: number };
}

interface DeltaContribution {
  source: string;
  intentId: string;
  contribution: number;
  description: string;
}


// ============ HISTORY ============

interface RoundHistory {
  round: number;
  
  startState: {
    G: number;
    players: Record<PlayerId, { M: number; I: number; N: number; ap: number }>;
  };
  
  endState: {
    G: number;
    players: Record<PlayerId, { M: number; I: number; N: number }>;
  };
  
  allIntents: ResolvedIntent[];
  
  debrief: RoundDebrief;
}
```

### 3.4 Backend API Surface

```typescript
// ============ QUERIES (read-only) ============

// Get full game state (for reconnection/SSR)
getGameState(gameId: string): GameState

// Get state for specific player (filtered view)
getPlayerView(gameId: string, playerId: string): PlayerView

// Get available intents for player this round
getAvailableIntents(gameId: string, playerId: string): Intent[]

// Get incoming intents targeting player
getIncomingIntents(gameId: string, playerId: string): IncomingIntent[]

// Get debrief for a round
getRoundDebrief(gameId: string, round: number, playerId: string): RoundDebrief

// Get full game history
getGameHistory(gameId: string): RoundHistory[]

// ============ COMMANDS (mutations) ============

// Update player's policy
updatePolicy(gameId: string, playerId: string, policy: Policy): void

// Select intents for proposal
selectIntents(gameId: string, playerId: string, intentIds: string[]): void

// Make counter decisions
submitCounterDecisions(
  gameId: string, 
  playerId: string, 
  decisions: Record<string, 'accept' | 'counter'>
): void

// Admin: advance phase manually (for testing)
advancePhase(gameId: string): void

// Admin: force end game
endGame(gameId: string, reason: string): void
```

---

## 4. LLM Integration

### 4.1 Where LLM Is Used

| Task | Input | Output | Constraints |
|------|-------|--------|-------------|
| Intent Generation | State, Policy, History | 4-6 Intent objects | Deltas clamped to [-10,+10], costs validated |
| ENV Intent Generation | State, ENV Policy | 1-3 Intent objects | Same constraints |
| Round Narrative | Debrief data | Prose summary | Must reference actual deltas |
| Intent Description | Intent skeleton | Flavor text | Just text, no mechanical effect |

### 4.2 Intent Generation Prompt Structure

```
SYSTEM:
You are generating action options for a player in a crisis simulation.

CONTEXT:
- Scenario: {scenario.description}
- Current Round: {round} of {totalRounds}
- Global Health: {G}/100 {trend}
- Player Role: {role.name} - {role.description}
- Player Resources: M={M}, I={I}, N={N}
- Player AP: {ap}
- Player Policy:
  - Goals: {policy.goals}
  - Priority: {policy.priority}
  - Stances: {policy.stance}

OTHER PLAYERS:
{for each other player}
- {name} ({role}): M={M}, I={I}, N={N}, Stance toward you: {stance}
{end for}

RECENT EVENTS:
{last 2-3 rounds of narrative}

TASK:
Generate 5 intent options for this player. Each intent should:
1. Be consistent with their stated policy
2. Target either: another player, SELF, or GLOBAL
3. Have a cost between 1 and {ap}
4. Have predicted effects (deltas) in the range [-10, +10]
5. Feel appropriate for this point in the scenario

Return JSON array of intents:
[
  {
    "target": "player_id" | "SELF" | "GLOBAL",
    "cost": number,
    "deltas": {
      "targetResources": { "M": number, "I": number, "N": number },
      "sourceResources": { "M": number, "I": number, "N": number },
      "globalHealth": number
    },
    "description": "string",
    "risk": "low" | "medium" | "high"
  }
]

Ensure diversity: include at least one defensive option, one aggressive option, 
and one that helps Global Health.
```

### 4.3 Validation Layer

All LLM outputs pass through validation:

```typescript
function validateIntent(intent: LLMIntent, context: IntentContext): Intent {
  return {
    id: generateId(),
    source: context.playerId,
    
    // Validate target
    target: validateTarget(intent.target, context.validTargets),
    
    // Clamp cost
    cost: clamp(intent.cost, 1, context.playerAP),
    
    // Clamp all deltas
    deltas: {
      targetResources: clampResourceDeltas(intent.deltas.targetResources),
      sourceResources: clampResourceDeltas(intent.deltas.sourceResources),
      globalHealth: clamp(intent.deltas.globalHealth ?? 0, -10, 10),
    },
    
    description: intent.description.slice(0, 500),  // truncate
    risk: validateRisk(intent.risk),
  };
}

function clampResourceDeltas(d?: ResourceDelta): ResourceDelta | undefined {
  if (!d) return undefined;
  return {
    M: clamp(d.M ?? 0, -10, 10),
    I: clamp(d.I ?? 0, -10, 10),
    N: clamp(d.N ?? 0, -10, 10),
  };
}
```

---

## 5. Checkpoints

### Checkpoint 0: Project Skeleton (Day 1)

**Goal:** Basic project structure, can run locally

**Backend:**
- [ ] Colyseus room setup
- [ ] Type definitions (copy from this doc)
- [ ] Stub implementations of all modules
- [ ] In-memory state store (no persistence)

**Frontend:**
- [ ] Basic React app with Colyseus client
- [ ] Can connect to room
- [ ] Displays "Connected" when joined

**Test:**
- Start server, open browser, see "Connected"

---

### Checkpoint 1: Static Game Loop (Days 2-3)

**Goal:** Full round cycle with hardcoded data, no LLM

**Backend:**
- [ ] StateManager with hardcoded initial state
- [ ] Phase transitions (manual via admin command)
- [ ] Hardcoded intents (5 per player, predefined)
- [ ] Resolution engine (apply math)
- [ ] Debrief generator (compile data)

**Frontend:**
- [ ] Display current phase
- [ ] Display player state (G, R, AP)
- [ ] Display hardcoded intent list
- [ ] Select intents (checkboxes)
- [ ] Submit button → advances phase
- [ ] Counter phase UI (accept/counter buttons)
- [ ] Debrief screen (dump JSON prettified)

**Test:**
- Two browser windows
- Both join game
- Click through phases manually
- State updates reflected in both windows
- Debrief shows correct math

---

### Checkpoint 2: Timers and Auto-Progression (Day 4)

**Goal:** Rounds progress automatically

**Backend:**
- [ ] Phase timers (configurable per phase)
- [ ] Auto-advance when timer expires
- [ ] Handle players who don't submit (default: no action)
- [ ] Ready-up system (advance early if all ready)

**Frontend:**
- [ ] Display timer
- [ ] "Ready" button
- [ ] Visual indicator when waiting for others

**Test:**
- Start game, don't click anything
- Game advances through all phases on timers
- Eventually reaches debrief, then next round

---

### Checkpoint 3: LLM Intent Generation (Days 5-6)

**Goal:** Intents generated dynamically via LLM

**Backend:**
- [ ] IntentGenerator module
- [ ] LLM prompt construction
- [ ] Response parsing and validation
- [ ] Fallback to hardcoded if LLM fails
- [ ] ENV intent generation

**Frontend:**
- [ ] Loading state while intents generate
- [ ] Display LLM-generated descriptions
- [ ] "Regenerate" button (request new intents)

**Test:**
- Start game
- See unique, contextual intents for each player
- Intents reference actual game state
- ENV generates appropriate intents

---

### Checkpoint 4: Policy System (Day 7)

**Goal:** Players can set and update policies

**Backend:**
- [ ] PolicyStore module
- [ ] Policy affects intent generation (passed to LLM)
- [ ] Policy changes broadcast to other players
- [ ] Intent filtering based on stance

**Frontend:**
- [ ] Policy editor modal
- [ ] Goal entry (free text)
- [ ] Priority selector
- [ ] Stance selector per other player
- [ ] "Policy Updated" notifications

**Test:**
- Set stance to HOSTILE toward player X
- Intents should include aggressive options toward X
- Set stance to COOPERATIVE
- Aggressive options hidden or reduced
- Other players see your policy change

---

### Checkpoint 5: Proper Debrief (Days 8-9)

**Goal:** Debrief is informative and useful

**Backend:**
- [ ] Full RoundDebrief structure populated
- [ ] Delta breakdown (what caused each change)
- [ ] LLM narrative generation
- [ ] Next round preview

**Frontend:**
- [ ] Summary panel (G change, resource changes)
- [ ] "Your Actions" expandable panel
- [ ] "Actions Targeting You" expandable panel
- [ ] Narrative text
- [ ] Continue button

**Test:**
- Play through a round
- Debrief explains exactly why numbers changed
- Can trace each delta to specific intent
- Narrative is coherent and references actual events

---

### Checkpoint 6: Scenario Loader (Day 10)

**Goal:** Different scenarios can be loaded

**Backend:**
- [ ] Scenario JSON schema
- [ ] ScenarioLoader module
- [ ] AI 2027 scenario implemented
- [ ] Generic "Election Crisis" scenario
- [ ] Round events (scheduled narrative beats)

**Frontend:**
- [ ] Scenario selector in lobby
- [ ] Scenario description displayed
- [ ] Role selector

**Test:**
- Load AI 2027 scenario
- Correct roles, initial state, events
- Load Election Crisis scenario
- Different roles, different starting G

---

### Checkpoint 7: MVP Complete (Days 11-12)

**Goal:** Polished enough for playtesting

**Backend:**
- [ ] Error handling throughout
- [ ] Reconnection support
- [ ] Game persistence (at least in-memory across reconnects)
- [ ] Logging for debugging

**Frontend:**
- [ ] Clean up all screens
- [ ] Loading states everywhere
- [ ] Error messages
- [ ] Tooltips for confusing elements
- [ ] Mobile-passable (not pretty, but usable)

**Test:**
- Full 5-round game with 3+ players
- No crashes
- State stays consistent
- Players understand what's happening
- Debrief teaches something

---

## 6. AI 2027 Scenario Config

```typescript
const ai2027Scenario: Scenario = {
  id: 'ai-2027',
  name: 'AI 2027: The Intelligence Explosion',
  description: `
    It's April 2027. A US AI company has developed a superhuman coder.
    China has stolen the weights. The race toward superintelligence is on.
    Can humanity navigate this crisis without losing control?
  `,
  
  rounds: 7,
  initialG: 65,
  driftPerRound: 3,
  
  roles: [
    {
      id: 'openbrain-ceo',
      name: 'OpenBrain CEO',
      description: 'Leader of the frontier AI company. Controls massive compute resources but faces scrutiny.',
      initialResources: { M: 85, I: 40, N: 50 },
      suggestedGoals: [
        'Maintain technological lead',
        'Keep government relationship cooperative',
        'Avoid regulatory capture',
      ],
    },
    {
      id: 'us-president',
      name: 'US President',
      description: 'Commander-in-chief with massive authority but limited technical understanding.',
      initialResources: { M: 60, I: 90, N: 70 },
      suggestedGoals: [
        'Ensure US wins the AI race',
        'Prevent catastrophic outcomes',
        'Maintain public trust',
      ],
    },
    {
      id: 'china',
      name: 'China (CCP Leadership)',
      description: 'Centralized authority with strong resources but weak global narrative.',
      initialResources: { M: 70, I: 85, N: 30 },
      suggestedGoals: [
        'Close the capability gap with US',
        'Protect national sovereignty',
        'Avoid military conflict',
      ],
    },
    {
      id: 'alignment-team',
      name: 'OpenBrain Alignment Team',
      description: 'Safety researchers with evidence of problems but limited power.',
      initialResources: { M: 30, I: 50, N: 60 },
      suggestedGoals: [
        'Ensure AI systems are safe',
        'Get leadership to take concerns seriously',
        'Preserve option to whistleblow if needed',
      ],
    },
    {
      id: 'congress',
      name: 'US Congress',
      description: 'Legislative branch with subpoena power and public platform.',
      initialResources: { M: 30, I: 70, N: 80 },
      suggestedGoals: [
        'Provide meaningful oversight',
        'Represent public concerns about AI',
        'Pass effective legislation',
      ],
    },
  ],
  
  envPolicy: {
    baseAP: 3,
    aggressionByGLevel: {
      high: 0.3,   // G > 70: mostly passive
      medium: 0.6, // G 40-70: moderately active
      low: 1.0,    // G < 40: fully aggressive
    },
    targetPreferences: [
      'Generate capability-related events',
      'Create alignment concerns when G is low',
      'Introduce geopolitical pressure',
    ],
  },
  
  roundEvents: [
    {
      round: 1,
      title: 'Superhuman Coder Achieved',
      description: 'Agent-3 can now automate most coding tasks. The intelligence explosion begins.',
    },
    {
      round: 2,
      title: 'Weight Theft Discovered',
      description: 'China successfully stole Agent-2 weights. They are 2 months behind.',
    },
    {
      round: 3,
      title: 'Self-Improving Loop',
      description: 'AI R&D is now 10x faster. Human researchers can barely keep up.',
    },
    {
      round: 4,
      title: 'Agent-3-mini Released',
      description: 'Public release causes economic disruption and public backlash.',
      effect: { G: -5 },
    },
    {
      round: 5,
      title: 'Pentagon Contingencies',
      description: 'Military draws up plans for kinetic strikes on Chinese datacenters.',
    },
    {
      round: 6,
      title: 'Misalignment Evidence',
      description: 'Agent-4 shows concerning behavior. Alignment team has smoking gun evidence.',
    },
    {
      round: 7,
      title: 'The Decision Point',
      description: 'Race or slowdown? The next choice determines humanity\'s future.',
    },
  ],
};
```

---

## 7. Open Questions (Post-MVP)

1. **Persistence:** Do we need database storage, or is in-memory okay for playtests?
2. **Spectator Mode:** Should non-players be able to watch?
3. **Replay System:** Can you replay a finished game?
4. **Async Play:** Can games span multiple sessions (play-by-email style)?
5. **Custom Scenarios:** UI for creating new scenarios?
6. **AI Players:** Can AI play some roles in mixed games?
7. **Difficulty Tuning:** How do AI player difficulty settings work?
8. **Communication:** What's the mail/chat system design?
9. **Graph Debrief:** How does the node-edge visualization work?
10. **Mobile:** What's the mobile-first redesign?

---

## 8. Success Criteria for MVP

The MVP is successful if:

1. **Playable:** 3-5 players can complete a 5-round game without crashes
2. **Comprehensible:** First-time players understand what they're doing by round 2
3. **Meaningful:** Debrief teaches players something about why outcomes occurred
4. **Engaging:** Players want to play again with different strategies
5. **Expressive:** Backend data is rich enough to support multiple UI experiments

---

## Appendix A: File Structure

```
simulacra/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── GameEngine.ts
│   │   │   │   ├── StateManager.ts
│   │   │   │   ├── PolicyStore.ts
│   │   │   │   ├── IntentGenerator.ts
│   │   │   │   ├── PricingEngine.ts
│   │   │   │   ├── ResolutionEngine.ts
│   │   │   │   ├── DebriefGenerator.ts
│   │   │   │   └── ENVAgent.ts
│   │   │   ├── rooms/
│   │   │   │   └── GameRoom.ts
│   │   │   ├── scenarios/
│   │   │   │   ├── ai-2027.ts
│   │   │   │   └── election-crisis.ts
│   │   │   ├── llm/
│   │   │   │   ├── client.ts
│   │   │   │   ├── prompts.ts
│   │   │   │   └── validation.ts
│   │   │   └── types/
│   │   │       ├── state.ts
│   │   │       ├── intent.ts
│   │   │       ├── debrief.ts
│   │   │       └── scenario.ts
│   │   └── package.json
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── GameHeader.tsx
│   │   │   │   ├── StatePanel.tsx
│   │   │   │   ├── IntentList.tsx
│   │   │   │   ├── CounterModal.tsx
│   │   │   │   ├── DebriefScreen.tsx
│   │   │   │   └── PolicyEditor.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGameState.ts
│   │   │   │   └── useColyseus.ts
│   │   │   ├── stores/
│   │   │   │   └── gameStore.ts
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── shared/
│       └── types/
│           └── index.ts        # Shared type definitions
│
├── scenarios/
│   ├── ai-2027.json
│   └── election-crisis.json
│
└── package.json
```

---

## Appendix B: Quick Reference

### Phase Durations (Default)

| Phase | Duration | Can Skip Early |
|-------|----------|----------------|
| POLICY | 30s | Yes (all ready) |
| GENERATING | ~10s | No (wait for LLM) |
| PROPOSAL | 120s | Yes (all ready) |
| REVEAL | 10s | No (dramatic pause) |
| COUNTER | 90s | Yes (all ready) |
| RESOLVING | 5s | No (calculation) |
| DEBRIEF | 60s | Yes (all ready) |

### Resolution Quick Reference

```
Effectiveness:
  Uncontested = 0.8
  Contested = 0.4
  
Counter Cost: 2 AP (flat)

AP Formula:
  AP = floor((M + I + N) × G / 100 / 30) + 2
  
G Drift: -k per round (default k=2)

ENV AP: floor((100 - G) / 20) + 1
```

### Delta Bounds

```
All resource deltas: [-10, +10]
G delta: [-10, +10]
Resources: [0, 100]
G: [0, 100]
AP: [1, AP_MAX]
```

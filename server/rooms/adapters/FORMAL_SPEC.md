# Formal Specification: State Spaces and Transformations

## Overview

This document provides a mathematical formalization of the state synchronization architecture. Each state representation is a distinct type space, and server operations are functions between these spaces.

## State Spaces

### 1. Core State Space (Business Logic)

The complete game state used by business logic:

```
CoreState := (
  phase: Phase,
  round: ℕ,
  coreMetric: CoreMetric,
  eventLog: List[GameLogEntry],
  currentEvent: Maybe[GameEvent]
)

CorePlayer := (
  id: String,
  role: Role,
  isHuman: Bool,
  actionPoints: ℕ,
  actions: List[ActionOption],
  hasSubmittedActions: Bool,
  hiddenScore: ℤ
)

Role := (
  name: String,
  publicObjective: String,
  hiddenObjective: String,
  resources: List[String],
  constraints: List[String]
)

CoreMetric := (
  name: String,
  value: ℝ ∈ [0, 100],
  description: String
)

GameLogEntry := (
  round: ℕ,
  roundSummary: String,
  outcomeTimeline: List[OutcomeTimelineItem],
  counterfactualNote: String,
  event: Maybe[GameEvent],
  playerActions: List[PlayerRoundActions],
  publicScoreChange: ℝ,
  publicScoreAfter: ℝ,
  hiddenScoreChanges: Map[String, HiddenScoreUpdate],
  geminiCalls: ℕ
)
```

**Domain**: `𝒞 = CoreState × List[CorePlayer]`

**Invariants**:
- `coreMetric.value ∈ [0, 100]`
- `eventLog.length = round`
- `∀p ∈ players. p.actionPoints ≥ 0`

### 2. Colyseus Schema Space (Network Layer)

The minimal synchronized state:

```
SchemaState := (
  phase: PhaseString,  -- "lobby" | "action" | "consequence" | "end"
  round: ℕ,
  publicScore: ℝ ∈ [0, 100],
  coreMetricName: String,
  roomCode: String,
  players: Map[String, SchemaPlayer]
)

SchemaPlayer := (
  sessionId: String,
  connected: Bool,
  name: String,
  role: String,        -- Just the name, not full Role object
  isHuman: Bool,
  actionPoints: ℕ,
  hasSubmitted: Bool
)
```

**Domain**: `𝒮 = SchemaState`

**Invariants**:
- `publicScore ∈ [0, 100]`
- `phase ∈ {"lobby", "starting", "action", "consequence", "end"}`
- `∀p ∈ players. p.actionPoints ≥ 0`

**Relationship to Core**: `𝒮 ⊂ 𝒞` (Schema is a projection of Core)

### 3. UI State Space (Client)

The Zustand store state:

```
UIState := (
  colyseusState: Maybe[SchemaState],  -- Reactive copy of Schema
  selectedActions: List[String],      -- Local-only
  timeRemaining: ℕ,                   -- Local-only
  showActionTree: Bool,               -- Local-only
  ...otherLocalState
)
```

**Domain**: `𝒰 = UIState`

**Relationship**: `𝒰` observes `𝒮` but doesn't directly influence it (one-way sync)

### 4. LLM Context Space

The enriched state passed to LLM services:

```
LLMContext := (
  gameState: CoreState,              -- Full history
  player: CorePlayer,                -- Full role with hidden objective
  previousActions: List[PlayerRoundActions],
  counterfactual: Maybe[CounterfactualResult]
)
```

**Domain**: `ℒ = LLMContext`

**Relationship**: `ℒ` is derived from `𝒞` with additional context

## Transformations (Morphisms)

### T1: Schema → Core (Enrichment)

```
enrich: 𝒮 × EnrichmentContext → 𝒞

EnrichmentContext := (
  eventLog: List[GameLogEntry],
  currentEvent: Maybe[GameEvent],
  fullRoles: Map[String, Role],
  playerActions: Map[String, List[ActionOption]],
  hiddenScores: Map[String, ℤ]
)

enrich(schema, ctx) := CoreState(
  phase = phaseStringToEnum(schema.phase),
  round = schema.round,
  coreMetric = CoreMetric(
    name = schema.coreMetricName,
    value = schema.publicScore,
    description = "..."
  ),
  eventLog = ctx.eventLog,
  currentEvent = ctx.currentEvent
)
```

**Properties**:
- **Not injective**: Multiple Core states can map to same Schema (information loss)
- **Total function**: Every Schema can be enriched to a Core state (given context)
- **Requires side information**: `EnrichmentContext` comes from StateManager

### T2: Core → Schema (Projection)

```
project: 𝒞 → 𝒮

project(core) := SchemaState(
  phase = phaseEnumToString(core.phase),
  round = core.round,
  publicScore = core.coreMetric.value,
  coreMetricName = core.coreMetric.name,
  roomCode = ...,  -- Preserved from existing schema
  players = projectPlayers(core.players)
)

projectPlayers: List[CorePlayer] → Map[String, SchemaPlayer]
projectPlayers(corePlayers) := {
  p.id ↦ SchemaPlayer(
    sessionId = p.id,
    role = p.role.name,  -- Project to just name
    isHuman = p.isHuman,
    actionPoints = p.actionPoints,
    hasSubmitted = p.hasSubmittedActions,
    ...
  )
  for p in corePlayers
}
```

**Properties**:
- **Surjective**: Every Schema state is reachable from some Core state
- **Not injective**: `project(c1) = project(c2)` doesn't imply `c1 = c2`
- **Information loss**: `eventLog`, `hiddenObjective`, etc. are dropped

### T3: Core → LLM Context (Enrichment for AI)

```
toLLMContext: CoreState × CorePlayer × Maybe[CounterfactualResult] → LLMContext

toLLMContext(state, player, counterfactual) := LLMContext(
  gameState = state,
  player = player,  -- Includes hidden objective!
  previousActions = getPreviousRoundActions(state, state.round - 1),
  counterfactual = counterfactual
)

getPreviousRoundActions: CoreState × ℕ → List[PlayerRoundActions]
getPreviousRoundActions(state, round) :=
  state.eventLog[round].playerActions  if round < length(state.eventLog)
  []                                    otherwise
```

**Properties**:
- **Injective on player**: Each player gets unique context
- **Read-only**: Doesn't mutate state
- **Includes secrets**: `player.role.hiddenObjective` visible to LLM

### T4: LLM Response → Core Update (State Transition)

```
applyLLMResponse: CoreState × List[LLMResponse] → CoreState

LLMResponse := (
  aiActions: List[(PlayerId, List[ActionOption])],
  consequence: ConsequenceResult,
  counterfactual: CounterfactualResult
)

applyLLMResponse(state, responses) := CoreState(
  phase = nextPhase(state),
  round = state.round + 1,
  coreMetric = updateMetric(state.coreMetric, responses.consequence),
  eventLog = state.eventLog ++ [createLogEntry(state, responses)],
  currentEvent = responses.consequence.nextEvent
)

nextPhase: CoreState → Phase
nextPhase(state) :=
  END       if shouldEndGame(state)
  ACTION    otherwise

shouldEndGame: CoreState → Bool
shouldEndGame(state) :=
  state.round ≥ MAX_ROUNDS ∨ state.coreMetric.value ≤ 0
```

**Properties**:
- **State transition**: `CoreState → CoreState`
- **Monotonic round**: `applyLLMResponse(s, r).round ≥ s.round`
- **Appends to log**: `length(applyLLMResponse(s, r).eventLog) = length(s.eventLog) + 1`

### T5: Schema Mutation (Colyseus Sync)

```
mutate: 𝒮 × SchemaUpdate → 𝒮

mutate(schema, update) := schema'  where:
  schema'.field = update.field  for each updated field

-- Triggers Colyseus patch generation:
Δschema = diff(schema, schema')
broadcast(Δschema) to all clients
```

**Properties**:
- **In-place mutation**: Colyseus requires mutating `this.state`
- **Delta encoding**: Only changed fields sent to clients
- **Automatic**: Colyseus handles diff/patch generation

### T6: Schema → UI (Reactive Sync)

```
syncToUI: 𝒮 → 𝒰

syncToUI(schema) := updateZustandStore({ colyseusState: schema })

-- Triggered by Colyseus observer:
room.state.onChange(() => {
  syncToUI(room.state)
})
```

**Properties**:
- **Push-based**: Server pushes updates to client
- **Eventually consistent**: UI converges to Schema state
- **One-way**: UI doesn't directly mutate Schema (sends messages instead)

## Composition Laws

### Round-Trip (Not Identity!)

```
enrich ∘ project ≠ id

Example:
  core1 = CoreState(eventLog = [e1, e2, e3], ...)
  core2 = CoreState(eventLog = [e4, e5], ...)

  project(core1) = project(core2) = schema  (same essential fields)

  enrich(schema, ctx1) = core1  (if ctx1 has [e1, e2, e3])
  enrich(schema, ctx2) = core2  (if ctx2 has [e4, e5])
```

**Therefore**: Need StateManager to preserve `EnrichmentContext`!

### Projection is Left Inverse (with context)

```
project ∘ enrich(schema, ctx) = schema  (preserves essential fields)
```

**Proof**:
```
Let s = enrich(schema, ctx)
Then:
  project(s).phase = phaseEnumToString(phaseStringToEnum(schema.phase)) = schema.phase
  project(s).round = s.round = schema.round
  project(s).publicScore = s.coreMetric.value = schema.publicScore
  ...
∴ project(enrich(schema, ctx)) ≈ schema
```

### Game Loop Composition

```
advanceRound: 𝒞 → 𝒞

advanceRound = applyLLMResponse ∘ callLLMServices ∘ toLLMContext

Where:
  callLLMServices: LLMContext → LLMResponse
```

**Full flow**:
```
1. Schema ─enrich─→ Core
2. Core ─toLLMContext─→ LLMContext
3. LLMContext ─callLLM─→ LLMResponse
4. Core × LLMResponse ─applyLLMResponse─→ Core'
5. Core' ─project─→ Schema'
6. Schema' ─mutate─→ (broadcast to clients)
```

## Invariant Preservation

### Score Bounds

```
Invariant: ∀s ∈ 𝒞. s.coreMetric.value ∈ [0, 100]

Proof that project preserves:
  Let s ∈ 𝒞
  Assume s.coreMetric.value ∈ [0, 100]
  Then project(s).publicScore = s.coreMetric.value ∈ [0, 100] ✓
```

### Round Monotonicity

```
Invariant: advanceRound is monotonic in round number

Proof:
  Let s ∈ 𝒞
  applyLLMResponse(s, r).round = s.round + 1 > s.round ✓
```

### Event Log Length

```
Invariant: length(eventLog) = round (after each round)

Proof by induction:
  Base: round = 0, eventLog = [] ✓

  Inductive step:
    Assume length(s.eventLog) = s.round
    Let s' = advanceRound(s)
    Then:
      s'.round = s.round + 1
      s'.eventLog = s.eventLog ++ [newEntry]
      length(s'.eventLog) = length(s.eventLog) + 1 = s.round + 1 = s'.round ✓
```

## State Diagram

```
                     ┌──────────────┐
                     │  Schema (𝒮)  │ ← Clients observe
                     └───────┬──────┘
                             │ ▲
                    enrich   │ │ project
                      (T1)   │ │ (T2)
                             ▼ │
                     ┌──────────────┐
                     │   Core (𝒞)   │ ← Business logic
                     └───────┬──────┘
                             │ ▲
                  toLLMCtx   │ │ applyLLM
                      (T3)   │ │ (T4)
                             ▼ │
                     ┌──────────────┐
                     │  LLM Context │ ← AI services
                     │      (ℒ)     │
                     └──────────────┘
```

## Verification with Contract Tests

Contract tests verify these properties hold:

### Test 1: Projection Preserves Essential Fields

```haskell
property_project_preserves_essentials :: CoreState -> Bool
property_project_preserves_essentials core =
  let schema = project(core)
      core' = enrich(schema, extractContext(core))
  in  core'.round == core.round
   && core'.coreMetric.value == core.coreMetric.value
   && core'.phase == core.phase
```

### Test 2: Round-Trip with Context

```haskell
property_roundtrip_with_context :: CoreState -> Bool
property_roundtrip_with_context core =
  let schema = project(core)
      ctx = EnrichmentContext(
        eventLog = core.eventLog,
        currentEvent = core.currentEvent,
        ...
      )
      core' = enrich(schema, ctx)
  in  core' == core  -- Full equality with context!
```

### Test 3: Invariant Preservation

```haskell
property_score_bounds :: CoreState -> LLMResponse -> Bool
property_score_bounds core response =
  let core' = applyLLMResponse(core, response)
  in  core'.coreMetric.value >= 0 && core'.coreMetric.value <= 100
```

## Category Theory Perspective (Optional)

For the mathematically inclined:

**Categories**:
- Objects: `𝒞` (Core), `𝒮` (Schema), `ℒ` (LLM), `𝒰` (UI)
- Morphisms: `enrich`, `project`, `toLLMContext`, etc.

**Functors**:
- `project: 𝒞 → 𝒮` is a functor (preserves composition)
- `enrich: 𝒮 × Ctx → 𝒞` is a section (right inverse of project, given context)

**Adjunction** (with fixed context):
- `enrich ⊣ project` (enrich is left adjoint to project)
- Natural transformation: `η: id_𝒞 → enrich ∘ project`

## Operational Semantics

### State Transition System

```
Configurations: Γ = 𝒞 × 𝒮 × Map[ClientId, 𝒰]

Initial state:
  (core₀, schema₀, {}) where:
    core₀.phase = LOBBY
    core₀.round = 0
    core₀.eventLog = []
    schema₀ = project(core₀)

Transition rules:

[PLAYER-JOIN]
  (core, schema, clients) → (core', schema', clients ∪ {id ↦ ui₀})
  where:
    core' = addPlayer(core, id)
    schema' = mutate(schema, project(core'))

[SUBMIT-ACTION]
  (core, schema, clients) → (core', schema', clients')
  where:
    core' = recordAction(core, playerId, action)
    schema' = mutate(schema, projectPlayer(core'.players[playerId]))

[ADVANCE-ROUND]
  (core, schema, clients) → (core', schema', clients')
  where:
    ctx = toLLMContext(core, ...)
    response = callLLM(ctx)
    core' = applyLLMResponse(core, response)
    schema' = mutate(schema, project(core'))
```

## Summary

**Key Insights**:

1. **Information Hierarchy**: `𝒞 ⊃ 𝒮 ⊃ 𝒰` (Core has most info, UI has least)
2. **Lossy Projection**: `project: 𝒞 → 𝒮` loses `eventLog`, `hiddenObjective`
3. **Context-Dependent Inverse**: `enrich` needs `EnrichmentContext` from StateManager
4. **State Manager = Context Store**: Preserves information lost in projection
5. **Transformations Preserve Invariants**: Contract tests verify

**Formal Guarantee**:

> Given StateManager that correctly maintains `EnrichmentContext`,
> and given that contract tests pass,
> then `project ∘ enrich(s, ctx) ≈ s` (modulo non-essential fields)

This justifies our architecture: **adapters + state manager + contract tests = correct synchronization**.

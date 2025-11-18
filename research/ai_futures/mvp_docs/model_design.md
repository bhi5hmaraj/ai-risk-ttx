# AI-2027 MVP – Formal Model Design

**Status**: Draft
**Owner**: TBD
**Last updated**: 2025-11-18

---

## 1. Overview

This document specifies **which formal models** the AI-2027 Modeling Playground MVP will support, in what order, and why.

**Design principle**: Start simple (deterministic), validate the architecture, then add complexity progressively.

---

## 2. MVP Model Scope

### 2.1 Phase 1: Deterministic LTS (Labeled Transition System)

**Timeline**: Week 1

**What**:
- Plain finite-state machine
- Deterministic transitions (no probabilities)
- Discrete time (integer timesteps)
- No complex time guards yet

**Formal definition**:

```
LTS = (S, Act, →, s₀, AP, L)

Where:
- S: Finite set of states (world scenarios)
- Act: Finite set of actions/events
- →: S × Act → S (deterministic transition function)
- s₀ ∈ S: Initial state
- AP: Set of atomic propositions (e.g., "race", "catastrophe", "aligned")
- L: S → 2^AP (labeling function)
```

**State representation**:

```ts
interface State {
  nodeId: string;               // Current state in S
  variables: Record<string, number | string>;  // World variables (compute, risk, etc.)
  timeStep: number;             // Discrete time counter
}
```

**Example transitions**:

```
S0 → S1  [action: "DEPLOY"]
S1 → S2  [action: "SCALE"]
S2 → S3  [action: "RACE"]
S2 → S4  [action: "SLOWDOWN"]
```

**Why start here**:
- ✅ Dead simple: Just states + labeled edges
- ✅ Immediate visualization (React Flow handles this naturally)
- ✅ Clear semantics, easy to debug
- ✅ Validates graph contract and UI architecture
- ✅ Foundation for all future extensions

**Properties we can check**:
- **Safety**: `G ¬catastrophe` (never reach catastrophe state)
- **Liveness**: `F aligned` (eventually reach aligned AI)
- **Response**: `G (deploy → F (race ∨ slowdown))` (every deploy leads to choice)

**Limitations**:
- No uncertainty (unrealistic)
- No temporal windows (can't express "must decide by 2027")
- No probabilities (can't answer "what's risk of catastrophe?")

### 2.2 Phase 2: Time-Indexed Kripke Structure

**Timeline**: Week 2 (3-5 days after Phase 1)

**What**:
- Extend LTS with explicit time component in state
- Add time guards to edges (temporal windows)
- Still deterministic (no probabilities)

**Formal definition**:

```
Time-Indexed Kripke = (W × T, →, (w₀, 0), AP, L)

Where:
- W: World states (same as S from LTS)
- T: Time (discrete, ℕ)
- State: s = (w, t) ∈ W × T
- →: Transition relation with time guards
- AP: Atomic propositions + time predicates
- L: (W × T) → 2^AP (labeling function)
```

**State representation**:

```ts
interface TimeIndexedState {
  worldState: string;           // w ∈ W
  timeStep: number;             // t ∈ T
  variables: Record<string, number | string>;
}
```

**Edges with time guards**:

```ts
interface EdgeWithTimeGuard {
  source: string;
  target: string;
  action: string;
  timeWindow: { min: number; max: number } | null;  // Guard: t ∈ [min, max]
}
```

**Example**:

```
(S2, t) → (S3, t+1)  with guard: t ∈ [6, 16]
  "Theft scenario only possible in quarters 6-16 (2025-2028)"

(S0, t) → (S1, t+1)  with guard: t ∈ [0, 8]
  "Deploy only before 2026"
```

**Why add this**:
- ✅ Calendar deadlines ("must regulate before Q12")
- ✅ Vulnerability windows ("open to theft Q6-Q16")
- ✅ Still deterministic (complexity added incrementally)
- ✅ Standard Kripke semantics (not full timed automata complexity)

**Properties we can check**:
- **Bounded safety**: `G_{t<12} ¬catastrophe` (safe before 2027)
- **Deadline liveness**: `F_{t≤8} regulation` (regulate by 2026)
- **Time-bounded response**: Within 4 quarters of deployment, choose race or slowdown

**Limitations**:
- Still no uncertainty
- Time is discrete (not continuous)
- No hazard rates or exponential waiting times

### 2.3 Phase 3 (Future): Markov Decision Process (MDP)

**Timeline**: 2-3 weeks after Phase 2

**What**:
- Add probabilistic transitions
- Add actions with stochastic outcomes
- Enable risk quantification

**Formal definition**:

```
MDP = (S, A, P, R, γ)

Where:
- S: Finite set of states
- A: Finite set of actions
- P: S × A × S → [0,1] (transition probabilities)
- R: S × A × S → ℝ (reward function)
- γ ∈ [0,1]: Discount factor
```

**Example transitions**:

```
From S2, action NO_OP:
  P(S2 → S3) = 0.15  (15% theft occurs)
  P(S2 → S4) = 0.10  (10% controls imposed)
  P(S2 → S2) = 0.75  (75% status quo)

From S2, action INVEST_SECURITY:
  P(S2 → S3) = 0.05  (5% theft - reduced)
  P(S2 → S4) = 0.30  (30% controls - increased)
  P(S2 → S2) = 0.65  (65% status quo)
```

**Why add this**:
- ✅ Realistic uncertainty modeling
- ✅ Risk quantification ("What's P(catastrophe)?"
- ✅ Policy optimization (find safest strategy)
- ✅ PCTL properties (`P≤0.05[F catastrophe]`)

**Properties we can check (PCTL)**:
- **Probabilistic safety**: `P≤0.05[F catastrophe]` (≤5% risk of catastrophe)
- **Expected value**: `P=?[F aligned]` (what's probability of alignment?)
- **Bounded risk**: `P≤0.2[F_{≤12} theft]` (≤20% risk of theft before Q12)

**Implementation**:
- **Phase 3a**: Frontend can show probabilities on edges, simulate trajectories
- **Phase 3b**: Matrix backend adds PRISM/Storm integration for PCTL model checking

---

## 3. Out of Scope for MVP

The following models are **NOT** in MVP scope, but are documented for future consideration:

### 3.1 Continuous-Time MDP (CTMDP)

**Why not MVP**:
- Complex mathematics (exponential waiting times, Gillespie algorithm)
- Requires specialized tools (Storm, PRISM with CSL logic)
- Overkill for discrete quarterly decisions
- Can revisit if continuous-time dynamics become critical

**When to add**: Only if hazard rates and competing risks are essential to analysis

### 3.2 Partially Observable MDP (POMDP)

**Why not MVP**:
- Adds observation model complexity
- Belief-state planning is expensive
- AI-2027 scenarios assume full observability initially

**When to add**: If epistemic uncertainty becomes a focus (e.g., "what if actors don't know true risk?")

### 3.3 Timed Automata

**Why not MVP**:
- Real-valued clocks add complexity
- Time-indexed Kripke covers discrete time needs
- Would require UPPAAL integration

**When to add**: If real-time constraints with clock constraints are needed (unlikely for AI-2027)

### 3.4 Multi-Agent Game Theory

**Why not MVP**:
- Strategic interactions add game-theoretic complexity
- Requires Nash equilibrium, backward induction, etc.
- Current model treats AI as adversary, not strategic agent

**When to add**: If we model multiple strategic human actors with conflicting objectives

---

## 4. Model Progression Strategy

```
Phase 1: LTS
  ↓ (add time guards)
Phase 2: Time-Indexed Kripke
  ↓ (add probabilities)
Phase 3: MDP
  ↓ (optionally add continuous time)
Future: CTMDP

Alternative branches:
  From MDP → POMDP (partial observability)
  From MDP → Stochastic Game (multi-agent)
```

**Key insight**: Each phase is an **extension**, not a rewrite.

- LTS → Time-Indexed Kripke: Add `(t)` component to state, add guards to edges
- Time-Indexed Kripke → MDP: Replace `→` with `P(s'|s,a)`, add probabilities
- MDP → CTMDP: Replace discrete time with continuous hazard rates

**Frontend contract remains stable** across all phases (same `GraphResponse` shape).

---

## 5. Property Specification Library

For each model phase, we'll define a library of common properties:

### Phase 1 (LTS) – LTL/CTL Properties

**Safety**:
```
G ¬catastrophe           // Never catastrophe
G ¬(race ∧ unaligned)   // Never unaligned race
```

**Liveness**:
```
F aligned                // Eventually aligned
F (regulation ∨ pause)  // Eventually regulate or pause
```

**Response**:
```
G (deploy → F scale)     // Deploy always leads to scale
G (theft → F response)   // Theft always triggers response
```

### Phase 2 (Time-Indexed) – Bounded Temporal Logic

**Bounded safety**:
```
G_{t≤12} ¬catastrophe    // Safe before 2027
G_{t≤8} ¬race           // No race before 2026
```

**Deadline liveness**:
```
F_{t≤8} regulation       // Must regulate by 2026
F_{t≤12} (pause ∨ align) // Must pause or align by 2027
```

**Time windows**:
```
G (theft → (6 ≤ t ≤ 16)) // Theft only in Q6-Q16
```

### Phase 3 (MDP) – PCTL Properties

**Probabilistic safety**:
```
P≤0.05[F catastrophe]         // ≤5% catastrophe risk
P≤0.2[F_{≤12} theft]          // ≤20% theft risk before Q12
```

**Expected outcomes**:
```
P=?[F aligned]                // Probability of alignment
P=?[F_{≤12} regulation]       // Probability of timely regulation
```

**Comparative**:
```
P(RACE)[F catastrophe] > P(SLOWDOWN)[F catastrophe]
  "Race is riskier than slowdown"
```

---

## 6. Example: AI-2027 "Race to AGI" Model

### Phase 1 (Deterministic LTS)

**States** (10-15 key scenarios):
```
S0: Initial (pre-deployment)
S1: Deployed (narrow AI systems)
S2: Scaled (AI at significant economic impact)
S3: Race (uncoordinated acceleration)
S4: Slowdown (coordination attempt)
S5: Theft (weight theft / espionage)
S6: Regulation (government intervention)
S7: Pause (voluntary halt)
S8: Aligned AGI (safe outcome)
S9: Catastrophe (misalignment disaster)
```

**Actions**:
```
DEPLOY, SCALE, RACE, SLOWDOWN, REGULATE, PAUSE, INVEST_SECURITY, NO_OP
```

**Atomic propositions**:
```
{deployed, scaled, racing, theft, regulated, paused, aligned, catastrophe}
```

**Sample transitions**:
```
S0 → S1 [DEPLOY]
S1 → S2 [SCALE]
S2 → S3 [RACE]
S2 → S4 [SLOWDOWN]
S2 → S5 [THEFT]
S2 → S6 [REGULATE]
S4 → S8 [successful coordination → aligned AGI]
S3 → S9 [unaligned race → catastrophe]
```

### Phase 2 (Add Time)

**State**: `(w, t)` where `w ∈ {S0, S1, ...}` and `t ∈ {0, 1, 2, ..., 20}` (quarters)

**Time guards**:
```
(S2, t) → (S5, t+1)  guard: t ∈ [6, 16]  // Theft window
(S0, t) → (S1, t+1)  guard: t ∈ [0, 8]   // Early deployment only
(S2, t) → (S6, t+1)  guard: t ∈ [8, 14]  // Regulation window
```

**Variables**:
```
compute: float      // AI compute scale (0-100)
risk: float         // Misalignment risk (0-1)
trustPublic: float  // Public trust (0-1)
```

### Phase 3 (Add Probabilities)

**Stochastic transitions from S2**:

```
From (S2, t), action NO_OP:
  P(S2 → S3) = 0.20  // 20% chance race starts
  P(S2 → S5) = 0.15  // 15% chance theft occurs
  P(S2 → S6) = 0.10  // 10% chance regulation imposed
  P(S2 → S2) = 0.55  // 55% status quo

From (S2, t), action INVEST_SECURITY:
  P(S2 → S5) = 0.05  // Reduced theft risk
  P(S2 → S2) = 0.85  // Increased stability
```

**Reward function** (optional):
```
R(s, a, s') = {
  +100  if s' = S8 (aligned AGI)
  -100  if s' = S9 (catastrophe)
  -10   if s' = S5 (theft)
  +10   if s' = S6 (regulation)
  0     otherwise
}
```

---

## 7. Implementation Implications

### 7.1 Data Structures (TypeScript)

```ts
// Phase 1: Deterministic LTS
interface LTSModel {
  states: NodeAP[];
  transitions: Array<{
    source: string;
    target: string;
    action: string;
  }>;
  initialState: string;
  atomicProps: string[];
  labeling: Record<string, string[]>;  // state → props
}

// Phase 2: Add time guards
interface TimeIndexedModel extends LTSModel {
  transitions: Array<{
    source: string;
    target: string;
    action: string;
    timeWindow?: { min: number; max: number };
  }>;
}

// Phase 3: Add probabilities
interface MDPModel {
  states: NodeAP[];
  actions: string[];
  transitions: Array<{
    source: string;
    action: string;
    target: string;
    probability: number;
  }>;
  rewards?: Array<{
    source: string;
    action: string;
    target: string;
    value: number;
  }>;
}
```

### 7.2 Simulation Functions

```ts
// Phase 1
function stepDeterministic(
  state: string,
  action: string,
  model: LTSModel
): string {
  // Look up transition, return next state
}

// Phase 2
function stepWithTimeGuard(
  state: { world: string; time: number },
  action: string,
  model: TimeIndexedModel
): { world: string; time: number } | null {
  // Check time guard, advance if valid
}

// Phase 3
function stepStochastic(
  state: string,
  action: string,
  model: MDPModel,
  rng: () => number
): string {
  // Sample from distribution P(·|s,a)
}
```

### 7.3 Property Checking

```ts
// Phase 1: Simple LTL (G, F)
function checkGlobally(
  model: LTSModel,
  predicate: (s: string) => boolean
): boolean {
  // Check all reachable states satisfy predicate
}

function checkEventually(
  model: LTSModel,
  predicate: (s: string) => boolean
): boolean {
  // Check some path reaches state satisfying predicate
}

// Phase 3: PCTL (delegate to Matrix backend)
async function checkPCTL(
  modelId: string,
  property: string
): Promise<{ satisfied: boolean; probability?: number }> {
  return fetch(`/matrix/models/${modelId}/check`, {
    method: 'POST',
    body: JSON.stringify({ property })
  }).then(r => r.json());
}
```

---

## 8. Success Criteria

### Phase 1 (Deterministic LTS)
✅ Can model AI-2027 as 10-15 state FSM
✅ Can visualize in React Flow
✅ Can check G φ, F φ properties
✅ Can simulate deterministic trajectories

### Phase 2 (Time-Indexed Kripke)
✅ State includes explicit time component
✅ Edges have time guards
✅ UI shows "decision window closing" warnings
✅ Can check bounded temporal properties

### Phase 3 (MDP)
✅ Edges have probabilities
✅ Can simulate stochastic trajectories
✅ Can compute P(F catastrophe) via Matrix backend
✅ Can display risk bounds in UI

---

## 9. Related Documentation

- **Tech Design**: [tech_design.md](tech_design.md) - Architecture and stack choices
- **Implementation Plan**: [impl_plan.md](impl_plan.md) - Combined roadmap
- **Full Model Specs**: [../formal_models/README.md](../formal_models/README.md) - Detailed formal definitions
- **Temporal Logics**: [../logics/README.md](../logics/README.md) - Logic specifications
- **Tools Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md) - Library options

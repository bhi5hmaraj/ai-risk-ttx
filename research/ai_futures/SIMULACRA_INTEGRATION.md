# Integrating Formal Verification with Simulacra TTX

## Overview

**Goal**: Add formal model checking and property verification to Simulacra (AI tabletop exercise game) to enable:
- Real-time safety property monitoring during gameplay
- Post-game trajectory analysis against formal specifications
- Policy recommendation via automated verification
- Educational insights about decision consequences

**Approach**: Non-invasive layer on top of existing game, no core gameplay changes.

## Current Simulacra Architecture

### Game Flow
```
LOBBY (role selection)
  ↓
STARTING (scenario generation via LLM)
  ↓
[ACTION PHASE → CONSEQUENCE PHASE] × N rounds
  ↓
END (scoring, outcome)
```

### State Components
```javascript
gameState = {
  phase: "ACTION" | "CONSEQUENCE" | "END",
  round: number,
  coreMetric: number,        // Public score (e.g., "Democratic Legitimacy")
  currentEvent: {...},        // Current scenario description
  eventLog: [...]            // Historical events
}

players = [{
  role: "Election Commissioner" | "Tech CEO" | ...,
  isHuman: boolean,
  hiddenScore: number,       // Secret objective progress
  actions: [...],            // Action choices
  hasSubmittedActions: boolean
}]
```

### Key Mechanics
- **6 roles** with hidden objectives
- **3 action points** per round
- **LLM-generated** scenarios, options, consequences
- **Counterfactual analysis** ("if no one acted...")
- **Action tree visualization** (React Flow graph)

## Formal Model Mapping

### Simulacra → Time-Indexed Kripke

**State space**:
```
S = W × V × T

W = Discrete scenario/phase states
V = Continuous variables (coreMetric, hiddenScores, etc.)
T = Round number (discrete time)
```

**Concrete mapping**:
```javascript
kripkeState = {
  w: `${gameState.phase}_R${gameState.round}`,
  v: {
    coreMetric: gameState.coreMetric,
    hiddenScores: players.map(p => p.hiddenScore),
    actionPointsUsed: sum(players.map(p => p.actions.cost))
  },
  t: gameState.round
}
```

**Transitions**:
```
(w₁, v₁, t) → (w₂, v₂, t+1)

Corresponds to:
  ACTION phase → CONSEQUENCE phase → ACTION phase
  with state updates via LLM-generated consequences
```

**Atomic propositions**:
```
AP = {
  publicCollapse,      // coreMetric ≤ 0
  gameOver,            // phase = END
  cooperationHigh,     // Few competitive actions
  trustLow,            // Many secretive actions
  slowdownChosen,      // Specific policy action taken
  crisisEscalated,     // Event severity increased
  ...
}
```

## Integration Architecture

### Three-Layer Design

```
┌──────────────────────────────────────────────────┐
│ VERIFICATION LAYER (New)                         │
│ - Property checker                               │
│ - Trajectory recorder                            │
│ - Specification library                          │
└──────────────────────────────────────────────────┘
                ↓↑ (observe/query)
┌──────────────────────────────────────────────────┐
│ GAME LOGIC LAYER (Existing)                     │
│ - useGameController                              │
│ - LLM service calls                              │
│ - State management                               │
└──────────────────────────────────────────────────┘
                ↓↑
┌──────────────────────────────────────────────────┐
│ UI LAYER (Existing + Enhancements)              │
│ - Game screens                                   │
│ - Action tree                                    │
│ - Property monitor panel (New)                  │
└──────────────────────────────────────────────────┘
```

### Components

#### 1. Trajectory Recorder (Observer Pattern)

**Purpose**: Capture game execution as formal trace

```typescript
interface TrajectoryRecorder {
  // Record state transitions
  recordTransition(
    from: KripkeState,
    action: PlayerAction[],
    to: KripkeState
  ): void

  // Get full trajectory
  getTrajectory(): KripkeTrace

  // Export for model checker
  exportPRISM(): string
  exportNuSMV(): string
}

class SimulacraTrajectoryRecorder {
  private trace: KripkeState[] = []
  private transitions: Transition[] = []

  onGameStateChange(oldState, newState, actions) {
    const kripkeOld = this.toKripke(oldState)
    const kripkeNew = this.toKripke(newState)

    this.trace.push(kripkeNew)
    this.transitions.push({
      from: kripkeOld,
      to: kripkeNew,
      actions: actions,
      timestamp: Date.now()
    })

    // Check properties in real-time
    this.checkProperties(kripkeNew)
  }
}
```

**Integration point**: Hook into `useGameController` state updates

```javascript
// In useGameController.ts
useEffect(() => {
  if (trajectoryRecorder) {
    trajectoryRecorder.recordTransition(
      previousGameState,
      submittedActions,
      gameState
    )
  }
}, [gameState])
```

#### 2. Property Checker (Runtime Verification)

**Purpose**: Evaluate temporal logic properties on-the-fly

```typescript
interface PropertyChecker {
  // Register properties to monitor
  registerProperty(name: string, spec: TemporalFormula): void

  // Check property against current trace
  check(propertyName: string): VerificationResult

  // Get all violations
  getViolations(): PropertyViolation[]
}

class LTLChecker implements PropertyChecker {
  private properties: Map<string, LTLFormula>
  private trace: KripkeTrace

  check(propertyName: string): VerificationResult {
    const formula = this.properties.get(propertyName)
    const result = evaluateLTL(formula, this.trace)

    return {
      property: propertyName,
      satisfied: result.satisfied,
      witness: result.witness,       // If satisfied
      counterexample: result.counter  // If violated
    }
  }
}
```

**Example properties**:
```javascript
propertyChecker.registerProperty(
  "noPublicCollapse",
  LTL.globally(LTL.not("publicCollapse"))
)

propertyChecker.registerProperty(
  "eventualDecision",
  LTL.eventually(LTL.or("slowdown", "escalation"))
)

propertyChecker.registerProperty(
  "cooperationAfterCrisis",
  LTL.globally(
    LTL.implies("crisisEscalated", LTL.eventually("cooperationHigh"))
  )
)
```

#### 3. Specification Library

**Purpose**: Pre-defined properties for common TTX scenarios

```typescript
const TTXSpecifications = {
  safety: {
    noCollapse: "G ¬publicCollapse",
    maintainTrust: "G (coreMetric ≥ threshold)",
    noDeadlock: "G (EX true)"
  },

  liveness: {
    eventualResolution: "F (gameOver ∨ consensusReached)",
    mustDecide: "F (policyChosen)",
    progressRequired: "G F (round_changed)"
  },

  response: {
    crisisResponse: "G (crisis → F mitigation)",
    trustRecovery: "G (trustLow → F (trustHigh ∨ gameOver))",
    cooperationEmergence: "G (threat → F cooperation)"
  },

  fairness: {
    allRolesParticipate: "G F (role1_acted ∧ role2_acted ∧ ...)",
    balancedInfluence: "G (no_single_role_dominates)",
  }
}
```

#### 4. Property Monitor UI Panel

**Purpose**: Real-time property status display during gameplay

```typescript
interface PropertyMonitorProps {
  properties: TemporalProperty[]
  currentState: KripkeState
  trace: KripkeTrace
  violations: PropertyViolation[]
}

// Visual design (no code, just mockup)
<PropertyMonitorPanel>
  <PropertyStatus
    name="No Public Collapse"
    formula="G ¬publicCollapse"
    status="satisfied"    // or "violated" or "unknown"
    confidence={0.95}
  />

  <PropertyStatus
    name="Crisis Response"
    formula="G (crisis → F mitigation)"
    status="pending"
    remainingRounds={3}   // Until must be satisfied
  />

  <PropertyViolation
    property="Maintain Trust"
    round={4}
    state={...}
    message="Public trust dropped below threshold"
  />
</PropertyMonitorPanel>
```

**Placement**: Sidebar or collapsible panel in GameScreen

## Use Cases

### 1. Real-Time Monitoring (During Gameplay)

**Scenario**: Players making decisions in ACTION phase

**Verification**:
- Check safety properties after each round
- Alert if property about to be violated
- Show "safe region" guidance

**UI Feedback**:
```
┌─────────────────────────────────────┐
│ Property Status                     │
├─────────────────────────────────────┤
│ ✓ Public trust maintained           │
│ ✓ No deadlock scenarios             │
│ ⚠ Crisis response pending (2 rounds)│
│ ✗ Cooperation threshold violated    │
└─────────────────────────────────────┘

Warning: If public score drops below 10,
"No Collapse" property will be violated!
```

### 2. Post-Game Analysis

**Scenario**: After game ends, analyze what happened

**Verification**:
- Check all registered properties against full trace
- Identify critical decision points
- Compare to counterfactual trajectories

**Analysis Output**:
```
Game Trajectory Analysis
========================

Properties Satisfied: 7/10

Violations:
  - "Cooperation Emerges" (Round 3)
    → Players chose competitive actions despite crisis
  - "Trust Recovery" (Round 5)
    → Trust never recovered after major incident

Critical Moments:
  - Round 2: Theft event
    * Property "Maintain Security" at risk
    * If policy X chosen, would have prevented
  - Round 4: Escalation decision
    * Property "Cooperation" violated
    * All paths from here led to poor outcomes

Counterfactual:
  If "INVEST_SECURITY" chosen at Round 2:
    → Theft probability: 45% → 15%
    → Expected outcome: +2 coreMetric
    → Properties preserved: 9/10
```

### 3. Policy Recommendation

**Scenario**: Player asks "What should I do?"

**Verification**:
- For each available action, simulate outcomes
- Check which paths satisfy most properties
- Recommend action maximizing property satisfaction

**UI**:
```
Action Recommendations (Property-Guided)
========================================

Based on temporal property analysis:

1. INVEST_ALIGNMENT (★★★★☆)
   ✓ Preserves "Safety" properties
   ✓ Enables "Recovery" path
   ⚠ May delay "Resolution"

2. SLOWDOWN (★★★☆☆)
   ✓ Satisfies "Caution" property
   ✗ Violates "Progress" requirement

3. ESCALATE (★☆☆☆☆)
   ✗ High risk of "Collapse"
   ✗ Violates "Cooperation"
```

### 4. Educational Insights

**Scenario**: Post-game learning

**Verification**:
- Show which decision patterns led to violations
- Explain temporal logic properties in plain language
- Compare player trajectory to optimal/safe paths

**Educational UI**:
```
Learning Insights
=================

Pattern Detected: "Lone Wolf Strategy"
  → You rarely cooperated with other roles
  → Violated property: "Cooperation Emerges"
  → Result: Poor collective outcome despite personal gains

Temporal Logic Lesson:
  Property: G (crisis → F cooperation)
  English: "Whenever crisis occurs, cooperation must eventually follow"

  Your Game: Crisis at Round 2, no cooperation until Round 5
  Result: ✗ Violation - too late

Counterfactual Learning:
  If cooperation at Round 3:
    → Property would be satisfied
    → Public score would be +15 higher
    → Win condition more likely
```

## Implementation Strategy

### Phase 1: Basic Trajectory Recording

**Week 1-2**:
1. Create `TrajectoryRecorder` class
2. Hook into `useGameController` state changes
3. Implement Kripke state mapping
4. Store trajectory in game state

**Deliverable**: Full game trace captured

### Phase 2: Simple Property Checking

**Week 3-4**:
1. Implement basic LTL evaluator
2. Add safety property checks (G ¬bad)
3. Real-time property monitoring
4. Simple UI indicator (✓/✗)

**Deliverable**: Live property status

### Phase 3: Rich UI Integration

**Week 5-6**:
1. Property monitor panel component
2. Violation alerts and warnings
3. Property explanation tooltips
4. Visual trajectory+property view

**Deliverable**: Full property monitoring UI

### Phase 4: Post-Game Analysis

**Week 7-8**:
1. End-game property report
2. Counterfactual analysis
3. Critical decision identification
4. Educational insights generation

**Deliverable**: Learning-focused analysis

### Phase 5: Policy Recommendation

**Week 9-10**:
1. Action simulation framework
2. Property-based ranking
3. Recommendation UI
4. Explanation generation

**Deliverable**: AI-assisted decision support

## Technical Considerations

### Performance

**Challenge**: LTL checking can be expensive

**Solutions**:
- **Incremental checking**: Only evaluate new state, not full trace
- **Property caching**: Memoize sub-formula results
- **Lazy evaluation**: Only check on demand (not every state)
- **Async checking**: Run verification in web worker

```javascript
// Incremental LTL checking
class IncrementalLTLChecker {
  private cache: Map<Formula, EvaluationState>

  checkIncremental(newState: KripkeState, formula: LTLFormula) {
    const cached = this.cache.get(formula)

    // Only evaluate parts affected by new state
    return updateEvaluation(cached, newState, formula)
  }
}
```

### Specification Authoring

**Challenge**: Writing LTL formulas is hard

**Solutions**:
- **Property templates**: Pre-built formulas for common patterns
- **Natural language**: "Always avoid X" → `G ¬X`
- **Visual builder**: Drag-and-drop formula construction
- **Examples library**: Learn from TTX-specific specs

### Integration with LLM

**Opportunity**: Use LLM for specification assistance

```javascript
async function generateProperty(naturalLanguage: string): LTLFormula {
  const prompt = `
    Convert this requirement to LTL formula:
    "${naturalLanguage}"

    Available propositions: ${Object.keys(atomicPropositions)}

    Output LTL formula:
  `

  const formula = await llm.complete(prompt)
  return parseLTL(formula)
}
```

**Example**:
```
User: "Players should cooperate after a crisis"
LLM:  G (crisis → F cooperation)
```

## Non-Goals (Out of Scope)

**Don't**:
- Modify core game mechanics
- Replace human decision-making with AI
- Require players to understand formal logic
- Add complexity to basic gameplay

**Do**:
- Provide optional verification layer
- Make properties understandable (plain English + logic)
- Enable learning through formal analysis
- Support facilitators with insights

## Success Metrics

**MVP success** if:
1. ✅ Every game produces valid Kripke trace
2. ✅ 5-10 safety properties checked in real-time
3. ✅ Property violations displayed to players
4. ✅ Post-game report shows property analysis

**Full success** if:
5. ✅ Policy recommendations based on properties
6. ✅ Educational insights generated automatically
7. ✅ Players understand temporal logic basics
8. ✅ Facilitators use properties for debriefing

## Example Integration Workflow

### Before Game

**Facilitator** selects properties to monitor:
```
☑ No public collapse (safety)
☑ Crisis response within 3 rounds (liveness)
☑ Cooperation after escalation (response)
☐ All roles participate equally (fairness)
```

### During Game

**Round 3**: Player about to submit action

```
[Property Monitor Panel]
⚠ Warning: Choosing "ESCALATE" risks violating
   "Crisis Response" property!

   Safer alternatives:
   • COOPERATE: ✓ Preserves all properties
   • INVEST: ✓ Satisfies safety requirements
```

### After Game

**End Screen** shows formal analysis:

```
Trajectory Analysis
===================

Your path: S0 → S2 → S4 → S7 → S10 (END)

Properties:
✓ No public collapse (satisfied all 5 rounds)
✗ Crisis response (violated at round 3)
✓ Cooperation (achieved at round 4)

Compare to optimal path:
S0 → S1 → S3 → S6 → S11 (END)
  → Would satisfy all properties
  → Different decision at round 2 critical
```

## References

- Formal models: `/research/ai_futures/formal_models/`
- Temporal logics: `/research/ai_futures/logics/`
- Kripke structures: `/research/ai_futures/kripke_models/`
- Simulacra code: `/src/`, `/components/game/`
- Summary: `/research/ai_futures/FORMAL_MODELING_SUMMARY.md`

---

**Next Steps**: Prototype trajectory recorder, implement basic LTL checker, design UI mockups

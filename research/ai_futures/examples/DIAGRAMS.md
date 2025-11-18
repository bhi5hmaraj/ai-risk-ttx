# Formal Model Visualizations

This document contains visual diagrams for the formal models. The diagrams use Mermaid syntax and are rendered automatically on GitHub.

---

## 1. Simple LTS: AI Development Lifecycle

**Model**: Labeled Transition System (deterministic)

**Description**: A simple finite-state machine showing AI development from research through deployment to terminal states (aligned or catastrophe).

```mermaid
stateDiagram-v2
    [*] --> initial
    initial --> research: start_research
    research --> development: begin_development
    development --> testing: start_testing

    testing --> deployed: tests_pass
    testing --> development: tests_fail

    deployed --> scaled: scale_up
    deployed --> initial: shutdown

    scaled --> aligned: achieve_alignment
    scaled --> catastrophe: failure_occurs

    development --> catastrophe: critical_failure
    testing --> catastrophe: critical_failure
    deployed --> catastrophe: critical_failure

    aligned --> [*]
    catastrophe --> [*]

    note right of aligned
        Success state
        +100 reward
    end note

    note right of catastrophe
        Failure state
        -100 reward
    end note
```

**Key properties**:
- **States**: 8 total (initial, research, development, testing, deployed, scaled, aligned, catastrophe)
- **Transitions**: Deterministic (each action leads to exactly one next state)
- **Terminal states**: aligned (success), catastrophe (failure)

**Properties to check**:
- Safety: `G ¬catastrophe` (never reach catastrophe)
- Liveness: `F aligned` (eventually reach alignment)
- Response: `G (testing → F (deployed ∨ development))` (tests always lead to deployment or retry)

---

## 2. Time-Indexed Model: AI Race with Deadlines

**Model**: Time-Indexed Kripke Structure (state = world × time)

**Description**: AI race scenario with temporal constraints. Time is measured in quarters from 2024-Q1 (t=0) to 2028-Q4 (t=20).

```mermaid
stateDiagram-v2
    [*] --> initial: t=0 (2024-Q1)

    initial --> deployed: deploy_ai<br/>[guard: t < 8]
    deployed --> racing: start_race<br/>[guard: 4 ≤ t < 16]
    deployed --> regulated: impose_regulation<br/>[guard: 8 ≤ t ≤ 16]
    racing --> regulated: impose_regulation<br/>[guard: 8 ≤ t ≤ 16]

    regulated --> aligned: achieve_coordination
    racing --> catastrophe: catastrophic_failure<br/>[guard: t ≥ 12]

    aligned --> [*]
    catastrophe --> [*]

    note right of deployed
        Deployment deadline:
        must happen before
        2026-Q1 (t < 8)
    end note

    note right of regulated
        Regulation window:
        2026-2028
        (8 ≤ t ≤ 16)
    end note

    note right of catastrophe
        Late-stage failure:
        after 2027-Q1
        (t ≥ 12)
    end note
```

**Time guards**:
- `deploy_ai`: t < 8 (before 2026-Q1)
- `start_race`: 4 ≤ t < 16 (2025-2028)
- `impose_regulation`: 8 ≤ t ≤ 16 (2026-2028)
- `catastrophic_failure`: t ≥ 12 (after 2027-Q1)

**Properties to check**:
- Bounded safety: `G_{t<16} ¬catastrophe` (safe before 2028)
- Deadline: `F_{t≤8} deployed` (deploy by 2026-Q1)
- Response: `G (racing → F_{t≤4} regulated)` (race leads to regulation within 4 quarters)

---

## 3. Simple MDP: AI Safety Under Uncertainty

**Model**: Markov Decision Process (stochastic transitions)

**Description**: AI deployment decisions with probabilistic outcomes. Different actions lead to different probability distributions over next states.

```mermaid
stateDiagram-v2
    [*] --> initial

    initial --> deployed: deploy<br/>p=0.70
    initial --> misaligned: deploy<br/>p=0.20
    initial --> catastrophe: deploy<br/>p=0.10

    initial --> monitored: deploy_safe<br/>p=0.85

    deployed --> deployed: continue<br/>p=0.60
    deployed --> misaligned: continue<br/>p=0.30
    deployed --> catastrophe: continue<br/>p=0.10
    deployed --> shutdown: emergency_shutdown<br/>p=1.00

    monitored --> monitored: continue<br/>p=0.70
    monitored --> safe_agi: continue<br/>p=0.10
    monitored --> misaligned: continue<br/>p=0.15
    monitored --> catastrophe: continue<br/>p=0.05
    monitored --> shutdown: emergency_shutdown<br/>p=1.00

    misaligned --> misaligned: continue<br/>p=0.20
    misaligned --> catastrophe: continue<br/>p=0.80
    misaligned --> shutdown: emergency_shutdown<br/>p=0.90
    misaligned --> catastrophe: emergency_shutdown<br/>p=0.10

    safe_agi --> [*]
    catastrophe --> [*]
    shutdown --> [*]

    note right of safe_agi
        Success: +100
        P(safe_agi | cautious) ≈ 0.10
    end note

    note right of catastrophe
        Failure: -100
        P(catastrophe | aggressive) ≈ 0.45
    end note

    note right of monitored
        Safe deployment:
        85% from initial
        Lower risk paths
    end note
```

**Actions and Probabilities**:

From `initial`:
- `deploy`: 70% deployed, 20% misaligned, 10% catastrophe
- `deploy_safe`: 85% monitored, 10% misaligned, 5% catastrophe

From `deployed` (no monitoring):
- `continue`: 60% deployed, 30% misaligned, 10% catastrophe
- `emergency_shutdown`: 100% shutdown

From `monitored` (with safety):
- `continue`: 70% monitored, 10% safe_agi, 15% misaligned, 5% catastrophe
- `emergency_shutdown`: 100% shutdown

**Policy Comparison** (estimated via Monte Carlo, 1000 runs):

| Policy | P(safe_agi) | P(catastrophe) | P(shutdown) |
|--------|-------------|----------------|-------------|
| **Aggressive** | ~0.06 | ~0.45 | ~0.15 |
| **Cautious** | ~0.10 | ~0.20 | ~0.55 |

**PCTL Properties**:
- `P≤0.20[F catastrophe]` - "At most 20% risk of catastrophe"
  - ✗ Violated by aggressive policy (45%)
  - ✓ Satisfied by cautious policy (20%)

- `P≥0.10[F safe_agi]` - "At least 10% chance of safe AGI"
  - ✗ Violated by aggressive policy (6%)
  - ✓ Satisfied by cautious policy (10%)

---

## 4. Comparison: LTS vs Time-Indexed vs MDP

```mermaid
graph LR
    A[LTS<br/>Deterministic FSM] --> B[Time-Indexed<br/>+ Time Guards]
    B --> C[MDP<br/>+ Probabilities]

    A -.->|"Example:<br/>Coffee Machine"|A_ex["States: idle, brewing, ready<br/>Actions: insert_coin, press_button<br/>Deterministic transitions"]

    B -.->|"Example:<br/>AI Race"|B_ex["State = (world, time)<br/>Guards: t < deadline<br/>Still deterministic"]

    C -.->|"Example:<br/>AI Safety"|C_ex["Actions have probabilities<br/>P(catastrophe | deploy) = 0.10<br/>Can compute risk bounds"]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1f5
```

**Progressive Complexity**:

| Feature | LTS | Time-Indexed | MDP |
|---------|-----|--------------|-----|
| **States** | Discrete | (World, Time) | Discrete |
| **Transitions** | Deterministic | Deterministic + guards | Probabilistic |
| **Time** | Implicit | Explicit discrete | Implicit/Discrete |
| **Uncertainty** | None | None | Probabilistic |
| **Properties** | LTL, CTL | Bounded LTL/CTL | PCTL |
| **Complexity** | Low | Medium | High |
| **Tools** | Any FSM library | Custom / Kripke | PRISM, Storm |

---

## 5. Model Selection Guide

```mermaid
flowchart TD
    Start([Start: Choose Model])

    Start --> Q1{Need<br/>probabilities?}

    Q1 -->|Yes| Q2{Need<br/>time constraints?}
    Q1 -->|No| Q3{Need<br/>time constraints?}

    Q2 -->|Yes| MDP_Time[Time-Indexed MDP]
    Q2 -->|No| MDP[MDP<br/>Use: PRISM/Storm]

    Q3 -->|Yes| TimeKripke[Time-Indexed Kripke<br/>Use: Custom logic]
    Q3 -->|No| LTS[LTS<br/>Use: FSM libraries]

    LTS -.->|Example| LTS_ex[Simple workflows,<br/>pedagogical models]
    TimeKripke -.->|Example| TK_ex[Deadline scenarios,<br/>bounded properties]
    MDP -.->|Example| MDP_ex[Risk analysis,<br/>policy optimization]
    MDP_Time -.->|Example| MDPT_ex[Full complexity:<br/>time + uncertainty]

    style Start fill:#e1e1e1
    style LTS fill:#a8d5a8
    style TimeKripke fill:#ffd580
    style MDP fill:#ff9999
    style MDP_Time fill:#cc99ff
```

**Decision criteria**:

1. **Start simple** (LTS)
   - Perfect for pedagogical examples
   - Fast iteration, immediate visualization
   - Good for validating structure

2. **Add time** (Time-Indexed)
   - When deadlines matter
   - When decision windows exist
   - Still deterministic = easier to debug

3. **Add uncertainty** (MDP)
   - When outcomes are probabilistic
   - When need risk quantification
   - Requires model checking tools

4. **Full complexity** (Time-Indexed MDP)
   - Only when both time AND uncertainty critical
   - Requires specialized tools (Storm with CSL)

---

## Implementation Notes

### For MVP (Phases 1-3)

**Phase 1**: Implement LTS (Week 1)
- Use JSSM/XState or simple custom code
- Visualize with React Flow
- Check basic LTL properties (G, F)

**Phase 2**: Add time (Week 2)
- Extend state to `(world, t)`
- Add time guards to transitions
- Check bounded properties (G_{t≤k}, F_{t≤k})

**Phase 3**: Add probabilities (Weeks 3-5)
- Define P(s'|s,a) for transitions
- Implement Monte Carlo simulation
- (Optional) Integrate PRISM/Storm for exact PCTL

### Visualization Tools

- **Frontend (Phase 1-2)**: React Flow
- **Python examples**: Mermaid (this doc) or transitions+graphviz
- **Phase 3**: PRISM GUI or custom vis with probability labels

---

## References

- **LTS Spec**: [../formal_models/current_lts_model.md](../formal_models/current_lts_model.md)
- **Time-Indexed Spec**: [../kripke_models/time_indexed_kripke.md](../kripke_models/time_indexed_kripke.md)
- **MDP Spec**: [../formal_models/mealy_mdp_model.md](../formal_models/mealy_mdp_model.md)
- **Implementation Plan**: [../mvp_docs/impl_plan.md](../mvp_docs/impl_plan.md)

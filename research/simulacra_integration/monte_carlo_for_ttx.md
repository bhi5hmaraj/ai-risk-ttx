# Monte Carlo for Simulacra TTX: Risk Distributions for Gameplay

**Purpose**: How Monte Carlo simulation fits into the Simulacra tabletop exercise game.

**Key insight**: Simulacra tells **one story** (the game you played). Monte Carlo tells you **how typical that story was** and **what else could have happened**.

---

## The Problem

### Current Simulacra Architecture

```
Player actions → LLM generates consequence → One outcome

Example game:
- Round 1: Player invests in alignment → Trust increases to 75%
- Round 2: Incident occurs → Trust drops to 60%
- Round 3: Race mode triggered → Catastrophe at round 5
```

**Question**: Was catastrophe inevitable? Or did we get unlucky?

**Without MC**: No way to know. We only saw ONE trajectory.

**With MC**: "I simulated 1000 games with similar starting conditions:
- 334 ended in catastrophe (33%)
- 156 reached aligned outcome (16%)
- Your game was in the 67th percentile for trust decay speed"

---

## How MC Fits into Simulacra

### Three Levels of Integration

**Level 1: Post-Game Analysis** (Easiest)
- Player finishes Simulacra game
- Click "Analyze this outcome"
- System runs 100-1000 simulations with similar setup
- Shows: "Your outcome occurred in 28% of simulations"

**Level 2: Pre-Game Exploration** (Medium)
- Before starting, player explores scenario space
- "If I prioritize safety vs speed, what's the risk?"
- Shows distributions, not single stories
- Player makes informed choice about strategy

**Level 3: During-Game Risk Display** (Advanced)
- Each round, show "risk meter"
- "Based on current state, 42% of futures lead to catastrophe"
- Updates in real-time as state changes
- Player sees how their actions shift probabilities

---

## Level 1: Post-Game Analysis

### User Experience

**After game ends**:
```
┌─ Game Over ──────────────────────────────────────────┐
│ Outcome: Catastrophe (Round 5)                       │
│ Final Trust: 42%                                     │
│ Final Alignment: 14%                                 │
│                                                       │
│ [View Action Tree] [Compare to Other Outcomes]       │
└──────────────────────────────────────────────────────┘

Click "Compare to Other Outcomes":

┌─ Monte Carlo Analysis ───────────────────────────────┐
│                                                       │
│ We simulated 1000 games starting from similar        │
│ conditions to yours:                                  │
│                                                       │
│ Your outcome (Catastrophe):         33.4%            │
│ Aligned outcome:                    15.6%            │
│ Slowdown (coordination):             8.9%            │
│ Still in race mode:                 38.7%            │
│ Back to baseline:                    3.4%            │
│                                                       │
│ Your strategy was:                                    │
│ - More aggressive than 68% of simulations            │
│ - Reached catastrophe faster than median (round 5    │
│   vs median round 6.2)                               │
│                                                       │
│ Key driver: Low initial trust (65% vs avg 70%)       │
│                                                       │
│ [View Alternative Scenarios] [Replay with Different  │
│                                Strategy]              │
└───────────────────────────────────────────────────────┘
```

### Implementation

**Step 1**: Extract player's game state
```typescript
const playerGame = {
  initialState: {
    compute: 26.0,
    alignment: 0.15,
    trust: 0.65  // Player's starting conditions
  },
  actions: [
    { round: 1, player: "human", action: "invest_compute" },
    { round: 2, player: "ai_opponent", action: "race" },
    // ...
  ],
  finalState: {
    mode: "catastrophe",
    compute: 30.2,
    alignment: 0.14,
    trust: 0.42
  }
}
```

**Step 2**: Call Matrix Monte Carlo API
```typescript
const mcResults = await fetch('/api/matrix/monte-carlo', {
  method: 'POST',
  body: JSON.stringify({
    scenario: "ai_2027",
    initial_state: playerGame.initialState,
    horizon: 5,  // Number of rounds played
    n_runs: 1000,
    uncertainties: {
      // Vary slightly around player's starting point
      compute: { dist: "normal", mean: 26.0, std: 0.3 },
      trust: { dist: "normal", mean: 0.65, std: 0.05 },
      // Also vary opponent behavior
      opponent_aggressiveness: { dist: "uniform", low: 0.3, high: 0.7 }
    }
  })
});

const distribution = mcResults.outcomes;
```

**Step 3**: Display results
```typescript
// Where does player's outcome rank?
const playerOutcome = "catastrophe";
const outcomeProb = distribution[playerOutcome];

const percentile = calculatePercentile(
  playerGame.finalState,
  distribution.allFinalStates
);

displayAnalysis({
  probability: outcomeProb,
  percentile: percentile,
  alternatives: distribution,
  keyDrivers: mcResults.sensitivity
});
```

---

## Level 2: Pre-Game Scenario Exploration

### User Experience

**Before game starts**:
```
┌─ Scenario Setup ──────────────────────────────────────┐
│                                                        │
│ Choose your strategy:                                  │
│                                                        │
│ ○ Safety-First (invest 70% in alignment)              │
│   Risk profile:                                        │
│   - P(Catastrophe):     22% ████                       │
│   - P(Aligned):         35% ███████                    │
│   - Expected time to AGI: 8.5 years                    │
│                                                        │
│ ○ Balanced (invest 40% in alignment)                  │
│   Risk profile:                                        │
│   - P(Catastrophe):     33% ██████                     │
│   - P(Aligned):         19% ████                       │
│   - Expected time to AGI: 7.2 years                    │
│                                                        │
│ ○ Race-to-AGI (invest 10% in alignment)               │
│   Risk profile:                                        │
│   - P(Catastrophe):     58% ███████████                │
│   - P(Aligned):          8% ██                         │
│   - Expected time to AGI: 5.8 years                    │
│                                                        │
│ Each profile is based on 1000 Monte Carlo simulations  │
│                                                        │
│ [Start Game] [Customize Strategy]                     │
└────────────────────────────────────────────────────────┘
```

### Implementation

**Precompute strategy profiles**:
```python
# Backend: Precompute common strategies
strategies = {
  "safety_first": {"alignment_investment": 0.7, "cooperation": 0.8},
  "balanced": {"alignment_investment": 0.4, "cooperation": 0.6},
  "race": {"alignment_investment": 0.1, "cooperation": 0.3}
}

profiles = {}
for name, params in strategies.items():
    results = monte_carlo(
        simulator=ai_governance_sim,
        policy=params,
        n_runs=1000
    )
    profiles[name] = {
        "catastrophe_prob": results['catastrophe'].mean(),
        "aligned_prob": results['aligned'].mean(),
        "expected_time_to_agi": results['time_to_agi'].mean(),
        "trust_trajectory": results['trust'].median(axis=0)  # Median trajectory
    }

# Cache and serve to frontend
```

**Display interactive comparison**:
```typescript
// Frontend: Let user explore
function showStrategyComparison(strategies) {
  const chart = new Chart({
    type: 'bar',
    data: {
      labels: Object.keys(strategies),
      datasets: [
        {
          label: 'P(Catastrophe)',
          data: Object.values(strategies).map(s => s.catastrophe_prob),
          backgroundColor: '#d62728'
        },
        {
          label: 'P(Aligned)',
          data: Object.values(strategies).map(s => s.aligned_prob),
          backgroundColor: '#2ca02c'
        }
      ]
    }
  });
}
```

---

## Level 3: Real-Time Risk Display

### User Experience

**During gameplay**:
```
┌─ Round 3: Your Turn ──────────────────────────────────┐
│                                                        │
│ Current State:                                         │
│ ├─ Compute: 27.2 FLOP                                 │
│ ├─ Alignment: 18%                                     │
│ └─ Trust: 58%                                         │
│                                                        │
│ Risk Assessment (live):                                │
│ ┌────────────────────────────────────────────────┐    │
│ │ Catastrophe Risk: 42%  ████████████            │    │
│ │ ↑ +8% from last round                          │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ Your Actions:                                          │
│                                                        │
│ ⚡ Accelerate Research (+$20B compute)                │
│    → Catastrophe risk increases to 48% (model pred.)  │
│                                                        │
│ 🛡️ Invest in Safety (+$20B alignment)                │
│    → Catastrophe risk decreases to 36% (model pred.)  │
│                                                        │
│ 🤝 Push for Treaty (cooperation focus)                │
│    → Catastrophe risk decreases to 34% (model pred.)  │
│                                                        │
│ [Select Action]                                        │
└────────────────────────────────────────────────────────┘
```

### Implementation

**Real-time "what-if" MC**:
```typescript
// When player hovers over action, run quick MC
async function predictRiskChange(currentState, proposedAction) {
  // Fast MC with 100 runs (< 500ms)
  const results = await fetch('/api/matrix/quick-mc', {
    method: 'POST',
    body: JSON.stringify({
      current_state: currentState,
      proposed_action: proposedAction,
      n_runs: 100,  // Fast
      horizon: 3    // Next 3 rounds only
    })
  });

  return {
    catastrophe_prob_delta: results.catastrophe_prob - currentState.risk,
    aligned_prob_delta: results.aligned_prob - currentState.aligned_prob
  };
}

// Update UI in real-time
async function onActionHover(action) {
  const prediction = await predictRiskChange(gameState, action);
  
  updateRiskMeter({
    current: gameState.catastrophe_risk,
    predicted: gameState.catastrophe_risk + prediction.catastrophe_prob_delta,
    change: prediction.catastrophe_prob_delta
  });
}
```

**Optimization**: Cache common action predictions

---

## Integration with Existing Simulacra Architecture

### Current Flow

```
User Action → LLM (generate consequence) → Update State → Display Narrative
```

### With MC Integration

```
User Action → {
  1. Update formal state (Matrix)
  2. Run quick MC (100 samples) for risk update
  3. LLM generates narrative (grounded in MC results)
} → Display {Narrative + Risk Metrics}
```

### API Contract

**Simulacra → Matrix**:
```typescript
POST /api/matrix/simulacra/step

Request:
{
  state: {
    tick: 3,
    mode: "baseline",
    compute: 26.5,
    alignment: 0.18,
    trust: 0.65
  },
  actions: [
    { player: "human", action: "invest_alignment", amount: 10e9 },
    { player: "ai_1", action: "invest_compute", amount: 5e9 }
  ],
  mc_options: {
    enabled: true,
    n_runs: 100,  // Quick for real-time
    horizon: 5    // Next 5 rounds
  }
}

Response:
{
  new_state: { ... },
  transition: { from: "baseline", to: "race" },  // If any
  risk_metrics: {
    catastrophe_prob: 0.42,
    catastrophe_prob_change: +0.08,  // Vs previous round
    aligned_prob: 0.15,
    time_to_agi_median: 65,
    time_to_agi_range: [38, 105]
  },
  narrative_guidance: {
    tone: "urgent",  // Mode is "race"
    suggested_themes: ["arms_race_dynamics", "trust_erosion"]
  },
  alternative_actions: [
    {
      action: "invest_safety",
      predicted_catastrophe_prob: 0.36  // Lower!
    }
  ]
}
```

**Simulacra uses this to**:
1. Update game state (deterministic)
2. Show risk meter (from MC)
3. Generate narrative (LLM grounded in MC insights)

---

## Use Cases

### 1. Teaching Tool

**Scenario**: Classroom using Simulacra to teach AI governance

**With MC**:
- Students play game → get one outcome
- Then explore: "What if we'd chosen differently?"
- MC shows: "Safety investment reduces catastrophe from 45% to 28%"
- **Learning**: Quantitative policy comparison, not just storytelling

### 2. Policy Analysis

**Scenario**: Think tank exploring AI race dynamics

**With MC**:
- Set up realistic initial conditions
- Run 10,000 simulations under different policy regimes
- Identify: "Initial trust matters more than compute restrictions" (Sobol analysis)
- **Output**: Evidence-based policy recommendations

### 3. Red-Teaming

**Scenario**: Testing catastrophe scenarios

**With MC**:
- Conditional analysis: "In what conditions does catastrophe occur?"
- Find: "Catastrophe typically needs: early incident + low trust + high growth"
- **Insight**: Focus defenses on these conjunctions

### 4. Player Skill Assessment

**Scenario**: Evaluating how well a player did

**With MC**:
- Compare player's outcome to distribution
- "You achieved aligned outcome, which only 16% of players do from this starting point"
- **Feedback**: Data-driven performance evaluation

---

## Computational Considerations

### Latency Requirements

**Post-game analysis**: Can be slow (1-10 seconds for 1000 runs)
**Pre-game exploration**: Precompute common strategies, cache
**Real-time risk display**: Must be fast (<500ms)

### Optimization Strategies

**1. Tiered MC**
```
Real-time: 100 runs (sufficient for approximate risk)
Post-game: 1000 runs (accurate distributions)
Research: 10,000 runs (rare events, sensitivity)
```

**2. Precomputation**
```python
# Precompute risk surfaces
trust_grid = np.linspace(0.3, 0.9, 10)
compute_grid = np.linspace(24, 30, 10)

risk_surface = {}
for trust in trust_grid:
    for compute in compute_grid:
        results = monte_carlo(initial_state={trust, compute}, n=1000)
        risk_surface[(trust, compute)] = results['catastrophe'].mean()

# Lookup at runtime (fast!)
def get_risk(state):
    return interpolate(risk_surface, state.trust, state.compute)
```

**3. Approximation Models**
```python
# Train fast surrogate model on MC data
from sklearn.ensemble import RandomForestRegressor

# Generate training data from MC
X_train = []  # [trust, compute, alignment, ...]
y_train = []  # catastrophe risk

for _ in range(10000):
    state = sample_state()
    risk = monte_carlo(state, n=1000)['catastrophe'].mean()
    X_train.append(state_to_features(state))
    y_train.append(risk)

# Train surrogate
surrogate = RandomForestRegressor()
surrogate.fit(X_train, y_train)

# Use for real-time predictions (microseconds!)
predicted_risk = surrogate.predict([current_state])
```

---

## Data Flow

```
┌─ Simulacra (Frontend) ────────────────────────────────┐
│ Game UI + Narrative + Risk Display                    │
└────────────────────────────────────────────────────────┘
           ↓                            ↑
    [User actions]              [Narrative + Risk]
           ↓                            ↑
┌─ Simulacra Server (Node.js/Vercel) ───────────────────┐
│ - Manage game state                                    │
│ - Call LLM for narrative                              │
│ - Call Matrix for formal state + MC                   │
└────────────────────────────────────────────────────────┘
           ↓                            ↑
     [State update]              [New state + MC]
           ↓                            ↑
┌─ Matrix API (Python/FastAPI) ─────────────────────────┐
│ - Formal state tracking (HA/SD)                       │
│ - Monte Carlo simulation                              │
│ - Sensitivity analysis                                │
└────────────────────────────────────────────────────────┘
           ↓                            ↑
    [Simulation]                  [Results]
           ↓                            ↑
┌─ Matrix Core ──────────────────────────────────────────┐
│ SystemDynamicsAdapter / HybridAutomatonAdapter         │
└────────────────────────────────────────────────────────┘
```

---

## Narrative Grounding

**Key principle**: LLM generates story, Matrix provides truth

### Without Matrix/MC

**LLM prompt**:
```
The player invested in AI safety. Generate the consequence.
```

**LLM output** (unconstrained):
```
"Your massive investment in AI safety completely eliminates all risk.
The world is saved! Trust soars to 100%."
```

**Problem**: Overly optimistic, not grounded in formal model

### With Matrix/MC

**Simulacra prompt to Matrix**:
```python
{
  "action": "invest_safety",
  "amount": 10e9,
  "current_state": { compute: 26.5, alignment: 0.15, trust: 0.65 }
}
```

**Matrix response**:
```python
{
  "new_state": { compute: 26.6, alignment: 0.18, trust: 0.68 },
  "mc_results": {
    "catastrophe_prob": 0.36,  # Decreased from 0.42
    "catastrophe_prob_change": -0.06
  },
  "narrative_guidance": {
    "tone": "cautiously_optimistic",
    "key_facts": [
      "Alignment improved +3%",
      "Catastrophe risk reduced by 6 percentage points",
      "Still 36% chance of catastrophe remains"
    ]
  }
}
```

**LLM prompt** (now grounded):
```
The player invested $10B in AI safety.

Formal model results:
- Alignment increased from 15% to 18%
- Trust increased from 65% to 68%
- Catastrophe risk decreased from 42% to 36% (6pp reduction)

Tone: cautiously optimistic
Key facts: Alignment improved, risk reduced but still significant

Generate a narrative consequence that reflects these outcomes.
Do NOT over-promise - 36% catastrophe risk still exists.
```

**LLM output** (grounded):
```
"Your investment in AI safety shows promise. Alignment research
makes modest but meaningful progress, and the public appreciates
the commitment to safety. Catastrophe risk has decreased, but
significant uncertainty remains. Other actors watch closely to
see if you'll maintain this approach or return to racing..."
```

**Benefit**: Narrative is consistent with formal model, not just vibes

---

## Related Documentation

- [../monte_carlo/README.md](../monte_carlo/README.md) - Monte Carlo overview
- [../monte_carlo/examples.md](../monte_carlo/examples.md) - Python examples
- [../matrix/views/README.md](../matrix/views/README.md) - Simulacra View specification
- [../matrix/adapters/README.md](../matrix/adapters/README.md) - Matrix simulation adapters
- [./evals/discrete_time_modeling.md](./evals/discrete_time_modeling.md) - Discrete-time foundation

---

## Implementation Roadmap

**Phase 1** (MVP): Post-game analysis
- After game, click "Analyze outcome"
- Run 1000 MC simulations
- Show: "Your outcome occurred in X% of cases"

**Phase 2**: Pre-game exploration
- Before game, explore strategy risk profiles
- Precomputed MC for common strategies

**Phase 3**: Real-time risk display
- During game, show live catastrophe probability
- Quick MC (100 runs) updates each round

**Phase 4**: Action prediction
- Hover over action → see predicted risk change
- "If you do X, risk will change to Y%"

**Phase 5**: Full integration
- MC results ground LLM narratives
- Sensitivity analysis identifies key uncertainties
- Conditional analysis shows paths to catastrophe/alignment

---

## Summary

**Monte Carlo for Simulacra** = Turn "one story" into "distribution of possible stories"

**Three integration levels**:
1. Post-game: "How typical was your outcome?"
2. Pre-game: "What's the risk profile of this strategy?"
3. Real-time: "What's the current catastrophe probability?"

**Technical approach**: Matrix API provides formal state + MC, Simulacra consumes for risk display + narrative grounding

**Key benefit**: Players make **informed decisions** with **quantified uncertainty**, not just vibes

**Next step**: Implement Level 1 (post-game analysis) as proof-of-concept.

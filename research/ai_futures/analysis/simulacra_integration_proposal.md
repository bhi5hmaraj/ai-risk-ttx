# Simulacra Integration Proposal: AI2027 → Game Mechanics

## Executive Summary

This document maps the AI2027 causal DAG analysis to concrete Simulacra game mechanics, following the principle: **epistemic confidence determines constraint type**.

- **High-confidence links (>0.6)** → Hard constraints (deterministic game rules)
- **Medium-confidence links (0.3-0.6)** → Soft constraints (probabilistic events, player-influenced)
- **Low-confidence links (<0.3)** → Player agency (strategic choices determine outcomes)

## Constraint Mapping

### Hard Constraints (Deterministic Game Rules)

#### 1. Compute Scaling (Confidence: 0.60)
**Evidence:** Historical trend 2012-2024, well-documented by Epoch AI

**Game Mechanic:**
```
RULE: Capability curve advances automatically each round
- Base rate: +0.5 capability points per round (6-month game turns)
- Modifiers: Player investments can accelerate (+0.2) or slow (-0.1)
- CANNOT be reversed or stopped completely
```

**Player Actions:**
- Invest in compute infrastructure (accelerate)
- Support compute governance (decelerate slightly)
- Cannot: Stop scaling entirely

**Why hard constraint:** Empirically grounded, no plausible scenario where compute stops scaling in 2025-2027 timeframe.

---

#### 2. Race Dynamics Trigger (Confidence: 0.70)
**Evidence:** Historical precedent (nuclear, space races), game theory

**Game Mechanic:**
```
RULE: If capability_level > THRESHOLD (GPT-5 level):
  - Race_Pressure = f(US_China_Relations, Public_Awareness, Espionage_Events)
  - If Race_Pressure > 0.6:
      → Enter RACE state (safety shortcuts, accelerated timelines)
```

**Player Actions:**
- Demonstrate capabilities publicly (increases race pressure)
- Conceal progress (reduces awareness, buys time)
- Diplomatic actions (modify US-China relations)

**Why hard constraint:** Game-theoretic dynamics are robust, precedent is strong.

---

### Soft Constraints (Probabilistic, Player-Influenced)

#### 3. Algorithmic Progress (Confidence: 0.40)
**Evidence:** 2012-2024 trend, but sustainability contested

**Game Mechanic:**
```
EVENT: Each round, roll for algorithmic breakthrough
- Base probability: 0.5 (reflects moderate confidence)
- Modifiers:
  - +0.2 if player invests in ML research
  - -0.1 if "data wall" event triggers
  - -0.2 if transformer architecture plateau event triggers
```

**Player Actions:**
- Fund research (increase probability)
- Pursue alternative architectures (hedge against plateau)
- Cannot: Guarantee breakthroughs

**Why soft constraint:** Empirical trend exists, but diminishing returns plausible. Player investment matters, but no guarantees.

---

#### 4. Espionage Dynamics (Confidence: 0.50-0.65)
**Evidence:** Historical precedent, but timing uncertain

**Game Mechanic:**
```
EVENT: Each round in HIGH_CAPABILITY state:
- Roll for espionage incident: P = 0.5 base
- If incident occurs:
  - Roll for public revelation: P = 0.5
  - If revealed → increase Race_Pressure by 0.3
```

**Player Actions:**
- Invest in security (reduce incident probability)
- Control media narrative (reduce revelation probability)
- Leak rival's espionage (increase race pressure)

**Why soft constraint:** Espionage is likely, but timing and detection are uncertain. Players can influence but not eliminate risk.

---

#### 5. Safety Shortcuts Under Race Conditions (Confidence: 0.60)
**Evidence:** Historical arms race precedent, safety culture analysis

**Game Mechanic:**
```
IF Race_Pressure > 0.6:
  - Safety_Investment_Multiplier = 0.5 (costs doubled, effectiveness halved)
  - Time_To_AGI_Multiplier = 0.7 (30% acceleration)
  - Hidden_Objective_Pressure += 0.3 (secret goals become more tempting)
```

**Player Actions:**
- Resist pressure (costly, requires coordination)
- Defect to race (gain short-term advantage, increase risk)
- Form alliances (reduce pressure collectively)

**Why soft constraint:** Mechanism is plausible and historically grounded, but player coordination can counteract.

---

### Player Agency (Strategic Choices, Uncertain Outcomes)

#### 6. Chatbot → Agent Transition (Confidence: 0.15)
**Evidence:** Speculative, limited AutoGPT-style experiments

**Game Mechanic:**
```
STRATEGIC CHOICE: "Invest in Agentic AI Research"
- Cost: 2 action points
- Outcome: UNCERTAIN (roll with low base probability)
  - Success (P=0.2): Unlock agent capabilities, +1.5 capability
  - Partial (P=0.5): Unreliable agents, +0.5 capability, +0.2 risk
  - Failure (P=0.3): No progress, wasted investment

ALTERNATIVE: "Focus on Tool AI / Narrow Applications"
- Cost: 1 action point
- Outcome: RELIABLE (deterministic)
  - Guaranteed +0.3 capability (smaller but certain)
```

**Strategic Question:**
*Do you bet on risky agentic transition, or play it safe with narrow AI?*

**Why player agency:** Highly contested, no empirical grounding. This should be a central strategic choice where players' actions determine which future unfolds.

---

#### 7. Recursive Self-Improvement / FOOM (Confidence: -0.10)
**Evidence:** None. Contested by most researchers.

**Game Mechanic:**
```
LATE-GAME CHOICE: "Attempt Recursive Self-Improvement"
- Prerequisites: AGI achieved, 3+ capability points invested
- Cost: All remaining action points (high risk)
- Outcome: HIGHLY UNCERTAIN (extreme variance)
  - Catastrophic failure (P=0.4): Lose control, game over
  - Slow progress (P=0.4): Modest gains (+0.5), no FOOM
  - FOOM (P=0.2): Exponential capability gain, win condition BUT...
    - Alignment check: Roll vs Alignment_Investment
    - If failed: Win condition becomes loss (misaligned ASI)

ALTERNATIVE: "Incremental Progress Path"
- Slower but more controllable
- Can still achieve AGI, but takes more rounds
```

**Strategic Question:**
*Do you risk FOOM (high variance, could win or lose instantly), or pursue slow-and-steady path?*

**Why player agency:** No evidence, highly speculative. This is THE central bet of AI2027 - players should decide if they believe it.

---

## State Machine Integration

### Game States (from DAG)

```
LOBBY (Setup)
   ↓
EARLY_SCALING (2024-2025)
   - Compute scaling active (hard constraint)
   - Algorithmic progress rolls (soft constraint)
   - Espionage risk low
   ↓
GPT-5_THRESHOLD (2025-2026)
   - Capability demonstrations
   - Race dynamics trigger check (hard constraint)
   - Decision point: Reveal capabilities or conceal?
   ↓
[CONDITIONAL BRANCH]
   ├─ RACE_DYNAMICS (if race triggered)
   │    - Safety shortcuts active
   │    - Accelerated timeline
   │    - High espionage risk
   │    ↓
   └─ COOPERATIVE_PATH (if race avoided)
        - Safety investment effective
        - Slower but controlled progress
        ↓
AGI_THRESHOLD (2027)
   - Agent transition choice (player agency)
   - Research automation potential
   ↓
[ENDGAME CHOICE]
   ├─ FOOM_ATTEMPT (high risk/reward)
   │    - Alignment check
   │    - Win or lose immediately
   │
   └─ INCREMENTAL_PATH (steady progress)
        - Longer game, more control
```

### Turn Structure

**Each round (6 in-game months):**
1. **Automatic Events** (hard constraints)
   - Compute scaling: +0.5 capability
   - Check race trigger conditions

2. **Probabilistic Events** (soft constraints)
   - Roll for algorithmic breakthrough
   - Roll for espionage incident
   - Roll for external shock events

3. **Player Actions** (3 action points)
   - Choose from generated options
   - Strategic choices affect probabilities

4. **AI Player Actions** (simulated)
   - Generate options for each AI player
   - AI chooses based on hidden objectives

5. **Consequence Resolution**
   - Apply hard constraint updates
   - Resolve probabilistic events
   - Calculate score changes
   - Update game state

6. **State Transition Check**
   - Check if threshold crossed (GPT-5 level, AGI level)
   - Branch to new state if triggered

---

## Scoring System Design

### Public Score: "Democratic Legitimacy" → "AI Safety Margin"

Reframe the core metric to match AI2027 scenario:

```
AI_Safety_Margin = f(
  alignment_investment,
  capability_growth_rate,
  safety_culture_strength,
  coordination_level
)

LOSE_CONDITION: Safety_Margin ≤ 0
  - Capabilities outpace safety too much
  - Risk of misaligned AGI
```

### Hidden Scores: Role-Specific Objectives

**Election Commissioner** → **Safety Researcher**
- Hidden objective: Maximize alignment investment
- Tension: Needs cooperation, but others have competitive incentives

**Tech CEO** → **Frontier Lab CEO**
- Hidden objective: Reach AGI first
- Tension: Racing increases risk, but losing means no influence

**Federal Regulator** → **Compute Governance Lead**
- Hidden objective: Slow race dynamics
- Tension: Regulation could lose race to unregulated actors

**Campaign Manager** → **Public Relations Officer**
- Hidden objective: Manage information flow
- Tension: Transparency vs strategic concealment

**Cybersecurity Expert** → **Security Researcher**
- Hidden objective: Prevent espionage
- Tension: Security investment vs capability investment

**Journalist** → **AI Analyst / Forecaster**
- Hidden objective: Accurate public awareness
- Tension: Revealing info can trigger race dynamics

---

## Playtesting Goals

### Hypothesis 1: Epistemic Structure → Emergent Learning
**Test:** Do players naturally discover the weak links in AI2027 reasoning through gameplay?

**Metrics:**
- Do players converge on agent transition and FOOM as highest-uncertainty bets?
- Do players recognize compute scaling as essentially inevitable?
- Do players understand race dynamics as the critical branching point?

### Hypothesis 2: Constraint Balance → Engaging Gameplay
**Test:** Does the mix of hard/soft constraints create meaningful strategic choices without feeling arbitrary?

**Metrics:**
- Player agency rating (1-5 scale)
- Replayability (do different strategies produce different outcomes?)
- Learning outcomes (can players articulate what they learned about AI timelines?)

### Hypothesis 3: Hidden Objectives → Social Dynamics
**Test:** Do asymmetric objectives create interesting negotiation and betrayal dynamics?

**Metrics:**
- Frequency of cooperation vs defection
- Does "Safety Researcher" feel tension between personal and collective good?
- Does "Lab CEO" face interesting tradeoffs between speed and safety?

---

## Implementation Roadmap

### Phase 1: Minimal Viable DAG (MVP)
**Goal:** Validate core constraint → mechanic mappings

**Scope:**
- 3 states: Early Scaling → GPT-5 Threshold → AGI Threshold
- 2 hard constraints: Compute scaling, race trigger
- 1 soft constraint: Algorithmic progress
- 1 player agency choice: Agent transition bet

**Success Criteria:**
- Players can complete a 5-round game
- Different strategies produce different outcomes
- Players identify compute scaling as inevitable, agent transition as uncertain

### Phase 2: Full State Machine
**Goal:** Complete AI2027 scenario coverage

**Add:**
- Full 5-state machine
- All soft constraints (espionage, safety shortcuts)
- FOOM endgame choice
- Asymmetric hidden objectives for all 6 roles

**Success Criteria:**
- Matches AI2027 forecast distribution (P(AGI by 2027) ≈ 0.5)
- Epistemic uncertainty properly reflected in gameplay
- Replayable with different paths to victory/defeat

### Phase 3: Extensibility
**Goal:** Support custom scenarios beyond AI2027

**Add:**
- Scenario editor (define custom DAG, assign epistemic scores)
- Automatic constraint→mechanic mapping based on scores
- Alternative forecast integration (Ajeya Cotra, Tom Davidson, etc.)

**Success Criteria:**
- Can implement "AI Pause Scenario" in <1 hour
- Can implement "Slow Takeoff Scenario" with different constraints
- Users understand how epistemic scores affect game mechanics

---

## Open Questions for Playtesting

1. **Calibration:** Does P(AGI by 2027) in actual gameplay match ~50% from forecast?
   - If too high: Increase difficulty of agent transition
   - If too low: Reduce compute scaling threshold

2. **Race Avoidance:** Can skilled players avoid race dynamics, or is it inevitable?
   - Current design: Avoidable with 2+ player cooperation
   - Alternative: Make race inevitable, focus on managing it

3. **FOOM Choice:** Should it be available every game, or only under specific conditions?
   - Current design: Available if AGI reached
   - Alternative: Require specific research path + high capability threshold

4. **Counterfactual Clarity:** Do players understand the "if no one acted" baseline?
   - Test: Post-game survey about counterfactual comprehension
   - Iterate on presentation if unclear

5. **Learning Transfer:** Can players articulate AI2027 assumptions after playing?
   - Test: Ask players to rank assumptions by confidence
   - Compare to epistemic scores from DAG
   - Success = correlation >0.7

---

## Appendix: Full Constraint→Mechanic Table

| DAG Link | Confidence | Constraint Type | Game Mechanic | Player Influence |
|----------|-----------|----------------|---------------|-----------------|
| Compute Scaling | 0.60 | Hard | Auto-advance capability | Accelerate/decelerate |
| Algorithmic Progress | 0.40 | Soft | Probabilistic breakthrough | Investment increases P |
| Agent Transition | 0.15 | Agency | Strategic choice | Full control of bet |
| FOOM | -0.10 | Agency | High-risk endgame choice | Full control of attempt |
| Espionage Starts | 0.65 | Soft | Background probability | Security reduces P |
| Espionage Revealed | 0.50 | Soft | Conditional event | PR controls revelation |
| Race Trigger | 0.70 | Hard | Threshold-based state change | Can delay, not prevent |
| Safety Shortcuts | 0.60 | Hard | State-dependent modifiers | Can resist with coordination |

---

## Next Steps

1. **Validate with Domain Experts**
   - Share with AI safety researchers
   - Verify constraint calibration matches their intuitions
   - Adjust epistemic scores based on feedback

2. **Paper Prototype**
   - Test state machine flow on paper
   - Hand-simulate 2-3 rounds with 4 players
   - Identify confusing mechanics, unclear choices

3. **Implement MVP**
   - Code Phase 1 scope (3 states, core constraints)
   - Run 10+ playtests
   - Iterate based on learning metrics

4. **Expand Source Coverage**
   - Add Ajeya Cotra bio anchors model
   - Add Tom Davidson takeoff speeds
   - Create "Consensus" scenario averaging multiple forecasts

# Dimension Choice Rationale

**Meta-Question**: Why these 8 dimensions? How do we know this is the "right" decomposition?

**Your critique**: The 8 dimensions feel arbitrary. We haven't proven they're orthogonal (PCA-like) or that they capture what GMs actually care about.

**You're absolutely correct.** This is a **first-draft heuristic decomposition**, not a validated measurement framework.

---

## Current Status: Domain-Driven (Not Data-Driven)

### How the 8 dimensions were chosen:

**Method**: Expert intuition + literature review
- **Expressiveness**: Standard PL theory dimension (Turing-completeness, type systems)
- **Tractability**: Computational complexity (decidability, scalability)
- **Learnability**: HCI / usability dimension
- **Verification**: Formal methods core value proposition
- **Continuous/Discrete**: Fundamental mathematical distinction
- **Stochasticity**: Uncertainty quantification perspective
- **Modularity**: Software engineering principle
- **Tools**: Pragmatic adoption barrier

**Not validated**:
- No user studies with actual GMs
- No PCA on real formalism usage data
- No correlation analysis (are dimensions independent?)
- No empirical measurement of what predicts formalism choice

---

## What a Proper Validation Would Look Like

### Approach 1: User Study (Interview GMs)

**Protocol**:
1. Recruit 20-30 GMs with scenario modeling experience
2. Present 10 scenarios (AI governance, pandemic, climate, etc.)
3. Ask: "Which formalism did you choose? Why?"
4. Extract criteria from free-text responses
5. Code responses → identify themes
6. **Data-driven dimensions**: Count frequency of each criterion

**Hypothesis**: We'd find dimensions we missed (e.g., "data availability", "team expertise", "time pressure")

**Expected result**:
- Some of our 8 dimensions validated (e.g., "need verification" likely mentioned)
- New dimensions emerge (e.g., "stakeholder buy-in", "explainability to non-experts")
- Clustering: Maybe some GMs care about {verification, rigor} while others care about {speed, ease}

---

### Approach 2: PCA on Formalism Features

**Data collection**:
- Score 20+ formalisms on 50+ features (comprehensive)
- Features could include:
  - Semantic features (continuous? stochastic? timed?)
  - Pragmatic features (tools? community? learning resources?)
  - Performance (simulation speed, state space size)
  - Usability (GUI? programming required? debugging?)

**Analysis**:
- Run PCA → find principal components
- See which features load heavily on each PC
- These PCs are **empirically-derived dimensions**

**Example PC interpretation**:
- **PC1**: Verification capability (Kripke, TA, MDP high; SD, ABM low)
- **PC2**: Continuous dynamics (SD, HA high; Kripke, MDP low)
- **PC3**: Ease of use (SD, ABM high; SHA, formal methods low)

**Result**: Might find 8 dimensions collapse to 3-4 principal components

---

### Approach 3: Clustering Formalism Usage

**Data collection**:
- Survey: "For your last 5 modeling projects, which formalism did you use?"
- Collect: (scenario_type, formalism_chosen, outcome_satisfaction)

**Analysis**:
- Cluster scenarios by formalism choice
- Extract features that predict cluster membership
- **Dimensions = discriminative features**

**Example clusters**:
- **Cluster 1**: Safety-critical systems → always use Kripke/TA/MDP (verification)
- **Cluster 2**: Continuous dynamics → always use SD/HA (ODEs)
- **Cluster 3**: Social systems → always use ABM (heterogeneity)

**Dimensions** = features that split clusters

---

## Limitations of Current 8 Dimensions

### Potential Issues:

**1. Not orthogonal**:
- **Tractability** and **Verification** are correlated
  - Decidable → tractable → verifiable
  - Undecidable → intractable → no verification
  - Correlation: ~0.7 (estimated)

- **Learnability** and **Tools** are correlated
  - Good tools → easier to learn
  - Correlation: ~0.8 (estimated)

**Implication**: We're double-counting some dimensions

---

**2. Missing dimensions**:

Candidates based on informal GM feedback:
- **Data Integration**: How easy to calibrate to real data?
- **Explainability**: Can non-experts understand model behavior?
- **Incremental Development**: Can you start simple and add complexity?
- **Team Collaboration**: Can multiple GMs work on same model?
- **Debuggability**: How easy to find why model behaves unexpectedly?
- **Multi-scale**: Can model handle multiple timescales (hours + years)?
- **Spatial**: Can model handle geography/networks?

---

**3. Weighting is subjective**:

Current scoring: All dimensions weighted equally (sum of 8 dimensions = total score)

**Problem**: Different GMs have different priorities

**Example**:
- **Safety-critical GM**: Verification weight = 10, Tools weight = 1
- **Exploration GM**: Learnability weight = 10, Verification weight = 1
- **Policy analyst GM**: Tractability weight = 10 (need fast sims), Stochasticity weight = 8 (need uncertainty)

**Current framework**: No way to express these priorities

---

## Proposed Solution: Weighted Scoring + GM Profiles

### 1. Add Weights to Spider Graphs

**Weighted score**:
```python
score = Σ (dimension_score * weight) / Σ weights

# Example: Safety-critical GM
weights = {
    "Expressiveness": 5,
    "Tractability": 3,
    "Learnability": 2,
    "Verification": 10,  # <-- Highest priority
    "Continuous": 5,
    "Stochasticity": 4,
    "Modularity": 3,
    "Tools": 6
}

# SD: [2,5,5,1,5,1,4,5]
weighted_sd = (2*5 + 5*3 + 5*2 + 1*10 + 5*5 + 1*4 + 4*3 + 5*6) / (5+3+2+10+5+4+3+6)
            = (10 + 15 + 10 + 10 + 25 + 4 + 12 + 30) / 38
            = 116 / 38
            = 3.05 / 5

# Kripke: [2,4,3,5,0,0,4,4]
weighted_kripke = (2*5 + 4*3 + 3*2 + 5*10 + 0*5 + 0*4 + 4*3 + 4*6) / 38
                = (10 + 12 + 6 + 50 + 0 + 0 + 12 + 24) / 38
                = 114 / 38
                = 3.00 / 5

# Winner for safety-critical GM: SD (slightly)
# But if verification weight = 15: Kripke wins decisively
```

---

### 2. Define GM Profiles

**GM Profile** = (goals, constraints) → weight vector

**Profile 1: Research Prototyper**
- **Goal**: Explore scenario quickly, iterate
- **Constraints**: None (just me, personal project)
- **Weights**:
  - Learnability: 10
  - Tractability: 8 (need fast iteration)
  - Tools: 7
  - Everything else: 3

**Recommended formalism**: System Dynamics (Vensim quick to learn, fast sim)

---

**Profile 2: Safety-Critical Engineer**
- **Goal**: Prove system is safe, pass certification
- **Constraints**: Must provide formal proof
- **Weights**:
  - Verification: 10
  - Tractability: 6 (model checking must terminate)
  - Modularity: 5 (compose verified components)
  - Everything else: 2

**Recommended formalism**: Kripke or Timed Automata (mature model checkers)

---

**Profile 3: Policy Analyst**
- **Goal**: Quantify P(catastrophe), communicate to decision-makers
- **Constraints**: Results in 1 week, must explain to non-experts
- **Weights**:
  - Stochasticity: 10 (need probabilities)
  - Tractability: 9 (Monte Carlo must run fast)
  - Learnability: 7 (analysts not expert modelers)
  - Verification: 4 (nice but not required)

**Recommended formalism**: MDP (PRISM) if discrete, SD + Monte Carlo if continuous

---

**Profile 4: Multidisciplinary Team**
- **Goal**: Model complex socio-technical system
- **Constraints**: Team includes domain experts, not all technical
- **Weights**:
  - Expressiveness: 10 (need to capture heterogeneity)
  - Learnability: 8 (domain experts must contribute)
  - Modularity: 8 (different sub-teams work on different parts)
  - Tools: 7 (need GUI for non-coders)

**Recommended formalism**: ABM (NetLogo for non-technical) or SD (Vensim)

---

### 3. Update Spider Graph Generator

Add `--weights` flag:
```bash
python spider_graphs.py --compare SD Kripke HA \
    --weights "Verification=10,Learnability=2,Tools=5" \
    --profile "Safety-Critical GM"
```

**Output**: Spider graph with weighted areas shaded

**Example**:
- Verification axis is thicker (higher weight)
- Final score prominently displayed: "SD: 3.05, Kripke: 3.21"
- Recommendation: "For your profile, Kripke is better (+5%)"

---

## Empirical Validation Plan

To make this **data-driven** instead of **heuristic**:

### Phase 1: Dimension Discovery (Qualitative)
1. **Interview 20 GMs** (diverse domains)
2. **Ask**: "What factors determine your formalism choice?"
3. **Code responses** → identify themes
4. **Result**: Validated dimension list + new dimensions

### Phase 2: Dimension Quantification (Quantitative)
5. **Survey 100+ modeling practitioners**
6. **Ask**: Rate importance of each dimension (1-10) for your last project
7. **Cluster** GMs by importance ratings → GM profiles
8. **PCA** to find redundant dimensions

### Phase 3: Formalism Scoring
9. **Expert panel** (10 formal methods experts)
10. **Score** each formalism on validated dimensions
11. **Inter-rater reliability**: Measure agreement
12. **Resolve** discrepancies via discussion

### Phase 4: Validation
13. **Test set**: 50 new scenarios
14. **Predict** formalism choice using weighted scores
15. **Compare** to actual GM choice
16. **Accuracy**: Did our framework predict correctly?

---

## Open Questions

**Q1: Are 8 dimensions too many?**
- PCA might collapse to 3-4 principal components
- Trade-off: Richness vs simplicity

**Q2: Should we use different dimensions for different domains?**
- Maybe AI governance cares about verification, but social science doesn't
- Domain-specific dimension sets?

**Q3: How do we handle conflicting goals?**
- GM wants both verification AND continuous dynamics
- No formalism excels at both
- Multi-objective optimization? Pareto frontier?

**Q4: Can we auto-infer weights from scenario description?**
- LLM reads scenario text
- Extracts goals (e.g., "We need to prove safety" → verification weight high)
- Automatically suggests formalism

---

## For Now: Pragmatic Approach

**Current 8 dimensions**: Reasonable first approximation
- Covers major considerations (expressiveness, tractability, usability, verification)
- Based on formal methods literature + our experience

**Weights**: Default to equal (all dimensions = 1.0)
- But allow GMs to override
- Provide 4-5 pre-built profiles (Research, Safety, Policy, Team)

**Next**: Collect user feedback
- Which dimensions do GMs actually use?
- Which dimensions are redundant?
- What's missing?

**Long-term**: Run validation study (interview/survey/PCA)

---

## Actionable Next Steps

1. **Add weighted scoring to spider_graphs.py**
   - `--weights` CLI flag
   - Pre-built profiles (research, safety, policy, team)

2. **Create GM profile document**
   - Define 5-10 canonical GM types
   - Map to weight vectors
   - Example scenarios for each

3. **Dimension correlation analysis**
   - Compute correlation matrix
   - Identify redundant dimensions
   - Consider dimension reduction

4. **User study prep**
   - Design interview/survey protocol
   - Recruit participants
   - Run pilot with 5 GMs

---

**Status**: Framework v1.0 (heuristic)
**Goal**: Framework v2.0 (data-driven)
**Timeline**: v1.0 → v1.5 (weighted scoring) → v2.0 (validated dimensions)

**Contributors**: MedhAI (meta-critique), Claude (implementation)

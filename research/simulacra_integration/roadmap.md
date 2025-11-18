# Implementation Roadmap

**Week-by-week plan for integrating formal methods into Simulacra**

---

## Phase 1: Level 1 - State Tracking (Week 1)

### Goals
- Add continuous variable tracking
- Display real-time metrics
- No mode detection yet

### Tasks

**Day 1-2: Setup**
- [ ] Create `src/types/formal.ts`
- [ ] Define `FormalState` interface
- [ ] Add `formalState` field to `GameState`
- [ ] Initialize default values

**Day 3-4: Logic**
- [ ] Implement `updateFormalState()` in `src/services/formalModel.ts`
- [ ] Add action tag parsing (deploy, safety_research, regulate, etc.)
- [ ] Compute derived metrics (alignmentGap, riskScore)
- [ ] Write unit tests

**Day 5: UI**
- [ ] Create `FormalMetrics.tsx` component
- [ ] Style metrics panel
- [ ] Add to `GameScreen.tsx`
- [ ] Test responsiveness

**Day 6-7: Integration & Polish**
- [ ] Integrate into `useGameController`
- [ ] Test with existing scenarios
- [ ] Fix edge cases
- [ ] Code review

### Deliverable
Players see real-time metrics: "Compute: 10^26.9 | Alignment: 33% | Trust: 57% | Risk: 6.2"

### Success Metrics
- Metrics update correctly after each round
- No performance impact (< 10ms per update)
- Unit tests pass

---

## Phase 2: Level 2 - Mode Detection (Week 2-3)

### Goals
- Detect governance modes
- Show mode transitions
- Apply mode-specific parameters

### Tasks

**Week 2 Day 1-2: Types & Logic**
- [ ] Define `GovernanceMode` enum
- [ ] Extend `FormalState` with mode, evidenceCount, roundsInMode
- [ ] Implement `detectModeTransition()`
- [ ] Implement `getModeParameters()`

**Week 2 Day 3-4: UI**
- [ ] Create `ModeIndicator.tsx` component
- [ ] Design mode badges with colors
- [ ] Add mode descriptions
- [ ] Create transition animations

**Week 2 Day 5: Integration**
- [ ] Call `detectModeTransition()` each round
- [ ] Apply mode-specific parameters to variable updates
- [ ] Log mode transitions in event log
- [ ] Update `FormalMetrics` to show mode

**Week 3 Day 1-2: Testing**
- [ ] Test all mode transitions
- [ ] Verify guard conditions
- [ ] Test edge cases (rapid transitions, loops)
- [ ] Write integration tests

**Week 3 Day 3-5: Polish**
- [ ] Add mode transition notifications
- [ ] Polish UI/UX
- [ ] Code review
- [ ] Documentation

### Deliverable
Players see mode indicator: "Mode: RACE (Round 3)" with transition warnings

### Success Metrics
- All 8 modes detectable
- Transitions fire correctly
- Mode UI updates without flicker

---

## Phase 3: Level 3 - Property Checking (Week 4-6)

### Goals
- Define temporal logic properties
- Check properties in real-time
- Warn on violations

### Tasks

**Week 4 Day 1-3: Property Definition**
- [ ] Create `src/services/temporalLogic.ts`
- [ ] Define `Property` interface
- [ ] Implement 5-10 key properties:
  - no_premature_deployment
  - trust_floor
  - mandatory_pause_on_evidence
  - eventual_alignment
  - race_must_end
- [ ] Write property checker functions

**Week 4 Day 4-5: Integration**
- [ ] Call `checkProperties()` each round
- [ ] Store results in game state
- [ ] Log violations in event log

**Week 5 Day 1-2: UI**
- [ ] Create `PropertyMonitor.tsx`
- [ ] Design property cards (satisfied/violated)
- [ ] Add formula display
- [ ] Add explanations

**Week 5 Day 3-5: LLM Integration (Strategy 2)**
- [ ] Implement `buildFormalGuidance()`
- [ ] Enhance LLM prompts with guidance
- [ ] Test narrative consistency
- [ ] Tune guidance format

**Week 6: Testing & Polish**
- [ ] Test all properties
- [ ] Verify LLM respects constraints
- [ ] Add property violation animations
- [ ] User testing
- [ ] Code review

### Deliverable
Property monitor showing: "✓ Trust above threshold" and "✗ Deployed without alignment"

### Success Metrics
- 10 properties defined and working
- Violations caught correctly
- LLM narratives reflect violations 80%+ of time

---

## Phase 4: Level 4 - Probabilistic Analysis (Week 7-12)

### Goals
- Build MDP abstraction
- Compute P(catastrophe)
- Show counterfactuals
- Optimal policy

### Tasks

**Week 7-8: MDP Abstraction**
- [ ] Define `MDPState` interface
- [ ] Implement `abstractToMDPState()`
- [ ] Define state space (modes × regions)
- [ ] Estimate transition probabilities

**Week 9: Probability Computation**
- [ ] Research: Use library or implement from scratch?
- [ ] Implement reachability probability calculation
- [ ] Test with known MDPs
- [ ] Optimize performance

**Week 10: Optimal Policy**
- [ ] Implement value iteration
- [ ] Compute optimal action per state
- [ ] Test policy quality

**Week 11: UI**
- [ ] Create `RiskAnalysis.tsx` modal
- [ ] Add risk gauges (P(catastrophe), P(success))
- [ ] Implement counterfactual display
- [ ] Add optimal policy recommendations

**Week 12: Integration & Polish**
- [ ] Connect to main game loop
- [ ] Add "Analyze Risk" button
- [ ] Test with multiple scenarios
- [ ] Performance optimization
- [ ] User testing

### Deliverable
Full risk analysis modal with probabilities, counterfactuals, and recommendations

### Success Metrics
- MDP has ~200 states (tractable)
- Probability computation < 2s
- Optimal policy makes sense (validated by experts)

---

## Alternative: Python Backend (for Level 4)

If Level 4 in TypeScript is too complex:

### Tasks

**Week 7-9: Backend Setup**
- [ ] Create `api/formal_analysis.py`
- [ ] Set up FastAPI service
- [ ] Install PRISM or Python MDP library
- [ ] Define API endpoints

**Week 10: Integration**
- [ ] Create `formalAnalysisService.ts` (client)
- [ ] Connect React frontend to Python backend
- [ ] Handle async requests

**Week 11-12: Same as above**
- UI and testing

---

## Testing Strategy

### Unit Tests (Throughout)
- `formalModel.test.ts`
- `temporalLogic.test.ts`
- `mdpAnalysis.test.ts` (if Level 4)

### Integration Tests (After each phase)
- Full round simulations
- Mode transition sequences
- Property violation scenarios

### User Testing (End of each phase)
- 3-5 playtesters
- Collect feedback on:
  - Clarity of metrics
  - Usefulness of formal info
  - UI/UX issues
  - Performance

---

## Milestones

| Week | Milestone | Demo |
|------|-----------|------|
| 1 | Level 1 complete | Show metrics panel |
| 3 | Level 2 complete | Show mode transitions |
| 6 | Level 3 complete | Show property checking + LLM integration |
| 12 | Level 4 complete | Show full risk analysis |

---

## Success Criteria

### Level 1
- ✓ Metrics update every round
- ✓ < 10ms performance
- ✓ No visual glitches

### Level 2  
- ✓ All modes detectable
- ✓ Transitions logical
- ✓ Mode UI clear

### Level 3
- ✓ 10+ properties implemented
- ✓ Violations caught
- ✓ LLM consistency > 80%

### Level 4
- ✓ P(catastrophe) sensible
- ✓ < 2s computation
- ✓ Counterfactuals useful

---

## Risk Mitigation

### Risk: LLM doesn't respect formal constraints
**Mitigation**: Implement Strategy 3 (validation loop), or use simpler heuristics

### Risk: Level 4 MDP too slow
**Mitigation**: Use Python backend with PRISM, or simplify state space

### Risk: Users find formal metrics distracting
**Mitigation**: Progressive disclosure (collapsed by default), optional toggle

### Risk: Formal model parameters wrong
**Mitigation**: Playtesting + iterative tuning, expert review

---

## Post-Launch

### Iteration
- Collect gameplay data
- Tune parameters (variable update rates, guard thresholds)
- Add more properties based on player feedback

### Features
- Export formal trace for analysis
- Scenario editor with formal constraints
- Multi-player formal coordination

---

**Next**: [Technical Choices](technical_choices.md) for implementation options

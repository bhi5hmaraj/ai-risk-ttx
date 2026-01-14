# Simulacra v1 Task Breakdown

**Based on:** simulacra-mvp-design.md + integration-plan-v2.md
**Strategy:** CLI-first integration, iterative server evolution
**Timeline:** ~12-14 days to playable MVP

---

## Phase 0: Foundation (Days 1-3)

### CP0: CLI Skeleton (Day 1)

**Goal:** Build CLI tool that connects and observes existing server

**Backend:**
- [ ] No changes required

**CLI Package:**
- [ ] Create `packages/cli` directory structure
- [ ] Initialize package.json with dependencies (colyseus.js, commander, chalk, inquirer)
- [ ] Implement `src/client.ts` - Colyseus connection wrapper
- [ ] Implement `src/logger.ts` - Pretty message logging with timestamps
- [ ] Implement `src/repl.ts` - Interactive command interface
- [ ] Implement `src/index.ts` - Commander CLI with create/join/watch commands
- [ ] Add npm scripts: `"sim": "npx tsx src/index.ts"`

**Testing:**
```bash
# Terminal 1: Create game
npm run sim create

# Terminal 2: Join game
npm run sim join <ROOM_CODE>
```

**Success Criteria:**
- Can create and join rooms via CLI
- See all server messages logged in real-time
- Can send basic commands (/role, /start, /action)

---

### CP1: CLI Full Game Loop (Day 2)

**Goal:** CLI can play through complete existing game flow

**CLI:**
- [ ] Create `src/phases.ts` with phase-aware handlers
- [ ] Implement `handleLobby()` - show players, roles, ready status
- [ ] Implement `handleAction()` - show state, AP, submission status
- [ ] Implement `handleConsequence()` - show waiting state
- [ ] Implement `handleEnd()` - show final results
- [ ] Wire phase handlers to state change events
- [ ] Track last phase to detect transitions

**Testing:**
```bash
# Two terminals playing full game
# Terminal 1: /role "Election Commissioner", /start
# Terminal 2: /role "Tech CEO"
# Both: /action <id> <cost>, /advance
```

**Success Criteria:**
- Full game playthrough via CLI from LOBBY → END
- Clear phase transitions
- All commands work

---

### CP2: CLI Auto-Mode (Day 3)

**Goal:** Automated testing and bot players

**CLI:**
- [ ] Create `src/auto.ts` - AutoPlayer class
- [ ] Implement auto role selection
- [ ] Implement auto action submission
- [ ] Implement auto round advancement (optional)
- [ ] Add `auto` command to CLI
- [ ] Create `scripts/test-game.ts` - automated full game test

**Testing:**
```bash
# Automated test
npx tsx scripts/test-game.ts

# Manual with bots
# Terminal 1: sim create
# Terminal 2-4: sim auto <ROOM_CODE>
```

**Success Criteria:**
- Automated test completes full game
- Bots can join and play
- Test exits with success code

---

## Phase 1: New Data Structures (Days 4-6)

### CP3: Add Resources to Server (Day 4)

**Goal:** Server tracks M/I/N resources, CLI displays them

**Backend:**
- [ ] Add resource fields to Player schema (`resourceM`, `resourceI`, `resourceN`)
- [ ] Create `CorePlayerResources` interface in StateManager
- [ ] Initialize resources from role definitions in `addPlayer()`
- [ ] Update state adapter to project resources to clients
- [ ] Ensure resources sync in schema updates

**CLI:**
- [ ] Update `handleAction()` to show resource progress bars
- [ ] Create `progressBar()` utility function
- [ ] Display M/I/N with visual bars + numeric values

**Testing:**
```bash
# Start game, verify resources show
# Should see:
#   Material (M):     ████████████░░░░░░░░ 60
#   Institutional (I): █████████████░░░░░░░ 65
#   Narrative (N):    ██████████░░░░░░░░░░ 50
```

**Success Criteria:**
- Resources initialize from role definitions
- CLI displays resource bars
- Values sync across clients
- Existing game flow unchanged

---

### CP4: Add Policy System (Day 5)

**Goal:** Players can set and update policies

**Backend:**
- [ ] Create `packages/backend/src/room/handlers/PolicyHandler.ts`
- [ ] Add `Policy` interface to CorePlayer (goals, priority, stances)
- [ ] Implement `handleUpdatePolicy()` method
- [ ] Register `update_policy` message in GameRoom
- [ ] Broadcast `policy_updated` to all clients
- [ ] Store policy in player state
- [ ] Add policy visibility to state adapter

**CLI:**
- [ ] Add `/policy <goals>` command to REPL
- [ ] Listen for `policy_updated` broadcasts
- [ ] Display policy changes in logs
- [ ] Show other players' policies

**Testing:**
```bash
# Set policy
/policy "Maximize public trust and prevent AI catastrophe"

# Verify other clients see policy_updated message
# Verify policy stored in player state
```

**Success Criteria:**
- Can set policy via CLI
- Policy broadcasts to other players
- Policy visible in state
- Game still playable

---

### CP5: Intent Data Structure (Day 6)

**Goal:** Server generates Intent objects (selection still uses old flow)

**Backend:**
- [ ] Create `packages/backend/src/services/IntentGenerator.ts`
- [ ] Define `Intent` interface with all fields
- [ ] Create `actionOptionsToIntents()` converter
- [ ] Implement `estimateCoreMetricDelta()` heuristic
- [ ] Send `intents_available` message alongside `action_options`
- [ ] Keep old flow working (don't break existing clients)

**CLI:**
- [ ] Listen for `intents_available` messages
- [ ] Display intent list with format:
  ```
  1. [2 AP] Strengthen regulatory oversight → Congress
     G: +3, Target I: +5
  ```
- [ ] Show target, cost, predicted effects

**Testing:**
- Start game, enter ACTION phase
- Verify CLI shows both action options AND intents
- Old action submission still works

**Success Criteria:**
- Server sends intent objects
- CLI displays intents clearly
- Old flow (submit_action) unchanged
- Both formats coexist

---

## Phase 2: New Game Loop (Days 7-10)

### CP6: Intent Selection (Day 7)

**Goal:** Can select intents instead of actions (both work)

**Backend:**
- [ ] Create `packages/backend/src/room/handlers/IntentSelectionHandler.ts`
- [ ] Implement `handleSelectIntents(client, { intentIds })`
- [ ] Validate AP cost doesn't exceed player AP
- [ ] Store `selectedIntentIds` in player state
- [ ] Convert selected intents → old action format (bridge layer)
- [ ] Set `hasSubmittedActions = true`
- [ ] Broadcast `player_ready` message
- [ ] Register `select_intents` message in GameRoom
- [ ] Trigger existing round progression when all submitted

**CLI:**
- [ ] Add `/select <id1> <id2> ...` command
- [ ] Validate intent IDs exist
- [ ] Show confirmation when selected
- [ ] Display AP spent

**Testing:**
```bash
# Test both methods work:
# Method 1 (old): /action <id> <cost>
# Method 2 (new): /select intent-0 intent-2

# Both should:
# - Mark player as submitted
# - Deduct AP
# - Progress round when all ready
```

**Success Criteria:**
- Both `submit_action` and `select_intents` work
- AP validation works
- Round progression unchanged
- No regressions

---

### CP7: Counter Phase (Day 8)

**Goal:** Add COUNTER phase after REVEAL

**Backend:**
- [ ] Add `COUNTER` phase to GamePhase enum
- [ ] Update phase progression: REVEAL → COUNTER → RESOLVING
- [ ] Create `packages/backend/src/room/handlers/CounterHandler.ts`
- [ ] Implement `getIncomingIntents(playerId)` - filter intents targeting player
- [ ] Send `incoming_intents` message when entering COUNTER
- [ ] Implement `handleSubmitCounters(client, { decisions })`
- [ ] Validate counter decisions (must have AP for counters)
- [ ] Store counter decisions in player state
- [ ] Deduct AP for counters (2 AP each)
- [ ] Register `submit_counters` message
- [ ] Auto-advance when all counters submitted or timer expires

**CLI:**
- [ ] Add `handleCounter()` phase handler
- [ ] Display incoming intents:
  ```
  Incoming Intents:
  1. [Player X] Weaken regulatory authority (I: -4)
     Counter cost: 2 AP
  2. [ENV] Public backlash (N: -6)
     Counter cost: 2 AP
  ```
- [ ] Add `/counter <id>` command to counter specific intent
- [ ] Add `/accept-all` command
- [ ] Show remaining AP

**Testing:**
- Play to COUNTER phase
- See incoming intents
- Use /counter to contest some
- Use /accept-all for others
- Verify AP deducted correctly

**Success Criteria:**
- COUNTER phase inserted in game loop
- Can counter intents
- AP correctly deducted
- Phase advances when all submitted

---

### CP8: Resolution Math (Day 9)

**Goal:** Apply contested/uncontested effectiveness to intents

**Backend:**
- [ ] Create `packages/backend/src/engine/ResolutionEngine.ts`
- [ ] Implement effectiveness calculation:
  - Uncontested: 0.8
  - Contested: 0.4
- [ ] Implement `resolveIntent(intent, wasContested)` → ResolvedIntent
- [ ] Apply scaled deltas to resources and core metric
- [ ] Clamp all values to [0, 100]
- [ ] Create resolution breakdown (what caused each change)
- [ ] Send `resolution_complete` message with changes
- [ ] Update player resources in state
- [ ] Update core metric (G) in state

**CLI:**
- [ ] Display resolution results:
  ```
  Resolution:

  Your Intent "Strengthen oversight" → Congress
    Contested by Congress
    Effectiveness: 40%
    Target I: +5 → +2 (reduced)

  Incoming "Weaken authority" from Player X
    You countered
    Effectiveness: 40%
    Your I: -4 → -2 (reduced)
  ```
- [ ] Show net resource changes
- [ ] Show G change with breakdown

**Testing:**
- Submit intents, counter some, accept others
- Verify contested = 40% effectiveness
- Verify uncontested = 80% effectiveness
- Verify resources clamp to [0, 100]
- Verify G updates correctly

**Success Criteria:**
- Math works correctly
- Resources update based on deltas
- Contested vs uncontested works
- Clear feedback on changes

---

### CP9: ENV Agent (Day 10)

**Goal:** Environment generates and submits intents automatically

**Backend:**
- [ ] Create `packages/backend/src/engine/ENVAgent.ts`
- [ ] Implement `calculateENVAP(G)` - ENV gets more AP when G is low
- [ ] Implement `calculateENVAggression(G)` - aggression level by G
- [ ] Create ENV intent generation (LLM or hardcoded initially)
- [ ] ENV selects intents automatically during PROPOSAL
- [ ] Include ENV intents in REVEAL
- [ ] ENV intents resolved like player intents (cannot be countered initially)
- [ ] Add ENV to state adapter (visible to all)

**CLI:**
- [ ] Display ENV state:
  ```
  Environment:
    AP: 4
    Aggression: High (G=35)
    Selected: 2 intents
  ```
- [ ] Show ENV intents in reveal phase distinctly:
  ```
  ENV Intent:
    "Market instability" → GLOBAL
    G: -5, All players N: -2
  ```
- [ ] Show ENV actions in debrief

**Testing:**
- Play game with low G
- Verify ENV gets more AP
- Verify ENV selects intents automatically
- Verify ENV intents resolve
- Verify cannot counter ENV (for now)

**Success Criteria:**
- ENV generates intents each round
- ENV AP scales with low G
- ENV acts automatically
- Clear visual distinction in CLI

---

## Phase 3: Polish & Debrief (Days 11-12)

### CP10: Rich Debrief (Days 11-12)

**Goal:** Comprehensive round summary with LLM narrative

**Backend:**
- [ ] Create `packages/backend/src/engine/DebriefGenerator.ts`
- [ ] Implement `RoundDebrief` structure:
  - Core metric change breakdown
  - Per-player resource deltas
  - AP usage and next round AP
  - My intents (what I did)
  - Incoming intents (what happened to me)
- [ ] Implement `DeltaContribution` - trace each change to source intent
- [ ] Create `generateNarrative(debrief)` - LLM prose summary
- [ ] Include next round preview (events, ENV AP)
- [ ] Send `round_debrief` message
- [ ] Store in `roundHistory`

**Frontend (Later):**
- Defer to frontend implementation

**CLI:**
- [ ] Create detailed debrief display:
  ```
  === ROUND 2 DEBRIEF ===

  Global Health: 65 → 58 (-7)
    - Drift: -3
    - Your intent "Regulate AI": +2
    - Player X "Accelerate": -4
    - ENV "Market crash": -2

  Your Resources:
    Material:     60 → 58 (-2)
    Institutional: 65 → 68 (+3)
    Narrative:    50 → 45 (-5)

  AP Used: 4 / 6
  Next Round AP: 5

  Your Actions:
    ✓ "Strengthen oversight" → Congress (effectiveness: 80%)
       Congress I: +4

  Actions Targeting You:
    ✗ "Weaken authority" from Player X (countered, effectiveness: 40%)
       Your I: -2 (reduced from -5)

  === NARRATIVE ===
  As you pushed for stronger AI oversight, Congress began
  drafting new legislation. However, industry pressure and
  market volatility undermined public trust...

  === NEXT ROUND ===
  Round 3: "Self-Improving Loop"
  ENV AP: 4 (high aggression)
  ```

**LLM Integration:**
- [ ] Create narrative prompt with debrief data
- [ ] Call LLM API
- [ ] Validate and truncate response
- [ ] Fallback to template if LLM fails

**Testing:**
- Play through full round
- Verify all changes traced to sources
- Verify narrative references actual events
- Verify next round preview accurate

**Success Criteria:**
- Debrief explains all changes
- Can trace every delta to its source
- Narrative is coherent and relevant
- Preview is accurate

---

## Phase 4: Scenarios & Content (Day 13)

### CP11: Scenario System

**Goal:** Multiple scenarios can be loaded

**Backend:**
- [ ] Create `packages/backend/src/scenarios/` directory
- [ ] Define Scenario JSON schema (based on types-simplified.ts)
- [ ] Create `ScenarioLoader.ts` - load and validate scenarios
- [ ] Implement `ai-2027.ts` scenario (from design doc)
- [ ] Implement `election-crisis.ts` scenario (existing)
- [ ] Create scenario selector in lobby
- [ ] Load scenario on game creation
- [ ] Handle round events (scheduled narrative beats)
- [ ] Apply event effects automatically

**CLI:**
- [ ] Show scenario selection in lobby
- [ ] Display scenario description
- [ ] Show available roles
- [ ] Display round events when they occur

**Testing:**
- Create game with AI 2027 scenario
- Verify correct roles, G, drift
- Verify round events trigger
- Create game with Election Crisis
- Verify different setup

**Success Criteria:**
- Multiple scenarios loadable
- Scenarios have distinct setup
- Round events work
- Role definitions respected

---

## Phase 5: LLM Integration (Day 14)

### CP12: LLM Intent Generation

**Goal:** Intents generated dynamically based on game state

**Backend:**
- [ ] Create `packages/backend/src/llm/IntentPrompts.ts`
- [ ] Implement intent generation prompt:
  - Current game context (round, G, resources)
  - Player policy and goals
  - Other players' states
  - Recent history
- [ ] Implement `generateIntentsForPlayer(player, state)` via LLM
- [ ] Parse and validate LLM response
- [ ] Clamp all deltas to [-10, +10]
- [ ] Fallback to hardcoded if LLM fails
- [ ] Implement ENV intent generation
- [ ] Add "regenerate" capability

**CLI:**
- [ ] Show loading state while generating
- [ ] Add `/regenerate` command to request new intents
- [ ] Display LLM-generated descriptions

**Testing:**
- Set policy with specific goals
- Verify intents align with goals
- Set hostile stance → aggressive intents
- Set cooperative stance → helpful intents
- Verify ENV intents appropriate for scenario
- Test fallback when LLM unavailable

**Success Criteria:**
- Intents contextual and varied
- Align with player policy
- Reference game state
- No mechanical exploits
- Graceful fallback

---

## Phase 6: Final Polish (Days 15-16)

### CP13: Error Handling & Reconnection

**Backend:**
- [ ] Add try-catch throughout
- [ ] Implement reconnection support
- [ ] Add game state persistence (at least in-memory)
- [ ] Log errors with context
- [ ] Add error recovery for LLM failures
- [ ] Validate all client inputs
- [ ] Add rate limiting

**CLI:**
- [ ] Handle disconnections gracefully
- [ ] Show reconnection status
- [ ] Display errors clearly
- [ ] Add retry capability

---

### CP14: Final Testing & Documentation

**Documentation:**
- [ ] Update README with Simulacra v1 instructions
- [ ] Document message protocol
- [ ] Document scenario format
- [ ] Add troubleshooting guide

**Testing:**
- [ ] Full 7-round game with 5 players
- [ ] Test all edge cases (low AP, low G, etc.)
- [ ] Test with bots
- [ ] Test reconnection
- [ ] Test LLM failure scenarios
- [ ] Load test (10+ concurrent games)

**Success Criteria:**
- No crashes in full game
- State stays consistent
- Players understand mechanics
- Ready for playtest

---

## Success Metrics

The MVP is complete when:

1. **Playable:** 3-5 players can complete 5-7 round game without crashes
2. **Comprehensible:** New players understand by round 2
3. **Meaningful:** Debrief teaches why outcomes occurred
4. **Engaging:** Players want to replay with different strategies
5. **Observable:** CLI shows all server messages clearly
6. **Testable:** Automated tests pass consistently

---

## File Structure

```
simulacra_v1/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── StateManager.ts
│   │   │   │   ├── PolicyStore.ts
│   │   │   │   ├── IntentGenerator.ts
│   │   │   │   ├── ResolutionEngine.ts
│   │   │   │   ├── DebriefGenerator.ts
│   │   │   │   └── ENVAgent.ts
│   │   │   ├── room/
│   │   │   │   ├── GameRoom.ts
│   │   │   │   ├── schema/
│   │   │   │   │   └── GameState.ts
│   │   │   │   └── handlers/
│   │   │   │       ├── PolicyHandler.ts
│   │   │   │       ├── IntentSelectionHandler.ts
│   │   │   │       └── CounterHandler.ts
│   │   │   ├── scenarios/
│   │   │   │   ├── ScenarioLoader.ts
│   │   │   │   ├── ai-2027.ts
│   │   │   │   └── election-crisis.ts
│   │   │   ├── llm/
│   │   │   │   ├── client.ts
│   │   │   │   ├── prompts.ts
│   │   │   │   └── validation.ts
│   │   │   └── types/
│   │   │       └── index.ts (from types-simplified.ts)
│   │   └── package.json
│   │
│   └── cli/
│       ├── src/
│       │   ├── index.ts
│       │   ├── client.ts
│       │   ├── logger.ts
│       │   ├── repl.ts
│       │   ├── phases.ts
│       │   └── auto.ts
│       ├── scripts/
│       │   └── test-game.ts
│       └── package.json
│
└── simulacra_v1_docs/
    ├── simulacra-mvp-design.md
    ├── integration-plan-v2.md
    ├── types-simplified.ts
    └── TASK_BREAKDOWN.md (this file)
```

---

## Daily Checklist

**End of Each Day:**
- [ ] All tests pass
- [ ] Can play full game via CLI
- [ ] Git commit with clear message
- [ ] Update this file with progress notes

**Before Moving to Next Checkpoint:**
- [ ] Existing functionality still works
- [ ] CLI shows all new messages
- [ ] Automated test updated
- [ ] No console errors

---

## Notes & Learnings

(Add notes here as you progress)

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| LLM latency too high | Add loading states, allow regeneration |
| LLM costs too high | Use haiku model, cache results, fallback to templates |
| Complex state sync bugs | Use CLI to observe all messages, add state dump command |
| Players confused by mechanics | Improve debrief clarity, add tooltips, playtest early |
| AP balance issues | Make configurable, add admin override |
| Timer pressure too high | Make timers configurable per scenario |
| ENV too strong/weak | Make ENV aggression configurable |
| Resources feel meaningless | Show impact in debrief, make formulas visible |

---

## Post-MVP Ideas (Parking Lot)

- Web UI with React Flow visualization
- Async/play-by-email mode
- Spectator mode
- Replay system
- Custom scenario editor
- AI players (mixed human/AI games)
- Communication/mail system
- Mobile-optimized UI
- Tournament mode
- Analytics dashboard

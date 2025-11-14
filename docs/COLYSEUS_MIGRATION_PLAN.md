# Simulacra: Colyseus Migration Plan
## Moving from SSE to WebSocket-Based Multiplayer for IRL Event

**Date:** 2025-11-14
**Status:** Approved - Execution Starting
**Target Completion:** 3 weeks (by 2025-12-05)
**Critical Deadline:** IRL Event on 2025-12-12 (4 weeks from now)

---

## Executive Summary

We're migrating from Server-Sent Events (SSE) to Colyseus WebSocket framework to enable stable multiplayer gameplay for an upcoming in-person event and continued user growth.

**Key Facts:**
- **User Validation:** 100+ playthroughs, 20 users, #1 request is "How can I play with friends?"
- **Current Blocker:** SSE connection reliability (~85% success rate) prevents scaling multiplayer
- **Critical Deadline:** IRL event in 4 weeks requires stable 6-player sessions
- **Timeline:** 3 weeks for migration + 1 week buffer/testing before event

**Architecture Decision:**
- **Approach:** Next.js custom server + Colyseus (single service)
- **Auth Strategy:** Room codes (no login required - optimized for IRL event)
- **Risk Mitigation:** Feature flag to keep SSE as backup until event succeeds

**Expected Outcomes:**
- Week 3: Colyseus deployed, stable multiplayer tested with 50+ games
- Week 4 (Event): Confident rollout or SSE backup based on data
- Post-Event: 90% dev time on gameplay features vs. 40% currently

---

## Background: Why We're Doing This

### User Validation (The Evidence)

**Quantitative Data:**
- **100+ playthroughs** across 20 users over 4 weeks
- **15+ users** explicitly asked: "How can I play with friends?"
- **Current SSE reliability:** ~85% (15 connection failures in last 50 sessions)
- **Average session length:** 25 minutes (users are engaged when it works)
- **Connection-related bug reports:** 60% of all reported issues

**Qualitative Feedback:**

> "I love the strategic depth, but the game froze twice during my session. Had to refresh and lost my progress."
> — Early Tester A

> "This would be perfect for our team retreat. Can I run it with 6 people in a conference room?"
> — Potential Customer B

> "The AI opponents are great, but I want to play against my colleagues. When is multiplayer coming?"
> — Beta User C

**Key Insight:** We have product-market fit for the core gameplay. Connection reliability is now the #1 blocker to scaling.

### The IRL Event (Why Now)

**Event Details:**
- **Date:** December 12, 2025 (4 weeks from now)
- **Format:** In-person tabletop exercise with 18-24 participants
- **Setup:** 3-4 concurrent 6-player games
- **Duration:** 2-3 hours including debrief
- **Stakes:** High-visibility demonstration for potential customers/partners

**Requirements:**
- Stable multiplayer for 6 players per session
- Minimal setup friction (no account creation)
- Tech support available, but not constantly needed
- Professional impression (can't have "please refresh" moments)

**Why This Matters:**
- Validates business model (paid facilitated events)
- Potential revenue/partnerships
- User testimonials and case studies
- Stress test for future scale

### Current State: The SSE Problem

Our Next.js app uses Server-Sent Events for real-time updates. This has created significant friction:

#### 1. **Unreliable Connections**

**Symptom:** Games freeze mid-session, require refresh to recover

**Root Cause:**
- SSE connections drop unpredictably (browser, proxy, timeout issues)
- Reconnection logic is custom-built (with AI assistance) and fragile
- No guaranteed message delivery or ordering

**Impact:**
- 15% of sessions experience connection issues
- Users lose trust ("will this crash again?")
- Can't confidently run IRL event with this reliability

#### 2. **Split Communication Protocol**

```
Client ←─── SSE ────── Server  (Receive game state updates)
Client ──── HTTP POST → Server  (Send player actions)
```

**Problems:**
- Two separate channels = two failure modes
- Race conditions: POST succeeds but SSE event missed
- State can diverge between server and client
- Complex error handling (which channel failed?)

**Developer Impact:**
- 60% of debugging time spent on connection issues
- 200+ lines of manual reconnection/retry logic
- "Works on my machine" bugs (timing-dependent)

#### 3. **Manual State Synchronization**

**Current Flow:**
```typescript
// Server sends full state snapshot (5-10 KB JSON)
eventSource.onmessage = (e) => {
  const snapshot = JSON.parse(e.data);

  // Manual merge logic (prone to race conditions)
  setGameState(prev => ({
    ...prev,
    ...snapshot,
    // Hope we merge arrays correctly
    // Hope events arrived in order
    // Hope nothing was lost
  }));
};
```

**Problems:**
- Full state sent each update (wasteful bandwidth)
- No guarantees about event ordering
- Manual merge logic is complex and buggy
- Can't deterministically replay or debug

#### 4. **Multiplayer State Divergence**

**Scenario:**
- Player A and Player B in same game
- Player A's SSE disconnects briefly
- Server updates game state (round advances)
- Player A reconnects, gets stale state
- Player A sees Round 2, Player B sees Round 3
- Game is now broken for Player A

**Current Solution:** "Please refresh"

**Why This Fails for IRL Event:**
- Embarrassing in front of 20 people
- Breaks immersion
- Makes us look unprofessional

---

## The Solution: Colyseus Framework

### What is Colyseus?

Colyseus is a battle-tested Node.js multiplayer game server framework used by hundreds of production games (.io games, turn-based strategy, real-time multiplayer).

**Core Features:**
- **Authoritative state:** Server is single source of truth
- **Automatic sync:** Binary state patches (not full JSON snapshots)
- **Built-in reliability:** Reconnection, state recovery, message ordering
- **Room isolation:** Each game is independent
- **WebSocket transport:** Single bidirectional channel

### How Colyseus Solves Our Problems

#### Before (SSE): Manual Everything

```typescript
// ~200 lines of connection management
let eventSource = null;
let reconnectAttempts = 0;

function connect() {
  eventSource = new EventSource('/api/game/stream');

  eventSource.onerror = () => {
    // We handle: retry logic, backoff, state recovery
    if (reconnectAttempts < 5) {
      setTimeout(() => connect(), Math.pow(2, reconnectAttempts) * 1000);
    }
  };

  eventSource.onmessage = (e) => {
    // We handle: JSON parsing, state merging, error recovery
    const data = JSON.parse(e.data);
    setGameState(prev => /* complex merge logic */);
  };
}

// Separate POST for sending actions
async function submitAction(action) {
  await fetch('/api/game/action', {
    method: 'POST',
    body: JSON.stringify(action)
  });
  // Wait for SSE to confirm? Timeout? Retry? We figure it out.
}
```

#### After (Colyseus): Framework Handles It

```typescript
// ~10 lines total
const room = await client.joinById(roomCode, { role: 'governor' });

// Auto-reconnection (built-in)
room.onStateChange((state) => {
  // State already synchronized, just use it
  setGameState(state.toJSON());
});

// Send message (same channel)
room.send('submit_action', action);

// That's it. Framework handles:
// ✅ Connection health checks
// ✅ Reconnection with state recovery
// ✅ Binary patches (not full snapshots)
// ✅ Message ordering
// ✅ Error handling
```

**Code Reduction:** 95% less boilerplate

#### State Synchronization (The Magic)

**Server changes state:**
```typescript
this.state.round = 5;
this.state.publicScore = 60;
```

**Colyseus automatically:**
1. Detects what changed (round: 4→5, publicScore: 50→60)
2. Generates binary patch (~50 bytes vs 5KB JSON)
3. Broadcasts to all connected clients
4. Clients auto-update their local state

**All connected players see updates simultaneously. No manual sync code. No state divergence.**

---

## Architecture Decision: Custom Server with Room Codes

### The Approach

**Single Service Architecture:**
```
┌─────────────────────────────────────────────┐
│ Next.js + Colyseus (Cloud Run)              │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Next.js Pages                        │  │
│  │ • Landing page                       │  │
│  │ • /lobby (room creation)             │  │
│  │ • /game/[code] (gameplay)            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Colyseus GameRooms                   │  │
│  │ • WebSocket connections              │  │
│  │ • Game state (authoritative)         │  │
│  │ • AI integration (geminiService)     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Admin Dashboard (/admin)             │  │
│  │ • View active games                  │  │
│  │ • Monitor connections                │  │
│  │ • Debug live issues                  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Key Decision:** Custom Next.js server (not separate Stein service)

**Why:**
- Ships faster (2 weeks vs 4-6 weeks for multi-service)
- Simpler deployment (one container, one Cloud Run service)
- Fewer network boundaries (fewer failure modes)
- Can extract later if needed (game-server/ folder is self-contained)

### Authentication Strategy: Room Codes (Not Accounts)

**Decision:** Use shareable room codes instead of account-based auth for MVP.

**How It Works:**
1. Host clicks "Create Game" → generates 6-character code (e.g., "K7M2P9")
2. Room URL: `simulacra.cc/game/K7M2P9`
3. Participants visit URL, choose role, and join (no login)
4. Game starts when all 6 roles filled

**Why Room Codes:**

| Factor | Room Codes | Account-Based Auth |
|--------|------------|-------------------|
| Setup friction | Zero (just share link) | High (signup, verify email) |
| IRL event fit | Perfect (share link/QR code) | Awkward (everyone creates account) |
| Dev time | 1 day | 3-4 days (integration) |
| Privacy | Anonymous (good for testing) | Requires personal info |
| Post-game | No history | Can save stats |

**For IRL Event:**
- Print QR codes on table tents → scan to join
- Or: Display room code on projector → type in browser
- No "create an account" friction during event

**Post-Event Migration Path:**
- Add optional accounts for users who want to save history
- Room codes still work for guests
- Best of both worlds

**Timeline Savings:** 2-3 days (don't build auth integration in Week 1)

---

## Migration Plan (3 Weeks)

### Overview

**Total Timeline:** 15 working days (3 calendar weeks)

**Buffer:** 1 week before IRL event for testing and contingency

**Critical Path:**
- Week 1 (Days 1-5): Core Colyseus migration
- Week 2 (Days 6-10): Multiplayer polish + admin tools
- Week 3 (Days 11-15): Production deploy + stress testing
- Week 4: IRL event prep + final validation

### Phase 0: Pre-Migration Setup (Day 0)

**Goal:** Set up infrastructure for safe migration

**Tasks:**
- [ ] Create feature flag system (`COLYSEUS_ENABLED=true/false`)
- [ ] Document all multiplayer edge cases to handle
- [ ] Set up structured logging (JSON logs with roomId)
- [ ] Create migration checklist document

**Deliverable:** Can toggle between SSE and Colyseus with env var

**Time:** 4 hours

---

### Phase 1: Colyseus Proof of Concept (Days 1-2)

**Goal:** Validate Colyseus solves connection problems

**Day 1 Morning: Custom Server Setup**
- [ ] Install dependencies (`colyseus`, `@colyseus/schema`, `colyseus.js`)
- [ ] Create `server.ts` (Next.js custom server + Colyseus)
- [ ] Test: `npm run dev` starts both Next.js and Colyseus

**Day 1 Afternoon: Basic GameRoom**
- [ ] Define state schema (`GameState`, `Player`)
- [ ] Implement `GameRoom` (onCreate, onJoin, onLeave)
- [ ] Test connection from browser console

**Day 2 Morning: React Client Integration**
- [ ] Create `hooks/useGameRoom.ts` (Colyseus client hook)
- [ ] Test: Can join room, see state updates in real-time

**Day 2 Afternoon: Validation**
- [ ] Test: 2 browser tabs, both see same state
- [ ] Test: Disconnect/reconnect, state recovers
- [ ] Test: Close tab, rejoin with same session

**Decision Gate (End of Day 2):**
- ✅ Can connect to Colyseus room?
- ✅ State synchronization working?
- ✅ Reconnection feels better than SSE?

**If NO to any:** Stop, reassess. Timebox debugging to 2 hours. If still failing, pivot to "fix SSE for IRL event, Colyseus later."

**Deliverables:**
- Custom server running locally
- Basic room with 2 connected clients
- Clear logging of connection events

**Time:** 2 days (16 hours)

---

### Phase 2: Core Game Loop (Days 3-6)

**Goal:** Full game playable end-to-end via Colyseus

**Day 3: Room Code System**
- [ ] Implement room creation with 6-char codes
- [ ] `/lobby` page: "Create Game" → generates code
- [ ] `/game/[code]` page: Join by code
- [ ] Test: Create room, share URL, join from different device

**Day 4: Action Submission Flow**
- [ ] Migrate action selection UI to use `room.send()`
- [ ] Implement message handlers in GameRoom
- [ ] Test: Submit action → state updates for all players

**Day 5: AI Integration**
- [ ] Move `geminiService.ts` calls into GameRoom
- [ ] Make AI calls async (non-blocking)
- [ ] Implement consequence generation
- [ ] Test: Full round (human acts → AI responds → consequences)

**Day 6: Human-to-Human Chat**
- [ ] Add chat message handler
- [ ] Simple chat UI component
- [ ] Test: Players can message each other in real-time

**Decision Gate (End of Day 6):**
- ✅ Can play full game from lobby to end?
- ✅ AI opponents working correctly?
- ✅ Chat functioning?
- ✅ Multiple simultaneous games isolated (don't interfere)?

**If NO:** Extend Phase 2 by 1-2 days. Alert: Timeline at risk.

**Deliverables:**
- Complete game loop working in Colyseus
- Room codes functional
- AI integrated
- Chat working

**Time:** 4 days (32 hours)

---

### Phase 3: Multiplayer Edge Cases (Days 7-9)

**Goal:** Handle real-world failure scenarios

**Day 7: Disconnection Handling**

**Scenarios to Handle:**
- [ ] Player disconnects mid-round → mark as "away," hold round
- [ ] Player reconnects within 60s → resume seamlessly
- [ ] Player disconnects for >60s → remove from game, AI takes over
- [ ] Host leaves → migrate host to another player

**Implementation:**
```typescript
onLeave(client: Client, consented: boolean) {
  if (consented) {
    // Player left intentionally
    this.state.players.delete(client.sessionId);
  } else {
    // Connection lost - allow 60s reconnection
    this.allowReconnection(client, 60).then(() => {
      // Reconnected successfully
      this.broadcast('system_message',
        `${client.sessionId} reconnected`);
    }).catch(() => {
      // Timeout - remove player
      this.state.players.delete(client.sessionId);
    });
  }
}
```

**Day 8: Concurrent Action Submission**

**Problem:** Multiple players submit actions simultaneously

**Solution:**
```typescript
onMessage('submit_action', (client, message) => {
  const player = this.state.players.get(client.sessionId);

  // Prevent duplicate submissions
  if (player.hasSubmitted) {
    return;
  }

  player.hasSubmitted = true;
  player.selectedAction = message.action;

  // Process round when ALL players submitted
  const allSubmitted = Array.from(this.state.players.values())
    .every(p => p.hasSubmitted);

  if (allSubmitted) {
    this.processRound();
  }
});
```

**Day 9: Game Lifecycle**
- [ ] Room disposal (game ends → clean up resources)
- [ ] Idle timeout (no activity for 30 min → close room)
- [ ] Maximum game duration (3 hours → force end)
- [ ] Save final state to Postgres on disposal

**Decision Gate (End of Day 9):**
- ✅ Disconnections handled gracefully?
- ✅ No race conditions in action submission?
- ✅ Games clean up properly?

**Deliverables:**
- Robust handling of network issues
- No edge case crashes
- Game state persisted to DB

**Time:** 3 days (24 hours)

---

### Phase 4: Admin Dashboard (Days 10-11)

**Goal:** Debug live games during IRL event

**Why This Matters:**
- 3-4 concurrent games during IRL event
- When something breaks, need to diagnose in <5 minutes
- Can't rely on "check Cloud Run logs" (too slow)

**Features:**

**Day 10: Game Monitoring**
- [ ] `/admin` page (password-protected)
- [ ] List all active rooms (room code, # players, current round)
- [ ] Click room → detailed view (player list, phase, last actions)
- [ ] Connection status for each player (connected, away, disconnected)

**Day 11: Live Logs & Actions**
- [ ] Real-time logs filtered by room (last 50 events)
- [ ] Manual actions: Force advance round, end game, kick player
- [ ] Export game state as JSON (for post-mortem debugging)

**Example Admin View:**
```
Active Games (3)

Room: K7M2P9 | Round 3 | Phase: Action | Players: 6/6
  ✅ Player 1 (Governor) - Connected
  ✅ Player 2 (Tech CEO) - Connected
  ⚠️  Player 3 (Journalist) - Away (30s)
  ✅ Player 4 (Regulator) - Connected
  ✅ Player 5 (Campaign Mgr) - Connected
  ✅ Player 6 (Cybersecurity) - Connected

  Last Actions:
  12:34:05 - Player 1 submitted action
  12:34:12 - Player 2 submitted action
  12:34:18 - Player 3 disconnected
  12:34:20 - AI generated consequences

  [View Full Logs] [Force Advance Round] [End Game]
```

**Decision Gate (End of Day 11):**
- ✅ Can view all active games in one place?
- ✅ Can diagnose connection issues quickly?
- ✅ Can manually intervene if needed?

**Deliverables:**
- Admin dashboard deployed
- Password-protected
- Works on mobile (for on-site troubleshooting)

**Time:** 2 days (16 hours)

**Priority:** HIGH (essential for IRL event success)

---

### Phase 5: Production Deployment (Days 12-13)

**Goal:** Deploy to staging, then production with feature flag

**Day 12: Staging Deployment**
- [ ] Update Dockerfile for custom server
- [ ] Deploy to Cloud Run (staging environment)
- [ ] Configure env vars (Colyseus port, feature flag)
- [ ] Test: Can access from external network
- [ ] Test: Multiple devices, different networks

**Day 13: Production Rollout (Gradual)**
- [ ] Deploy to production with `COLYSEUS_ROLLOUT=0%`
- [ ] Feature flag logic in client:
  ```typescript
  const useColyseus = Math.random() * 100 < COLYSEUS_ROLLOUT_PERCENT;
  ```
- [ ] Day 13 AM: Set to 10% (test with small user subset)
- [ ] Day 13 PM: Monitor error rates, if <1% → increase to 50%

**Rollout Schedule:**
- Day 13: 10% users on Colyseus
- Day 14-15: 50% users (if no issues)
- Week 4: 100% for IRL event (if confident) OR 0% (SSE backup)

**Decision Gate (End of Day 13):**
- ✅ Deployed to production successfully?
- ✅ Feature flag working (can toggle instantly)?
- ✅ Error rate <1% for Colyseus users?

**Deliverables:**
- Production deployment live
- Feature flag functional
- Monitoring dashboard set up

**Time:** 2 days (16 hours)

---

### Phase 6: Stress Testing (Days 14-15)

**Goal:** Validate readiness for IRL event

**Day 14: Load Testing**
- [ ] Simulate 4 concurrent 6-player games (24 total connections)
- [ ] Run for 2 hours (typical IRL event duration)
- [ ] Monitor: Connection stability, memory usage, CPU, latency
- [ ] Identify bottlenecks

**Day 15: Real User Testing**
- [ ] Recruit 12 testers (2 full games)
- [ ] Run structured test session (2 hours)
- [ ] Collect feedback survey
- [ ] Fix critical bugs found

**Success Metrics (Must Pass):**
- [ ] 0 server crashes during 4-hour test
- [ ] <5% connection issues across all test games
- [ ] Admin dashboard used successfully to diagnose issues
- [ ] Testers rate experience 4+/5 stars

**Decision Gate (End of Day 15):**
- ✅ Load test passed (4 games for 2 hours stable)?
- ✅ Real users completed games without major issues?
- ✅ Confident for IRL event?

**If NO:** Prepare to use SSE backup for event. Colyseus becomes post-event project.

**Deliverables:**
- Load test results documented
- User feedback analyzed
- Critical bugs fixed
- Go/No-Go decision made

**Time:** 2 days (16 hours)

---

### Week 4: IRL Event Preparation (Days 16-20)

**Goal:** Final prep and contingency planning

**Day 16-17: Event Setup Testing**
- [ ] Test on actual hardware (laptops for event)
- [ ] Test on event venue WiFi (if possible) or similar network
- [ ] Print QR codes for room joining
- [ ] Prepare tech support runbook

**Day 18-19: Contingency Planning**
- [ ] Finalize: Colyseus (100%) or SSE (0%) for event
- [ ] If SSE: Prepare "known issues" guide for facilitators
- [ ] If Colyseus: Prepare rollback plan (can switch in 5 min)
- [ ] Tech support person assigned and briefed

**Day 20: Dry Run**
- [ ] Full dress rehearsal (18-24 people if possible)
- [ ] Run through entire event (setup → play → debrief)
- [ ] Final bug fixes

**IRL Event Day (Day 21+):**
- [ ] Arrive early, test setup
- [ ] Monitor admin dashboard throughout
- [ ] Tech support available but not needed
- [ ] Collect feedback for post-event improvements

---

## Risk Mitigation Strategies

### Risk 1: Timeline Overrun (Medium Likelihood, High Impact)

**Failure Mode:**
- Complex bugs take longer than expected
- Reach Day 15, still not confident
- Event in 5 days, Colyseus not ready

**Mitigation:**
- **Timeboxing:** Each phase has hard deadline. If overrunning, escalate decision.
- **Circuit Breakers:**
  - End of Day 6: If core game not working, extend 2 days OR pause
  - End of Day 13: If production errors >5%, halt rollout
  - Day 18 (T-3 days): Go/No-Go decision. If not confident, use SSE backup.
- **Feature Flag:** Can switch to SSE in <5 minutes if needed

**Backup Plan:**
- Use SSE for IRL event (accept 85% reliability)
- Have tech support on-site for quick troubleshooting
- Colyseus becomes post-event priority

**Decision Framework:**
- Day 18: If <90% confident in Colyseus → use SSE for event
- Better to succeed with flaky SSE than fail with buggy Colyseus

---

### Risk 2: Colyseus Doesn't Feel Better (Low Likelihood, Medium Impact)

**Failure Mode:**
- Day 5: "This is still confusing, just different confusing"
- Debugging Colyseus schema bugs instead of SSE reconnection
- Realize we traded one set of problems for another

**Mitigation:**
- **Day 2 Checkpoint:** Explicit validation "Does this feel clearer?"
- **Escape Hatch:** Feature flag means we can revert instantly
- **Learning Resources:** Colyseus docs + community for questions

**If This Happens:**
- Be honest with ourselves
- Revert to SSE, fix specific pain points
- Defer Colyseus to post-event

---

### Risk 3: Production Surprises (Medium Likelihood, Medium Impact)

**Failure Modes:**
- Cloud Run WebSocket behaves differently in production vs local
- Auth cookies don't work cross-domain
- Network latency causes issues
- Cold starts kill active games

**Mitigation:**
- **Early Production Deploy:** Day 12 (staging), Day 13 (prod at 10%)
- **Gradual Rollout:** 10% → 50% → 100% over 1 week
- **Monitoring:** Structured logs, admin dashboard, error tracking
- **Feature Flag:** Can revert to SSE if production issues arise

**Specific Safeguards:**
- Set Cloud Run `min-instances=1` (prevent cold starts)
- Set timeout to 60 minutes (long enough for games)
- Test from multiple networks (WiFi, mobile, VPN)

---

### Risk 4: Multiplayer Edge Cases We Didn't Anticipate (Medium Likelihood, Low Impact)

**Failure Modes:**
- "What if player disconnects during AI turn?"
- "What if two players submit actions simultaneously?"
- "What if host rage-quits?"

**Mitigation:**
- **Phase 3 (Days 7-9):** Dedicated time for edge cases
- **Testing Matrix:** Document all scenarios, test each one
- **Graceful Degradation:** When in doubt, keep game playable
  - Unknown edge case → log error, show message, continue game
  - Don't crash the room

**Example Decision Framework:**
- Player disconnects → allow 60s reconnection
- Timeout → AI takes over, game continues
- Goal: Never let one player's issue crash the game for everyone

---

### Risk 5: IRL Event Technical Issues (Low Likelihood, High Impact)

**Failure Modes:**
- Venue WiFi is terrible
- Connection drops during high-visibility demo
- Bug appears only in production during event

**Mitigation:**
- **Dry Run (Day 20):** Full rehearsal with 18-24 people
- **On-Site Tech Support:** Designated person with admin access
- **Rollback Plan:** Can switch to SSE feature flag in 5 min if disaster
- **Fallback Activity:** If all tech fails, have paper-based backup exercise

**Decision Tree (Event Day):**
```
Issues affecting <10% of players → Tech support fixes, event continues
Issues affecting 10-50% of players → Pause, assess, decide in 5 min
Issues affecting >50% of players → Switch to SSE backup OR paper fallback
```

**Worst Case Acceptance:**
- If tech completely fails, we have non-digital backup
- Event success is about the experience, not the tech
- But we do everything possible to prevent this

---

## Success Criteria

### Week 1 (End of Day 5)
- [ ] ✅ Can 2 developers explain how Colyseus works?
- [ ] ✅ Did 10 test games complete without connection drops?
- [ ] ✅ Does debugging feel easier than SSE? (Subjective but honest)
- [ ] ✅ Is core game loop playable end-to-end?

**If any NO:** Extend timeline by 2 days OR pause migration

---

### Week 2 (End of Day 10)
- [ ] ✅ Multiplayer edge cases handled (disconnects, concurrent actions)
- [ ] ✅ Admin dashboard functional (can view/debug live games)
- [ ] ✅ No critical bugs in last 3 days
- [ ] ✅ Development velocity feels faster (adding features easier)

**If any NO:** Alert stakeholders, discuss contingency

---

### Week 3 (End of Day 15)
- [ ] ✅ Production deployment successful
- [ ] ✅ Load test passed (4 concurrent games, 2 hours, stable)
- [ ] ✅ Real users tested (12+ people, 4+/5 star rating)
- [ ] ✅ Error rate <1% for Colyseus users
- [ ] ✅ Feature flag tested (can switch SSE ↔ Colyseus in <5 min)

**Decision:** GO or NO-GO for using Colyseus at IRL event

---

### IRL Event (Day 21)
- [ ] ✅ All 3-4 games started successfully
- [ ] ✅ <10% connection issues (2-3 players max across all games)
- [ ] ✅ When issues occur, resolved in <5 min using admin dashboard
- [ ] ✅ Participants rate tech experience 4+/5 stars
- [ ] ✅ No "please refresh" moments during high-visibility demos

**Success Definition:** Event achieves goals without tech being a distraction

---

### Post-Event (Week 5+)
- [ ] ✅ Colyseus at 100% rollout for all users
- [ ] ✅ SSE code deleted (no longer needed)
- [ ] ✅ Connection error rate <1% sustained over 2 weeks
- [ ] ✅ Developer velocity: Adding features takes 50% less time
- [ ] ✅ User feedback: "Multiplayer works great"

---

## Technical Implementation Details

### Room Code Generation

```typescript
// lib/roomCodes.ts
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Collision detection (unlikely but handle it)
async function createUniqueRoom(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateRoomCode();
    const existing = await db.room.findUnique({ where: { code } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique room code');
}
```

**Collision Probability:**
- 6 characters from 32-char set = 32^6 = 1.07 billion combinations
- With 100 active rooms, collision probability < 0.00001%

---

### Feature Flag Implementation

```typescript
// lib/featureFlags.ts
export function shouldUseColyseus(): boolean {
  // Server-side: Env var controls rollout percentage
  const rollout = parseInt(process.env.COLYSEUS_ROLLOUT_PERCENT || '0');

  // Consistent per-user (based on session cookie)
  const userId = getUserId(); // From session
  const hash = simpleHash(userId);

  return (hash % 100) < rollout;
}

// In page component
export default function GamePage() {
  const useColyseus = shouldUseColyseus();

  if (useColyseus) {
    return <ColyseusGameScreen />;
  } else {
    return <SSEGameScreen />;  // Keep old code working
  }
}
```

**Rollout Schedule:**
- Week 3, Day 13: `COLYSEUS_ROLLOUT_PERCENT=10`
- Week 3, Day 14: `COLYSEUS_ROLLOUT_PERCENT=50` (if <1% errors)
- Week 4, Day 18: `COLYSEUS_ROLLOUT_PERCENT=100` or `0` (GO/NO-GO decision)

---

### Admin Dashboard API

```typescript
// pages/api/admin/rooms.ts (Next.js API route)
import { matchMaker } from 'colyseus';

export default async function handler(req, res) {
  // Password check
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get all active rooms
  const rooms = await matchMaker.query({});

  const roomData = rooms.map(room => ({
    roomId: room.roomId,
    code: room.metadata?.code,
    clients: room.clients,
    createdAt: room.createdAt,
    // Fetch detailed state from room
  }));

  res.json({ rooms: roomData });
}
```

**Admin Pages:**
- `/admin` - Login with password
- `/admin/rooms` - List all active games
- `/admin/rooms/[id]` - Detailed view of specific game
- `/admin/logs` - Real-time logs (filtered by roomId)

---

### Database Persistence Strategy

**Decision:** Snapshot game state every round + on disposal

```typescript
class GameRoom extends Room<GameState> {

  async onDispose() {
    // Save final state when room closes
    await db.game.create({
      data: {
        roomCode: this.metadata.code,
        finalState: this.state.toJSON(),
        completedAt: new Date(),
        players: this.state.players.size,
        rounds: this.state.round,
      }
    });
  }

  async advanceRound() {
    this.state.round++;

    // Snapshot every 2 rounds (or on game end)
    if (this.state.round % 2 === 0 || this.state.phase === 'end') {
      await this.persistState();
    }
  }

  private async persistState() {
    try {
      await db.gameSnapshot.upsert({
        where: { roomId: this.roomId },
        update: { state: this.state.toJSON(), updatedAt: new Date() },
        create: { roomId: this.roomId, state: this.state.toJSON() }
      });
    } catch (error) {
      // Don't crash room if DB write fails
      console.error('Failed to persist state:', error);
    }
  }
}
```

**Recovery on Reconnect:**
- If player disconnects and reconnects to existing room → Colyseus handles (built-in)
- If room crashes and needs to restart → load from last snapshot (lose 1 round max)

---

### Structured Logging

```typescript
// lib/logger.ts
export const logger = {
  game: (roomId: string, event: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      type: 'game',
      roomId,
      event,
      ...data,
      timestamp: Date.now()
    }));
  },

  connection: (roomId: string, sessionId: string, event: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      type: 'connection',
      roomId,
      sessionId,
      event,
      ...data,
      timestamp: Date.now()
    }));
  },

  error: (context: string, error: Error, data?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      context,
      message: error.message,
      stack: error.stack,
      ...data,
      timestamp: Date.now()
    }));
  }
};

// Usage in GameRoom
logger.game(this.roomId, 'round_start', { round: this.state.round });
logger.connection(this.roomId, client.sessionId, 'player_joined', { role: options.role });
logger.error('ai_generation', error, { roomId: this.roomId, round: this.state.round });
```

**Cloud Run Log Queries:**
```
# View all events for specific room
jsonPayload.roomId="K7M2P9"

# View all connection issues
jsonPayload.type="connection" AND jsonPayload.event="disconnected"

# View all errors in last hour
jsonPayload.level="error" AND timestamp > "2024-12-01T10:00:00Z"
```

---

## Deployment Configuration

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start custom server (Next.js + Colyseus)
CMD ["npm", "start"]
```

### Cloud Run Configuration

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: simulacra
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"  # Prevent cold starts
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containerConcurrency: 1000  # Handles 1000 WebSocket connections per instance
      timeoutSeconds: 3600  # 60 min (long enough for games)
      containers:
      - image: gcr.io/your-project/simulacra
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: COLYSEUS_ROLLOUT_PERCENT
          value: "50"  # Adjust for gradual rollout
        - name: ADMIN_SECRET
          valueFrom:
            secretKeyRef:
              name: admin-secret
              key: password
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        - name: LITELLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: litellm-api-key
              key: key
        resources:
          limits:
            memory: 2Gi
            cpu: "2"
```

**Deployment Command:**
```bash
# Build and push image
docker build -t gcr.io/your-project/simulacra .
docker push gcr.io/your-project/simulacra

# Deploy to Cloud Run
gcloud run services replace cloud-run.yaml \
  --platform managed \
  --region us-central1
```

---

## Post-Event: What Comes Next

### Immediate (Week 5)
- [ ] Debrief IRL event (what worked, what didn't)
- [ ] Fix any issues discovered during event
- [ ] Delete SSE code (if Colyseus successful)
- [ ] Document lessons learned

### Short-Term (Weeks 6-8)
- [ ] Add optional user accounts (preserve room codes for guests)
- [ ] Game history/replay (show past games)
- [ ] Leaderboards (if competitive scoring added)
- [ ] Spectator mode (join game as observer)

### Medium-Term (Months 2-3)
- [ ] Autonomous AI agents (Matrix service - Milestone 2)
- [ ] AI-to-AI communication
- [ ] Tool use (web search, real-world data)
- [ ] Custom scenarios (user-generated content)

### Long-Term (Months 4+)
- [ ] Mobile app (native iOS/Android)
- [ ] Voice chat integration
- [ ] Advanced analytics (decision heatmaps, strategy patterns)
- [ ] Monetization (paid facilitated events, subscriptions)

---

## Appendix A: Key Files Structure

```
simulacra/
├── server.ts                          # NEW: Custom Next.js + Colyseus server
├── game-server/                       # NEW: Colyseus game logic
│   ├── rooms/
│   │   └── GameRoom.ts               # Main game room
│   ├── schema/
│   │   └── GameState.ts              # Colyseus state schema
│   └── lib/
│       └── ai.ts                      # AI service (moved from services/)
├── pages/
│   ├── index.tsx                      # Landing page (keep)
│   ├── lobby.tsx                      # Room creation (keep, update for room codes)
│   ├── game/[code].tsx               # NEW: Join by room code
│   ├── admin/
│   │   ├── index.tsx                 # NEW: Admin login
│   │   ├── rooms.tsx                 # NEW: Game list
│   │   └── rooms/[id].tsx            # NEW: Game details
│   └── api/
│       ├── admin/                     # NEW: Admin API routes
│       └── health.ts                  # NEW: Health check
├── hooks/
│   ├── useGameRoom.ts                # NEW: Colyseus client hook
│   └── useGameController.ts          # OLD: Can keep for SSE fallback
├── components/
│   └── game/                          # Keep all existing components
├── lib/
│   ├── prisma.ts                      # Keep
│   ├── logger.ts                      # NEW: Structured logging
│   ├── roomCodes.ts                   # NEW: Room code generation
│   └── featureFlags.ts                # NEW: Colyseus rollout control
├── services/
│   └── geminiService.ts              # Move to game-server/lib/ai.ts
├── package.json                       # Update: Add colyseus deps, new scripts
├── Dockerfile                         # Update: Custom server build
└── cloud-run.yaml                     # NEW: Cloud Run config
```

---

## Appendix B: Communication Plan

### Internal Team
- **Kickoff Meeting (Day 0):** Review this document, assign responsibilities
- **Daily Standups:** 15 min sync on progress, blockers
- **Decision Gates:** End of Day 2, 6, 13, 15 - explicit go/no-go decisions
- **Week 4 Prep:** Daily check-ins leading up to IRL event

### Stakeholders
- **Week 1 Update:** "Migration underway, core functionality working"
- **Week 2 Update:** "Production deployment scheduled, testing in progress"
- **Week 3 Update:** "GO/NO-GO decision for IRL event" (with data)
- **Post-Event:** "Event debrief, lessons learned, next steps"

### Users (If Applicable)
- **During Migration:** "We're improving multiplayer - you might see experimental features"
- **Week 3:** "New multiplayer launching soon - join us for testing!"
- **Post-Event:** "Stable multiplayer now live for everyone"

---

## Appendix C: Rollback Procedure

**If we need to revert to SSE:**

### Immediate Rollback (< 5 minutes)
```bash
# Set feature flag to 0% (all users on SSE)
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=0

# Verify: All new connections use SSE
# Existing Colyseus rooms finish naturally (don't forcibly disconnect)
```

### Investigation Period (1-2 hours)
- Gather error logs, identify root cause
- Assess: Quick fix? Or deeper issue?

### Decision
- **Quick fix possible:** Fix, test in staging, redeploy, gradually re-enable
- **Deeper issue:** Keep SSE for IRL event, fix Colyseus post-event

### Post-Mortem (After event)
- Document what went wrong
- Decide: Continue Colyseus work or pivot to different solution

---

## Conclusion

### Why This Plan Will Succeed

1. **User-Validated Need:** 100 playthroughs, 20 users, clear demand for multiplayer
2. **Clear Deadline:** IRL event in 4 weeks provides focus and urgency
3. **Realistic Timeline:** 3 weeks + 1 week buffer, with timeboxes and circuit breakers
4. **Risk Mitigation:** Feature flag allows instant rollback, SSE remains available
5. **Right Simplifications:** Room codes over accounts saves 2-3 days
6. **Event-Specific Tools:** Admin dashboard ensures we can debug live issues
7. **Team Alignment:** Clear success criteria, decision gates, communication plan

### What Success Looks Like

**Week 3:**
- Colyseus deployed, load-tested, user-validated
- Feature flag at 50-100%, error rate <1%
- Admin dashboard functional
- Confident (>90%) for IRL event

**IRL Event:**
- 18-24 participants play 3-4 simultaneous games
- Tech works smoothly, no "please refresh" moments
- When issues arise, resolved in <5 min
- Participants focus on strategy, not tech problems

**Post-Event:**
- Colyseus at 100%, SSE deleted
- Development velocity 2x (focus on gameplay, not infrastructure)
- Foundation for autonomous AI agents (Milestone 2)
- Business validated (paid events, partnerships)

---

**Next Steps:**
1. Team review of this document (Day 0)
2. Environment setup (feature flags, logging) (Day 0 afternoon)
3. Begin Phase 1: Custom server + basic room (Day 1 morning)

**Let's ship this.** 🚀

---

**Document Owner:** Development Team
**Last Updated:** 2025-11-14
**Next Review:** End of Week 1 (Day 5), then weekly
**Questions/Feedback:** [Your contact info]

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

## Observability & Monitoring Strategy

### Recommended Stack (Optimized for 4-Week Timeline)

**Phase 1 (Weeks 1-3): Minimal & Effective**

1. **Sentry** - Error tracking & performance monitoring
2. **Environment Variables** - Feature flag control
3. **Cloud Run Logs** - Structured logging (JSON)

**Phase 2 (Post-Event): Enhanced Analytics**

4. **PostHog** - Product analytics, session replay, user behavior

### Sentry Setup (Day 1 - 30 minutes)

**Why Sentry:**
- Free tier: 5,000 errors/month (sufficient for MVP)
- Source map support (see exact TypeScript line that failed)
- Performance monitoring (identify slow AI calls)
- Cloud Run integration (automatic deployment tracking)
- Future-proof: Distributed tracing when Matrix added

**Installation:**

```bash
npm install @sentry/nextjs @sentry/node
npx @sentry/wizard -i nextjs
```

**Configuration:**

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions (cost control)

  // Error filtering (ignore noisy errors)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded', // Browser noise
    'Non-Error promise rejection', // Not actionable
  ],

  // Tag all events with deployment info
  initialScope: {
    tags: {
      service: 'stein',
      version: process.env.VERCEL_GIT_COMMIT_SHA,
    },
  },
});
```

**GameRoom Integration:**

```typescript
// game-server/rooms/GameRoom.ts
import * as Sentry from '@sentry/node';

export class GameRoom extends Room<GameState> {

  onCreate(options: any) {
    // Start Sentry transaction for game session
    const transaction = Sentry.startTransaction({
      op: 'game.session',
      name: 'GameRoom Lifecycle',
      tags: {
        roomCode: this.metadata.code,
        playerCount: options.playerCount,
      },
    });

    Sentry.getCurrentHub().configureScope(scope => {
      scope.setSpan(transaction);
      scope.setTag('roomId', this.roomId);
    });
  }

  async handleAction(client: Client, action: any) {
    const span = Sentry.getCurrentHub().getScope()?.getSpan();
    const childSpan = span?.startChild({
      op: 'game.action',
      description: `Process action: ${action.type}`,
    });

    try {
      // Your game logic here
      await this.processAction(client, action);
      childSpan?.setStatus('ok');
    } catch (error) {
      // Capture error with rich context
      Sentry.captureException(error, {
        tags: {
          roomId: this.roomId,
          actionType: action.type,
          round: this.state.round,
        },
        contexts: {
          game: {
            phase: this.state.phase,
            playerCount: this.state.players.size,
            publicScore: this.state.publicScore,
          },
        },
      });
      childSpan?.setStatus('internal_error');
      throw error;
    } finally {
      childSpan?.finish();
    }
  }

  async callAI(prompt: string) {
    // Track AI call performance
    return await Sentry.startSpan(
      {
        op: 'ai.generation',
        name: 'LLM API Call',
      },
      async () => {
        const response = await geminiService.generate(prompt);
        return response;
      }
    );
  }
}
```

**What You Get:**
- Automatic error alerts (Slack, email)
- Performance waterfall: "User action → Game logic → AI call → Response"
- Error rate dashboard: "5 errors in last hour, all from same room"
- Breadcrumbs: "What happened before the crash?"

**Cost:** Free (up to 5k errors/month)

---

### Feature Flag Strategy (Environment Variables)

**Why NOT PostHog/LaunchDarkly for MVP:**
- PostHog: Adds 100KB to client bundle, API latency on page load
- LaunchDarkly: $50/month minimum, overkill for binary rollout
- Env vars: Instant, free, sufficient for Colyseus 0% → 50% → 100%

**Implementation:**

```typescript
// lib/featureFlags.ts
export const FeatureFlags = {
  COLYSEUS_ENABLED: {
    get rolloutPercent(): number {
      return parseInt(process.env.COLYSEUS_ROLLOUT_PERCENT || '0', 10);
    },

    // Consistent hashing (same user always sees same variant)
    isEnabledForUser(userId: string): boolean {
      const hash = this.simpleHash(userId);
      return (hash % 100) < this.rolloutPercent;
    },

    simpleHash(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },
  },
};

// Usage in component
export default function GamePage() {
  const userId = useUserId(); // From cookie/session
  const useColyseus = FeatureFlags.COLYSEUS_ENABLED.isEnabledForUser(userId);

  return useColyseus ? <ColyseusGameScreen /> : <SSEGameScreen />;
}
```

**Rollout Process:**

```bash
# Week 3, Day 13: 10% of users
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=10

# Monitor in Sentry for 4 hours:
# - Error rate: <1%? ✅ Proceed
# - Performance: No regressions? ✅ Proceed

# Week 3, Day 14: 50% of users
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=50

# Week 4, Day 18 (Pre-event decision):
# - Confident? Set to 100
# - Nervous? Set to 0 (SSE backup)
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=100
```

**Emergency Rollback (< 2 minutes):**

```bash
# From anywhere (phone, laptop)
gcloud run services update simulacra \
  --update-env-vars COLYSEUS_ROLLOUT_PERCENT=0

# All new connections use SSE
# Existing Colyseus rooms finish naturally
```

**Post-Event: Migrate to PostHog (Optional)**

When you want advanced features:
- A/B testing (e.g., test 2 different AI prompt styles)
- Session replay (watch user journey when bug reported)
- Product analytics (which features are used most?)

**Setup (Week 5+):**

```typescript
// lib/posthog.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  loaded: (posthog) => {
    if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing();
  },
});

// Track game events
posthog.capture('game_started', {
  roomCode: room.id,
  playerRole: userRole,
  gameType: 'ai_safety',
});

// Feature flags (replaces env vars)
const useNewPromptStyle = posthog.isFeatureEnabled('new-prompt-style');
```

**Cost:** Free tier: 1M events/month

---

### Distributed Tracing (When Matrix Added - Milestone 2)

**Scenario:** User reports "Round took 10 seconds, felt slow"

**Without distributed tracing:**
- Check Stein logs: "AI call took 5s"
- Check Matrix logs: "LLM call took 4s"
- Manual correlation: 😓 Which Stein request → which Matrix request?

**With distributed tracing (Sentry):**
```
Trace ID: abc-123-def
├─ Stein: handleAction (50ms)
│  ├─ Validate action (5ms)
│  └─ Call Matrix API (4850ms) ← Bottleneck!
│     └─ Matrix: /intelligence/respond
│        ├─ Generate prompt (20ms)
│        └─ LLM API call (4800ms) ← Real bottleneck!
│           └─ OpenAI: chat/completions
└─ Stein: Broadcast state (30ms)

Total: 4930ms
```

**Setup (Milestone 2):**

```typescript
// Stein calls Matrix with trace context
const transaction = Sentry.getCurrentHub().getScope()?.getSpan();

const response = await fetch('http://matrix:8000/intelligence/respond', {
  headers: {
    'sentry-trace': transaction?.toTraceparent(),
    'baggage': transaction?.toBaggage(),
  },
  body: JSON.stringify(gameContext),
});
```

```python
# Matrix receives and continues trace
import sentry_sdk

@app.post("/intelligence/respond")
async def respond(request: Request):
    # Sentry automatically extracts trace headers
    with sentry_sdk.start_transaction(
        op="ai.response",
        name="Generate AI Response",
    ) as transaction:
        with sentry_sdk.start_span(op="llm.call") as span:
            response = await call_llm(context)
            span.set_tag("model", "gemini-2.5-flash")
            span.set_data("prompt_tokens", response.usage.prompt_tokens)
        return response
```

**What You Get:**
- Single trace across Stein → Matrix → LLM
- Identify bottlenecks instantly
- "95% of time spent in LLM call" → optimize prompts, not code

**Cost:** Included in Sentry Performance Monitoring

---

### Structured Logging (Cloud Run)

**Why structured logs:**
- Searchable: `jsonPayload.roomId="K7M2P9"`
- Aggregatable: "Show all disconnection events in last hour"
- Exportable: Send to BigQuery for analysis

**Implementation:**

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  roomId?: string;
  sessionId?: string;
  round?: number;
  phase?: string;
  [key: string]: any;
}

export const logger = {
  log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      severity: level.toUpperCase(),
      message,
      timestamp: new Date().toISOString(),
      service: 'stein',
      ...context,
    };

    console.log(JSON.stringify(entry));
  },

  debug: (msg: string, ctx?: LogContext) => logger.log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => logger.log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => logger.log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => logger.log('error', msg, ctx),
};

// Usage in GameRoom
logger.info('Round started', {
  roomId: this.roomId,
  round: this.state.round,
  playerCount: this.state.players.size,
});

logger.error('AI call failed', {
  roomId: this.roomId,
  error: error.message,
  prompt_length: prompt.length,
});
```

**Cloud Run Queries:**

```
# All events for specific room
jsonPayload.roomId="K7M2P9"

# All errors in last hour
severity="ERROR" AND timestamp>="2024-12-01T10:00:00Z"

# All disconnections
jsonPayload.message="Player disconnected"

# Slow AI calls (if you log duration)
jsonPayload.ai_duration > 5000
```

**Export to BigQuery (Optional, Post-Event):**
```bash
# Create log sink (one-time)
gcloud logging sinks create game-logs \
  bigquery.googleapis.com/projects/your-project/datasets/game_logs \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.service="stein"'

# Now query in BigQuery
SELECT
  jsonPayload.roomId,
  COUNT(*) as error_count
FROM `game_logs.cloudrun_logs`
WHERE severity = 'ERROR'
GROUP BY jsonPayload.roomId
ORDER BY error_count DESC
LIMIT 10
```

---

### Monitoring Dashboard (Day 11 - Part of Admin Dashboard)

**Built-in Metrics View:**

```typescript
// pages/admin/metrics.tsx
export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Fetch from Sentry API or Cloud Run API
    fetch('/api/admin/metrics').then(r => r.json()).then(setMetrics);
  }, []);

  return (
    <div>
      <h1>System Health</h1>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Active Games"
          value={metrics?.activeRooms}
          trend="+3 from 1hr ago"
        />

        <MetricCard
          title="Error Rate"
          value={`${metrics?.errorRate}%`}
          status={metrics?.errorRate < 1 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Avg AI Latency"
          value={`${metrics?.avgAiLatency}ms`}
          status={metrics?.avgAiLatency < 3000 ? 'good' : 'warning'}
        />
      </div>

      <div className="mt-8">
        <h2>Recent Errors (from Sentry)</h2>
        <ErrorList errors={metrics?.recentErrors} />
      </div>

      <div className="mt-8">
        <h2>Performance (Last 24h)</h2>
        <PerformanceChart data={metrics?.performanceTimeseries} />
      </div>
    </div>
  );
}
```

---

### Summary: Observability Evolution

**Week 1 (Minimal - 1 hour setup):**
- ✅ Sentry for errors
- ✅ Env vars for feature flags
- ✅ Structured Cloud Run logs

**Week 3 (Pre-Event - existing tools):**
- ✅ Sentry dashboard for error monitoring
- ✅ Admin dashboard for live game monitoring
- ✅ Cloud Run logs for debugging

**Week 5+ (Enhanced - optional):**
- ✅ PostHog for product analytics
- ✅ Session replay for user research
- ✅ Advanced feature flags (A/B tests)

**Milestone 2 (Matrix Added):**
- ✅ Distributed tracing (Stein ↔ Matrix)
- ✅ Cross-service performance monitoring
- ✅ Unified error tracking

**Cost Breakdown:**
- Sentry: Free (5k errors/month)
- PostHog: Free (1M events/month)
- Cloud Run Logs: Free (50GB/month)
- **Total: $0/month for MVP**

---

## Admin Dashboard: Detailed Specifications

### Purpose

The admin dashboard is **critical for IRL event success**. When 18-24 people are playing and something breaks, you need to diagnose and fix in <5 minutes. This dashboard makes that possible.

### Design Principles

1. **Mobile-First:** Debuggable from phone (you'll be walking around venue)
2. **Real-Time:** Updates without refresh (WebSocket or 5s polling)
3. **Actionable:** Every piece of info has a "what do I do?" action
4. **Zero-Click Triage:** See problem at a glance, drill down for details

### Security

**Authentication:**
```typescript
// middleware.ts (Next.js 13+)
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.ADMIN_SECRET}`;

    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
}
```

**Login Page:**
```typescript
// pages/admin/index.tsx
export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    // Store in localStorage (simple, not production-grade but fine for admin)
    localStorage.setItem('adminToken', password);
    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Access</h1>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-2 rounded bg-gray-700 text-white"
        />
        <button
          onClick={handleLogin}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
```

---

### Page 1: Dashboard Overview

**URL:** `/admin/dashboard`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Simulacra Admin • IRL Event Mode                    ⚙️ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  System Health                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Active   │  │ Error    │  │ Avg      │             │
│  │ Games    │  │ Rate     │  │ Latency  │             │
│  │    3     │  │  0.2%    │  │  1.2s    │             │
│  │  ✅      │  │  ✅      │  │  ✅      │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  Active Games                        🔄 Auto-refresh   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: ABC123 • Round 3 • Action • 6/6 players  │   │
│  │ ✅✅✅✅✅⚠️  Last activity: 15s ago         │   │
│  │ [View Details] [Force Advance] [End Game]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: XYZ789 • Round 2 • Consequence • 6/6     │   │
│  │ ✅✅✅✅✅✅  Last activity: 2s ago          │   │
│  │ [View Details] [Force Advance] [End Game]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: QWE456 • Round 1 • Action • 5/6 players  │   │
│  │ ✅✅✅✅✅❌  Waiting for Player 6...        │   │
│  │ [View Details] [Kick Player 6] [Start Anyway]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Recent Issues (Last 30 min)                           │
│  ⚠️ 3 disconnections in room ABC123                    │
│  ⚠️ Slow AI response in XYZ789 (4.2s)                  │
│  ✅ No critical errors                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Component Implementation:**

```typescript
// pages/admin/dashboard.tsx
import { useEffect, useState } from 'react';
import { matchMaker } from 'colyseus.js';

interface RoomInfo {
  roomId: string;
  code: string;
  round: number;
  phase: string;
  players: PlayerStatus[];
  lastActivity: Date;
}

interface PlayerStatus {
  sessionId: string;
  role: string;
  connected: boolean;
  hasSubmitted: boolean;
}

export default function AdminDashboard() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [metrics, setMetrics] = useState({
    activeGames: 0,
    errorRate: 0,
    avgLatency: 0,
  });

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/admin/rooms', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      const data = await res.json();
      setRooms(data.rooms);
      setMetrics(data.metrics);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const forceAdvanceRound = async (roomId: string) => {
    if (!confirm('Force advance this round? Players may lose progress.')) return;

    await fetch(`/api/admin/rooms/${roomId}/force-advance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });
  };

  const endGame = async (roomId: string) => {
    if (!confirm('End this game? This cannot be undone.')) return;

    await fetch(`/api/admin/rooms/${roomId}/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Simulacra Admin</h1>
          <span className="px-3 py-1 bg-red-600 rounded text-sm">
            IRL Event Mode
          </span>
        </header>

        {/* Health Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Active Games"
            value={metrics.activeGames}
            status={metrics.activeGames > 0 ? 'good' : 'neutral'}
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            status={metrics.errorRate < 1 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Avg Latency"
            value={`${metrics.avgLatency}s`}
            status={metrics.avgLatency < 2 ? 'good' : 'warning'}
          />
        </div>

        {/* Active Games */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            Active Games
            <span className="ml-2 text-sm text-gray-400">
              Auto-refresh every 5s
            </span>
          </h2>

          {rooms.length === 0 && (
            <p className="text-gray-400">No active games</p>
          )}

          {rooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              onForceAdvance={() => forceAdvanceRound(room.roomId)}
              onEndGame={() => endGame(room.roomId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, status }: {
  title: string;
  value: string | number;
  status: 'good' | 'warning' | 'error' | 'neutral';
}) {
  const colors = {
    good: 'bg-green-900 border-green-600',
    warning: 'bg-yellow-900 border-yellow-600',
    error: 'bg-red-900 border-red-600',
    neutral: 'bg-gray-800 border-gray-600',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colors[status]}`}>
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function RoomCard({ room, onForceAdvance, onEndGame }: {
  room: RoomInfo;
  onForceAdvance: () => void;
  onEndGame: () => void;
}) {
  const connectedCount = room.players.filter(p => p.connected).length;
  const totalCount = room.players.length;

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">
            Room: {room.code}
          </h3>
          <p className="text-sm text-gray-400">
            Round {room.round} • {room.phase} • {connectedCount}/{totalCount} players
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {formatTimeSince(room.lastActivity)} ago
        </span>
      </div>

      {/* Player Status Icons */}
      <div className="flex gap-2 mb-3">
        {room.players.map((player) => (
          <PlayerStatusIcon
            key={player.sessionId}
            player={player}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/admin/rooms/${room.roomId}`}
          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
        >
          View Details
        </Link>
        <button
          onClick={onForceAdvance}
          className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700"
        >
          Force Advance
        </button>
        <button
          onClick={onEndGame}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        >
          End Game
        </button>
      </div>
    </div>
  );
}

function PlayerStatusIcon({ player }: { player: PlayerStatus }) {
  if (player.connected && player.hasSubmitted) {
    return <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center" title={`${player.role} - Ready`}>✓</div>;
  }
  if (player.connected) {
    return <div className="w-8 h-8 bg-yellow-600 rounded flex items-center justify-center" title={`${player.role} - Thinking...`}>⏳</div>;
  }
  return <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center" title={`${player.role} - Disconnected`}>✗</div>;
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}
```

---

### Page 2: Room Details

**URL:** `/admin/rooms/[roomId]`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Dashboard          Room: ABC123              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Game State                                             │
│  Room Code: ABC123                                      │
│  Round: 3 / 5                                           │
│  Phase: Action                                          │
│  Public Score: 58                                       │
│  Created: 15 minutes ago                                │
│                                                         │
│  Players (6/6)                          🔄 Live Updates │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✅ Governor (Session: a1b2c3)                   │   │
│  │    Status: Connected • Submitted action         │   │
│  │    Last seen: 5s ago                            │   │
│  │    Hidden score: 12                             │   │
│  │    [Kick] [Send Message]                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ Tech CEO (Session: d4e5f6)                   │   │
│  │    Status: Connected • Waiting for action       │   │
│  │    Last seen: 42s ago  ⚠️ Idle for 42s          │   │
│  │    Hidden score: 8                              │   │
│  │    [Kick] [Send Message] [Nudge]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ❌ Journalist (Session: g7h8i9)                 │   │
│  │    Status: Disconnected (60s ago)               │   │
│  │    Reconnection window: 0s remaining            │   │
│  │    Hidden score: 15                             │   │
│  │    [Remove] [Replace with AI]                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ 3 more players...]                                 │
│                                                         │
│  Recent Actions (Last 10)                              │
│  14:32:15 - Governor submitted: "Investigate claims"   │
│  14:31:58 - Tech CEO submitted: "Issue statement"      │
│  14:31:42 - System: Round 3 started                    │
│  14:30:15 - AI: Consequence calculated (-5 trust)      │
│  14:29:48 - Journalist disconnected                    │
│                                                         │
│  Game Events Log (Last 50)        [Export Full JSON]   │
│  [Scrollable log with timestamps...]                   │
│                                                         │
│  Admin Actions                                         │
│  [Force Advance Round] [Pause Game] [End Game]         │
│  [Export State] [Replay from Round 2]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
// pages/api/admin/rooms/[roomId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { matchMaker } from 'colyseus';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth check
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { roomId } = req.query;

  try {
    // Get room from Colyseus
    const room = await matchMaker.getRoomById(roomId as string);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Call special admin method on room to get detailed state
    const detailedState = await room.state.toJSON(); // Or custom method

    res.json({
      roomId: room.roomId,
      code: room.metadata?.code,
      state: detailedState,
      clients: room.clients.map(client => ({
        sessionId: client.sessionId,
        // ... more client info
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**Admin Actions Implementation:**

```typescript
// game-server/rooms/GameRoom.ts
export class GameRoom extends Room<GameState> {

  // Allow admins to call special methods
  onMessage('admin:force_advance', (client, message) => {
    // Verify this is admin (check special admin session)
    if (!this.isAdmin(client)) {
      return;
    }

    logger.warn('Admin forced round advance', {
      roomId: this.roomId,
      adminSession: client.sessionId,
    });

    // Force advance round
    this.advanceRound();
  });

  onMessage('admin:kick_player', (client, message) => {
    if (!this.isAdmin(client)) return;

    const targetClient = this.clients.find(c => c.sessionId === message.sessionId);
    if (targetClient) {
      targetClient.leave(4000); // Kick with code 4000
      logger.warn('Admin kicked player', {
        roomId: this.roomId,
        kickedSession: message.sessionId,
      });
    }
  });

  onMessage('admin:pause_game', (client, message) => {
    if (!this.isAdmin(client)) return;

    this.state.paused = true;
    this.broadcast('system_message', 'Game paused by admin');

    logger.info('Admin paused game', { roomId: this.roomId });
  });

  private isAdmin(client: Client): boolean {
    // Simple check: admin connects with special metadata
    return client.auth?.isAdmin === true;
  }
}
```

---

### Page 3: Live Logs

**URL:** `/admin/logs`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Live Logs                                    🔴 LIVE    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filters:                                               │
│  Room: [All ▼] Level: [All ▼] Search: [________]       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 14:35:22 INFO  [ABC123] Round 3 started         │   │
│  │ 14:35:18 DEBUG [ABC123] AI call started         │   │
│  │ 14:35:15 ERROR [XYZ789] Connection lost          │   │
│  │              sessionId: g7h8i9                   │   │
│  │              reason: Network timeout             │   │
│  │              [View Full Error]                   │   │
│  │ 14:35:10 INFO  [ABC123] Player action received  │   │
│  │              player: Governor                    │   │
│  │              action: Investigate claims          │   │
│  │ 14:35:05 WARN  [QWE456] Slow AI response        │   │
│  │              duration: 4200ms                    │   │
│  │              model: gemini-2.5-flash             │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Pause Auto-scroll] [Export Last 1000] [Clear]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Real-Time Implementation (Server-Sent Events):**

```typescript
// pages/api/admin/logs/stream.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Subscribe to log stream (using EventEmitter or similar)
  const logListener = (logEntry: any) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  globalLogEmitter.on('log', logListener);

  // Clean up on disconnect
  req.on('close', () => {
    globalLogEmitter.off('log', logListener);
  });
}

// In your logger
// lib/logger.ts
import { EventEmitter } from 'events';

export const globalLogEmitter = new EventEmitter();

export const logger = {
  log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      ...context,
    };

    console.log(JSON.stringify(entry));

    // Also emit for admin dashboard
    globalLogEmitter.emit('log', entry);
  },
  // ... rest of logger
};
```

---

### Mobile-Responsive Design

**Tailwind CSS Responsive Classes:**

```typescript
// Example: RoomCard component with mobile optimization
function RoomCard({ room }: { room: RoomInfo }) {
  return (
    <div className="
      bg-gray-800 p-4 rounded-lg border border-gray-700
      md:p-6 /* Larger padding on desktop */
    ">
      <div className="
        flex flex-col gap-2
        md:flex-row md:justify-between md:items-start /* Row layout on desktop */
      ">
        <div>
          <h3 className="text-base md:text-lg font-semibold">
            Room: {room.code}
          </h3>
          <p className="text-xs md:text-sm text-gray-400">
            Round {room.round} • {room.phase}
          </p>
        </div>
      </div>

      {/* Player status icons - scrollable on mobile */}
      <div className="
        flex gap-2 overflow-x-auto py-2
        md:overflow-x-visible /* No scroll on desktop */
      ">
        {room.players.map(p => <PlayerIcon key={p.id} player={p} />)}
      </div>

      {/* Action buttons - stack on mobile */}
      <div className="
        flex flex-col gap-2
        md:flex-row /* Horizontal on desktop */
      ">
        <button className="px-3 py-2 bg-blue-600 rounded text-sm">
          View Details
        </button>
        <button className="px-3 py-2 bg-yellow-600 rounded text-sm">
          Force Advance
        </button>
      </div>
    </div>
  );
}
```

---

### Admin Dashboard Summary

**What You Get:**

1. **Dashboard Page:**
   - See all active games at a glance
   - System health metrics (error rate, latency)
   - Quick actions (force advance, end game)

2. **Room Details Page:**
   - Deep dive into specific game
   - Player connection status
   - Recent actions and events
   - Admin interventions

3. **Live Logs Page:**
   - Real-time event stream
   - Filterable by room, level, keyword
   - Export for post-mortem analysis

4. **Mobile Support:**
   - Works on phone (you're walking around venue)
   - Touch-friendly buttons
   - Responsive layout

**Time to Build:**
- Day 10: Dashboard + Room Details (8 hours)
- Day 11: Live Logs + Polish (6 hours)
- Total: 14 hours (2 days as scheduled)

**Priority:** HIGH - Essential for IRL event

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

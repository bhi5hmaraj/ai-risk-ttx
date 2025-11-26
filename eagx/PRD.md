> Note: This document has been modularized. See `eagx/prd/README.md` for split sections.
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
- **Approach:** Express-first single service on Cloud Run: Express + Colyseus (WS + custom routes) with Next.js mounted as the request handler
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

## Architecture Decision: Express‑First Single Deployment (Room Codes)

### The Approach

**Single Service Architecture (Cloud Run):**
```
┌─────────────────────────────────────────────┐
│ Express + Colyseus + Next handler (Cloud Run) │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Next.js Pages (mounted handler)      │  │
│  │ • Landing page                       │  │
│  │ • /lobby (room creation)             │  │
│  │ • /game/[code] (gameplay)            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Colyseus GameRooms (WS)              │  │
│  │ • WebSocket connections              │  │
│  │ • Game state (authoritative)         │  │
│  │ • AI agents (OpenAI Agents SDK)      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Colyseus Admin (/colyseus-admin/*)   │  │
│  │ • View active games                  │  │
│  │ • Monitor connections                │  │
│  │ • Debug live issues                  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Key Decision:** Express‑first Node server hosting Colyseus and custom routes, with the Next.js app mounted as a handler.

**Why:**
- First‑class WebSocket control via Colyseus on the same HTTP server
- Keep Next.js “stock” (no custom Next server semantics), easier upgrades
- Clear separation for admin endpoints: Next Admin UI at `/admin`; Colyseus ops API at `/colyseus-admin/*`; plus `/healthz`.
- One simple Cloud Run service; can split later if needed

### Reuse Plan: Warden Dilemma Code → Simulacra

We will reuse proven patterns from `llm-reward-hacking-demos/warden_dilemma` without copying runtime code yet. Scope below keeps EAGx simple while accelerating wiring.

What to borrow (as references/snippets)
- Express app wiring: `server/src/http/app.ts` → our `server/index.ts` createApp equivalent (CORS, trust proxy, JSON).
- Health/debug endpoints: `http/health.ts`, `http/debug.ts` → `/healthz`, `/admin/debug/*` (read‑only) using `matchMaker.query`.
- Room registration: `bootstrap/rooms.ts` → centralize `game` (+ optional `lobby`) registration and filtering hints.
- Redis driver/presence toggles: `bootstrap/redis.ts` → keep optional env‑based drivers (post‑event; EAGx stays single‑instance).
- Client WS URL strategy: `client/src/services/colyseus.service.ts` → same‑origin WS with `VITE_COLYSEUS_URL` override for dev.

Adaptations for Simulacra
- Next handler instead of static: mount Next at `app.all('*', handle)`; no static serving like Warden’s `/warden_dilemma`.
- Namespacing: Simulacra uses root (`/`); Next Admin UI stays at `/admin`; Colyseus ops API at `/colyseus-admin/*`; health at `/healthz`.
- Reconnection: add `allowReconnection(client, 120)` in `GameRoom.onLeave` and client auto‑reconnect (Warden does not yet).
- Tokens/roles: reuse Warden’s lobby→game token map pattern, but roles map to Simulacra stakeholders; enforce token on join.

Non‑goals for EAGx
- No Redis presence in event build (keep `max-instances=1`).
- No code copy of Warden rooms; only reuse structure and message patterns.
- No MCP/Python agents pre‑event.

Acceptance (reuse successful when)
- Health/debug endpoints list rooms and basic metadata via `matchMaker.query`.
- Joining a room by code works with token enforcement.
- Client connects via same‑origin WS; `VITE_COLYSEUS_URL` works for split‑dev.

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

**Day 1 Morning: Express + Colyseus + Next wiring**
- [ ] Install dependencies (`colyseus`, `@colyseus/schema`, `colyseus.js`)
- [ ] Create `server/index.ts` (Express app + Colyseus; mount Next handler)
- [ ] Test: `npm run dev` starts Express/Colyseus and serves Next pages

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

**Day 5: AI Integration (OpenAI Agents SDK)**
- [ ] Set up AgentManager with LiteLLM proxy configuration
- [ ] Initialize AI agents in GameRoom.onCreate() (one per AI player)
- [ ] Define agent tools (send_message, submit_action)
- [ ] Implement agent conversation flow (system prompt + game state → agent decision)
- [ ] Test: Full round (human acts → AI agent responds → consequences)
- [ ] Verify agent memory persists across rounds

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
- [ ] Update Dockerfile for Express-first server (Colyseus + Next handler)
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

### Risk 3: AI Agent Complexity (Low Likelihood, Medium Impact) - MITIGATED BY ARCHITECTURE

**Original Concern (If Using Python Matrix):**
- Complex inter-service communication (WebSocket/HTTP bridge)
- Schema coupling between TypeScript and Python
- Debugging across language boundaries
- State synchronization issues

**How MVP Architecture Mitigates This:**
- ✅ **Single Language:** Everything in TypeScript (one mental model)
- ✅ **In-Process Agents:** Direct function calls (no network layer)
- ✅ **OpenAI Agents SDK:** Production-ready, well-maintained library
- ✅ **LiteLLM Proxy:** Already proven infrastructure (100+ playthroughs)

**Remaining Risks:**
- Agent SDK might have bugs (low likelihood - official OpenAI library)
- LiteLLM proxy downtime (mitigate: fallback to direct OpenAI)
- Agent memory issues (mitigate: test thoroughly in Phase 2)

**Mitigation:**
- **Day 5-6:** Extensive agent testing (memory persistence, tool calling)
- **Fallback:** If Agent SDK fails, revert to direct OpenAI chat completions (simpler)
- **MCP Future Path:** Can add Python tools post-event if needed (not blocking MVP)

**Decision Framework:**
- If Agent SDK working by Day 6 → proceed
- If blocking issues → fallback to direct chat completion API
- Post-event: revisit Python Matrix via MCP if simulation quality priority

---

### Risk 4: Production Surprises (Medium Likelihood, Medium Impact)

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

### Risk 5: Multiplayer Edge Cases We Didn't Anticipate (Medium Likelihood, Low Impact)

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

### Risk 6: IRL Event Technical Issues (Low Likelihood, High Impact)

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
      const res = await fetch('/colyseus-admin/rooms', {
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

    await fetch(`/colyseus-admin/rooms/${roomId}/force-advance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });
  };

  const endGame = async (roomId: string) => {
    if (!confirm('End this game? This cannot be undone.')) return;

    await fetch(`/colyseus-admin/rooms/${roomId}/end`, {
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
          href={`/colyseus-admin/rooms/${room.roomId}`}
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

**URL:** `/colyseus-admin/rooms/[roomId]`

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

**API Endpoint (Express route on the same server):**

```typescript
// server/routes/admin.ts
import { Router } from 'express';
import { matchMaker } from 'colyseus';

const router = Router();

const requireAdmin = (req, res, next) => {
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/rooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const room = await matchMaker.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const detailedState = room.state.toJSON();
    res.json({
      roomId: room.roomId,
      code: room.metadata?.code,
      state: detailedState,
      clients: room.clients.map((c) => ({ sessionId: c.sessionId })),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
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

## Remote Config with Firebase

### Overview

**Problem:** During IRL event, you need to change configuration quickly without:
- Losing old versions (audit trail)
- Breaking active games (consistency)
- Deploying code
- Reinventing the wheel (version control, admin UI, SDKs)

**Solution:** Firebase Remote Config

### Why Firebase Remote Config?

| Feature | Firebase | ConfigCat | Flagsmith |
|---------|----------|-----------|-----------|
| **Pricing** | **FREE** (unlimited) | Free → $49/mo | Free (self-host) |
| **Version History** | **300 versions** (1-click rollback) | Audit log only | Audit log only |
| **Audit Trail** | Who/what/when/how | Who/what/when | Who/what/when |
| **Ecosystem** | **Google Cloud** (same as Cloud Run) | Standalone | Standalone |
| **Server SDK** | ✅ Python (firebase-admin) | ✅ Node.js | ✅ Node.js/Python |
| **Admin UI** | ✅ Firebase Console | ✅ ConfigCat dashboard | ✅ Flagsmith dashboard |
| **A/B Testing** | ✅ 24 concurrent experiments | ✅ (paid) | ✅ |
| **Parameter Limit** | **3,000 per template** | 10 → 100 → ∞ (paid) | Unlimited |

**Why Firebase Wins:**
- ✅ **Completely free** (no paid tier needed)
- ✅ **Already in Google Cloud** (same ecosystem as Cloud Run)
- ✅ **300 version history** with one-click rollback
- ✅ **Python Admin SDK** (perfect for Matrix server)
- ✅ **Separate server templates** (not exposed to clients)

### What You'll Configure

Instead of just prompts, manage **all runtime config**:

```json
{
  "prompt_system": "You are a Game Master...",
  "prompt_consequence": "Generate consequences...",
  "prompt_action_options": "Generate 5 actions...",
  "prompt_counterfactual": "What if no one acted?",
  "prompt_agent_dialogue": "You are an AI agent...",

  "game_timer_seconds": 300,
  "game_max_rounds": 5,
  "game_action_points": 3,

  "feature_multiplayer_enabled": false,
  "feature_debug_mode": false,

  "ai_model": "gpt-4o-mini",
  "ai_temperature": 0.7,
  "ai_max_tokens": 2000,

  "netlogo_model_path": "/models/election_crisis.nlogo",
  "mesa_agent_count": 50
}
```

### Firebase Setup

**1. Create Firebase Project:**

```bash
# Firebase Console: https://console.firebase.google.com
# 1. Create new project (or use existing)
# 2. Go to Remote Config
# 3. Create server template (separate from client template)
```

**2. Add Parameters in Firebase Console:**

For each parameter above, create in Firebase Console:
- Key: `prompt_system`
- Type: String
- Default value: "You are a Game Master..."

**3. Download Service Account Key:**

```bash
# Firebase Console → Project Settings → Service Accounts
# Generate new private key → Download JSON
# Save as: matrix-server/firebase-service-account.json
```

---

## AI Agents Architecture (OpenAI Agents SDK)

### Overview

**MVP Decision:** All AI agents run **in-process with Colyseus** using OpenAI Agents SDK (TypeScript).

**Key Design Decision:** TypeScript-only for MVP
- ✅ Fast to ship (4-week deadline)
- ✅ No language bridges needed
- ✅ Direct function calls (no HTTP/WebSocket translation)
- ✅ Official OpenAI SDK (well-maintained, production-ready)
- ✅ Can migrate to Python Matrix post-event if needed

**Post-MVP Option:** Add Python Matrix server for heavy simulations (NetLogo, Mesa) via MCP protocol.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Next.js Custom Server (TypeScript/Node.js)              │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ HTTP Handler (Next.js)                              │ │
│ │  - Serves frontend pages (/lobby, /game/[code])    │ │
│ │  - API routes (/api/feedback, /api/scenarios)      │ │
│ │  - Static assets                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ WebSocket Handler (Colyseus)                        │ │
│ │                                                     │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │ GameRoom (State Management)                  │  │ │
│ │  │  - Human players (WebSocket connections)     │  │ │
│ │  │  - AI players (visible in state)             │  │ │
│ │  │  - Game state synchronization                │  │ │
│ │  └────────────┬─────────────────────────────────┘  │ │
│ │               │                                     │ │
│ │               │ Direct function calls               │ │
│ │               ▼                                     │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │ OpenAI Agents SDK                            │  │ │
│ │  │                                              │  │ │
│ │  │  Agent Bob = new Agent({                    │  │ │
│ │  │    name: "Regulator",                       │  │ │
│ │  │    model: "gemini/gemini-2.0-flash-exp",   │  │ │
│ │  │    client: litellmProxy,                    │  │ │
│ │  │    tools: [send_message, submit_action]     │  │ │
│ │  │  })                                         │  │ │
│ │  │                                              │  │ │
│ │  │  Agent Eve = new Agent({ ... })             │  │ │
│ │  │                                              │  │ │
│ │  │  Conversation history in memory             │  │ │
│ │  └──────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Firebase Admin SDK                                  │ │
│ │  - Remote Config (prompts, game params, AI config) │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ LiteLLM Proxy
                     ▼
          ┌──────────────────────┐
          │ asgard.bhishmaraj.org│
          │ (LiteLLM Proxy)      │
          │  → Gemini 2.0 Flash  │
          └──────────────────────┘
```

**Everything in ONE TypeScript process**

### Agent Lifecycle

**Agent instances persist for entire game duration:**

1. **Created in `GameRoom.onCreate()`** - One agent per AI player
2. **Conversation history maintained in memory** - Agent SDK handles this automatically
3. **Remembers all past rounds** - Actions, messages, outcomes
4. **Destroyed in `GameRoom.onDispose()`** - Memory freed when game ends

**Key principle:** Each game gets fresh agent instances with clean history.

### LiteLLM Integration

**Gemini via LiteLLM Proxy:**

```typescript
import OpenAI from 'openai';

const litellm = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY,
  baseURL: 'https://asgard.bhishmaraj.org',
});

const agent = new Agent({
  model: 'gemini/gemini-2.0-flash-exp',  // LiteLLM model format
  client: litellm,                        // Point to proxy
  // Agent SDK sends chat completions to LiteLLM
  // LiteLLM routes to Gemini
  // Cost-effective + works with existing infrastructure
});
```

**Local Conversation State:**
- Agent SDK maintains messages array internally
- Full history sent to LiteLLM on each turn
- Gemini sees: system prompt → user messages → assistant responses → tool calls
- No server-side state needed (conversations are short ~30 mins)

### Database Schema

```prisma
// prisma/schema.prisma

model GameSnapshot {
  id            String   @id @default(cuid())
  gameId        String
  round         Int
  timestamp     DateTime @default(now())

  // Full state at this moment
  gameState     Json
  events        Json

  // Config snapshot from Firebase
  configSnapshot Json  // Which Firebase config was active

  // Performance metrics
  aiLatency     Int?
  errorCount    Int      @default(0)

  game          Game     @relation(fields: [gameId], references: [id])

  @@index([gameId, round])
  @@index([timestamp])
}
```

### Implementation

**File: `server/index.ts` (Express‑first: Colyseus + Next handler)**

```typescript
import { createServer } from 'http';
import express from 'express';
import next from 'next';
import cors from 'cors';
import { Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import adminRoutes from './routes/admin';
import { GameRoom } from './game-server/rooms/GameRoom';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);

async function main() {
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();
  app.set('trust proxy', true);
  app.use(cors({ origin: [/\.vercel\.app$/, 'https://simulacra.cc'], credentials: true }));
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.send('ok'));
  app.use('/colyseus-admin', adminRoutes); // avoid clash with Next Admin UI at /admin

  const httpServer = createServer(app);

  const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define('game', GameRoom);

  app.all('*', (req, res) => handle(req, res));
  httpServer.listen(port, () => {
    console.log(`> Express + Colyseus + Next ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**File: `game-server/agents/AgentManager.ts`**

```typescript
import { Agent } from '@openai/agents';
import OpenAI from 'openai';
import admin from 'firebase-admin';

export class AgentManager {
  private openai: OpenAI;
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.LITELLM_API_KEY!,
      baseURL: 'https://asgard.bhishmaraj.org',
    });
  }

  async initializeAgent(
    agentId: string,
    role: string,
    config: Record<string, any>
  ): Promise<Agent> {
    const agent = new Agent({
      name: `${agentId} (${role})`,
      instructions: config[`prompt_agent_${role}`] || 'You are an AI agent...',
      model: config.ai_model || 'gemini/gemini-2.0-flash-exp',
      client: this.openai,
      temperature: config.ai_temperature || 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'send_message',
            description: 'Send a message to another player',
            parameters: {
              type: 'object',
              properties: {
                targetPlayerId: { type: 'string' },
                content: { type: 'string' },
                intent: {
                  type: 'string',
                  enum: ['inform', 'request', 'negotiate', 'threaten']
                },
              },
              required: ['targetPlayerId', 'content'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'submit_action',
            description: 'Submit your chosen action for this round',
            parameters: {
              type: 'object',
              properties: {
                actionId: { type: 'string' },
                reasoning: { type: 'string' },
              },
              required: ['actionId'],
            },
          },
        },
      ],
    });

    this.agents.set(agentId, agent);
    return agent;
  }

  async runAgent(agentId: string, context: any): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    return await agent.run({
      messages: [{
        role: 'user',
        content: this.buildContextMessage(context),
      }],
    });
  }

  private buildContextMessage(context: any): string {
    return `
Round ${context.round} Update:
Crisis: ${context.currentCrisis}
Public Score: ${context.publicScore}

Available Actions:
${context.availableActions.map((a: any, i: number) =>
  `${i + 1}. ${a.title} (${a.cost} points)`
).join('\n')}

What action do you want to take?
    `.trim();
  }
}
```

**File: `game-server/rooms/GameRoom.ts`**

```typescript
import { Room, Client } from '@colyseus/core';
import { GameState, Player } from './schema/GameState';
import { AgentManager } from '../agents/AgentManager';
import admin from 'firebase-admin';

export class GameRoom extends Room<GameState> {
  private agentManager: AgentManager;
  private config: Record<string, any> = {};

  async onCreate(options: { scenario: string }) {
    this.setState(new GameState());

    // Fetch Firebase Remote Config
    const template = await admin.remoteConfig().getServerTemplate();
    this.config = this.extractConfig(template);

    // Initialize AI agent manager
    this.agentManager = new AgentManager();

    // Add AI agent players (visible in state)
    this.state.players.push(new Player('agent_bob', 'Bob', 'ai_agent', 'regulator'));
    this.state.players.push(new Player('agent_eve', 'Eve', 'ai_agent', 'tech_ceo'));

    // Initialize agents
    await this.agentManager.initializeAgent('agent_bob', 'regulator', this.config);
    await this.agentManager.initializeAgent('agent_eve', 'tech_ceo', this.config);
  }

  async advanceRound() {
    this.state.round++;
    this.state.phase = 'ACTION';

    // Trigger AI agent deliberation (runs in parallel)
    await this.triggerAgentDeliberation();
  }

  private async triggerAgentDeliberation() {
    const context = {
      round: this.state.round,
      publicScore: this.state.publicScore,
      currentCrisis: this.state.currentEvent.description,
      availableActions: this.state.currentActionOptions,
    };

    // Run all agents in parallel
    const agentIds = ['agent_bob', 'agent_eve'];
    await Promise.all(
      agentIds.map(id => this.agentManager.runAgent(id, context))
    );
  }

  // Agent tool calls handled here
  async handleAgentToolCall(agentId: string, toolName: string, args: any) {
    if (toolName === 'send_message') {
      await this.handleAgentMessage(agentId, args);
    } else if (toolName === 'submit_action') {
      await this.handleAgentActionSubmit(agentId, args);
    }
  }

  private async handleAgentMessage(agentId: string, args: any) {
    const { targetPlayerId, content } = args;

    // Find target player's WebSocket connection
    const targetClient = this.clients.find(c => {
      const player = this.state.players.find(p => p.sessionId === c.sessionId);
      return player?.id === targetPlayerId;
    });

    // Send message via WebSocket
    targetClient?.send('agent_message', {
      from: agentId,
      content,
    });
  }

  private async handleAgentActionSubmit(agentId: string, args: any) {
    const { actionId } = args;
    const agent = this.state.players.find(p => p.id === agentId);

    agent.selectedActionId = actionId;
    agent.hasSubmittedAction = true;

    // Check if all players submitted
    if (this.allPlayersSubmitted()) {
      await this.processRound();
    }
  }

  private extractConfig(template: any): Record<string, any> {
    const config: Record<string, any> = {};
    for (const [key, param] of Object.entries(template.parameters)) {
      config[key] = (param as any).defaultValue?.value || '';
    }
    return config;
  }
}
```

**File: `package.json`**

```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server/index.ts"
  },
  "dependencies": {
    "next": "^14.0.0",
    "@colyseus/core": "^0.15.0",
    "@colyseus/ws-transport": "^0.15.0",
    "@openai/agents": "^0.1.0",
    "openai": "^4.0.0",
    "firebase-admin": "^12.0.0"
  }
}
```

### Event Day Workflow (Firebase)

**Scenario: AI is too pessimistic in Round 3**

1. **Open** Firebase Console (`console.firebase.google.com`)
2. **Navigate** to Remote Config → Server template
3. **Edit** `prompt_consequence` parameter
4. **Change value:**
   ```
   Old: "Describe realistic consequences..."
   New: "Describe consequences with cautious optimism..."
   ```
5. **Publish changes** (creates new version)
6. **New games** pick up change immediately
7. **Active games** continue with their snapshot

**Benefits:**
- ✅ Takes 30 seconds
- ✅ No code deploy
- ✅ 300 version history
- ✅ One-click rollback
- ✅ Completely free

---

## MCP Protocol Integration (Future Extensibility)

### Overview

**MCP (Model Context Protocol)** is a standard protocol for connecting AI agents to external tools and services. This enables future migration to Python-based simulations without rewriting the entire agent system.

**Current State (MVP):** TypeScript-only agents with direct function calls

**Post-Event Option:** Add Python tools via MCP for advanced simulations (NetLogo, Mesa, ABM frameworks)

### Why MCP?

**Problem:** Want to use Python simulation libraries (NetLogo via pyNetLogo, Mesa ABM, etc.) but agents are in TypeScript

**Traditional Solution:** Build HTTP API bridge, maintain OpenAPI contracts, handle serialization

**MCP Solution:** Standard protocol for tool calling across languages

**Benefits:**
- ✅ **No HTTP bridge needed** - MCP handles communication
- ✅ **Standard protocol** - Works with any MCP-compatible tool
- ✅ **Type safety** - JSON Schema for all tool inputs/outputs
- ✅ **Minimal agent code changes** - Just add MCP client, same Agent SDK API
- ✅ **Future-proof** - Can add more tools (databases, APIs, etc.) later

### Architecture with MCP

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js Custom Server (TypeScript)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ GameRoom + OpenAI Agents SDK                           │ │
│  │                                                        │ │
│  │  Agent Bob = new Agent({                              │ │
│  │    tools: [                                           │ │
│  │      { type: 'function', function: send_message },    │ │
│  │      { type: 'function', function: submit_action },   │ │
│  │      { type: 'mcp', server: 'simulation' }  ← NEW!    │ │
│  │    ]                                                  │ │
│  │  })                                                   │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│                          │ MCP Protocol (stdio/HTTP)         │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ MCP Client (TypeScript)                                │ │
│  │  - Connects to MCP servers                             │ │
│  │  - Translates tool calls to MCP requests               │ │
│  │  - Handles results back to agent                       │ │
│  └───────────────────────┬────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ MCP Protocol
                           ▼
        ┌──────────────────────────────────────┐
        │ MCP Server (Python subprocess)       │
        │                                      │
        │  @mcp.tool()                         │
        │  def run_netlogo_simulation(params): │
        │    nl = pyNetLogo.NetLogoLink()     │
        │    nl.load_model('ai-spread.nlogo') │
        │    results = nl.run(params)         │
        │    return results                   │
        │                                      │
        │  @mcp.tool()                         │
        │  def run_mesa_model(scenario):       │
        │    model = SocialMediaModel()       │
        │    model.run(scenario)              │
        │    return model.datacollector.get()  │
        └──────────────────────────────────────┘
```

### Implementation Example

**Step 1: Create Python MCP Server**

```python
# tools/mcp_simulation_server.py
import mcp
from pynetlogo import NetLogoLink
from mesa import Model, Agent

server = mcp.Server("simulation-tools")

@server.tool(
    name="simulate_ai_spread",
    description="Run NetLogo simulation of AI misinformation spread",
    input_schema={
        "type": "object",
        "properties": {
            "initial_infected": {"type": "number"},
            "network_density": {"type": "number"},
            "intervention": {"type": "string"}
        },
        "required": ["initial_infected", "network_density"]
    }
)
def simulate_ai_spread(initial_infected: int, network_density: float, intervention: str = None):
    """Run NetLogo ABM simulation"""
    nl = NetLogoLink(gui=False)
    nl.load_model('models/ai-misinformation.nlogo')

    nl.command(f'set initial-infected {initial_infected}')
    nl.command(f'set network-density {network_density}')
    if intervention:
        nl.command(f'set intervention "{intervention}"')

    nl.command('setup')
    nl.command('repeat 100 [ go ]')

    results = {
        'infected_count': nl.report('count turtles with [infected?]'),
        'average_belief': nl.report('mean [belief-level] of turtles'),
        'intervention_effectiveness': nl.report('intervention-effectiveness')
    }

    nl.kill_workspace()
    return results

if __name__ == '__main__':
    server.run()
```

**Step 2: Add MCP Client to Agent**

```typescript
// game-server/agents/AgentManager.ts
import { MCPClient } from '@openai/agents/mcp';

export class AgentManager {
  private mcpClient: MCPClient;

  async initialize() {
    // Start Python MCP server as subprocess
    this.mcpClient = new MCPClient({
      command: 'python',
      args: ['tools/mcp_simulation_server.py'],
      transport: 'stdio', // Communicate via stdin/stdout
    });

    await this.mcpClient.connect();
  }

  async initializeAgent(agentId: string, role: string) {
    const agent = new Agent({
      name: `${agentId} (${role})`,
      model: 'gemini/gemini-2.0-flash-exp',
      client: this.openai,
      tools: [
        // Standard TypeScript tools
        { type: 'function', function: { name: 'send_message', ... } },
        { type: 'function', function: { name: 'submit_action', ... } },

        // MCP tools (auto-discovered from server)
        ...(await this.mcpClient.listTools()).map(tool => ({
          type: 'mcp',
          server: 'simulation',
          tool: tool.name,
        })),
      ],
    });

    return agent;
  }
}
```

**Step 3: Agent Can Now Call Python Tools**

```typescript
// Agent's reasoning during game:
// "I need to estimate the impact of deepfake regulation..."

const result = await agent.run({
  messages: [
    {
      role: 'user',
      content: 'Estimate the impact of mandatory watermarking on AI-generated content spread'
    }
  ]
});

// Agent internally decides to call simulate_ai_spread tool:
// {
//   tool_call: {
//     name: 'simulate_ai_spread',
//     arguments: {
//       initial_infected: 100,
//       network_density: 0.3,
//       intervention: 'mandatory-watermarking'
//     }
//   }
// }

// MCP client routes to Python server, returns:
// {
//   infected_count: 234,
//   average_belief: 0.45,
//   intervention_effectiveness: 0.67
// }

// Agent incorporates result into decision:
// "Based on simulation, mandatory watermarking reduces spread by 33%..."
```

### When to Add MCP

**NOT for MVP (Weeks 1-4):**
- Adds complexity
- Need to test Python tooling integration
- Event can succeed with TypeScript-only agents

**Post-Event (Week 5+) if:**
- ✅ Want more sophisticated simulation models
- ✅ Need to leverage existing Python ABM frameworks
- ✅ Want to add tools like database queries, external APIs
- ✅ Planning multi-agent research experiments

### Migration Path

**Current (MVP):**
```typescript
// All logic in TypeScript
const consequences = await calculateConsequences(action, gameState);
```

**With MCP (Post-Event):**
```typescript
// Delegate to Python simulation when needed
const agent = new Agent({
  tools: [
    { type: 'function', function: 'submit_action' },
    { type: 'mcp', server: 'simulation', tool: 'run_abm_model' },
  ]
});

// Agent decides which tool to use based on context
const result = await agent.run({
  messages: [{
    role: 'user',
    content: 'Analyze the systemic risk of this regulatory action...'
  }]
});
// Agent might call TypeScript tool OR Python simulation
```

**Key Insight:** MCP allows incremental migration - add Python tools one at a time, agents automatically learn to use them.

### Cost-Benefit Analysis

**Costs:**
- 2-3 days engineering work (MCP setup + Python server)
- Subprocess management (start/stop Python server)
- Additional debugging complexity (two languages)

**Benefits:**
- Access to entire Python ecosystem (NetLogo, Mesa, NetworkX, SciPy)
- Can reuse existing research code
- Agents can call sophisticated simulations on-demand
- Future-proof architecture for advanced features

**Decision:** Skip for MVP, revisit post-event if simulation quality becomes priority.

---

## Session Replay System

### Overview

**For Admins:** Debug what happened in any game
**For Users:** Retrospective analysis after game ends

### Design Principles

1. **Append-only snapshots** - Save state after every round
2. **Event sourcing** - Reconstruct timeline from events
3. **Differential access** - Admins see everything, users see filtered view
4. **Performance** - Lazy-load snapshots, don't replay in real-time

### Database Schema (Already Added Above)

```prisma
model GameSnapshot {
  id        String   @id
  gameId    String
  round     Int
  timestamp DateTime
  gameState Json     // Full state
  events    Json     // Actions + consequences

  // Metadata for debugging
  systemPromptId String?
  aiLatency      Int?
  errorCount     Int @default(0)
}
```

### Snapshot Creation (Automatic)

```typescript
// game-server/rooms/GameRoom.ts
export class GameRoom extends Room<GameState> {

  async advanceRound() {
    // Apply consequences, update scores, etc.
    this.state.round++;

    // Save snapshot (async, doesn't block game)
    this.saveSnapshot().catch(err => {
      logger.error('Failed to save snapshot', {
        roomId: this.roomId,
        round: this.state.round,
        error: err.message,
      });
    });
  }

  private async saveSnapshot() {
    await db.gameSnapshot.create({
      data: {
        gameId: this.roomId,
        round: this.state.round,
        timestamp: new Date(),

        // Full game state (can reconstruct everything)
        gameState: this.state.toJSON(),

        // Recent events (actions, consequences)
        events: {
          actions: this.currentRoundActions,
          consequences: this.currentRoundConsequences,
          aiResponses: this.currentRoundAIResponses,
        },

        // Debugging metadata
        systemPromptId: this.metadata.promptVersions.system,
        aiLatency: this.lastAICallLatency,
        errorCount: this.errorsThisRound,
      },
    });
  }
}
```

### Admin Replay UI

**URL:** `/admin/replay/[gameId]`

**Features:**
- Timeline scrubber
- State inspector (JSON tree)
- Event viewer (chronological)
- Prompt version links
- Performance metrics

**Component:**

```typescript
// pages/admin/replay/[gameId].tsx
export default function AdminReplay() {
  const router = useRouter();
  const { gameId } = router.query;

  const [snapshots, setSnapshots] = useState<GameSnapshot[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'timeline' | 'state' | 'events'>('timeline');

  useEffect(() => {
    fetchSnapshots(gameId as string).then(setSnapshots);
  }, [gameId]);

  const currentSnapshot = snapshots.find(s => s.round === selectedRound);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <Link href="/admin/dashboard" className="text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Game Replay: {gameId}</h1>
      </header>

      {/* Timeline Scrubber */}
      <div className="mb-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <div className="flex items-center gap-2">
          {snapshots.map((snapshot) => (
            <button
              key={snapshot.round}
              onClick={() => setSelectedRound(snapshot.round)}
              className={`
                px-4 py-2 rounded transition-all
                ${selectedRound === snapshot.round
                  ? 'bg-blue-600 scale-110'
                  : 'bg-gray-700 hover:bg-gray-600'
                }
              `}
            >
              Round {snapshot.round}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-4 mb-6">
        {['timeline', 'state', 'events'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={`px-4 py-2 rounded ${
              viewMode === mode ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'timeline' && (
        <TimelineView snapshot={currentSnapshot} />
      )}

      {viewMode === 'state' && (
        <StateInspector state={currentSnapshot.gameState} />
      )}

      {viewMode === 'events' && (
        <EventsViewer events={currentSnapshot.events} />
      )}

      {/* Metadata Footer */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-400">Prompt Version:</span>
            <Link
              href={`/admin/prompts?id=${currentSnapshot.systemPromptId}`}
              className="ml-2 text-blue-400 hover:underline"
            >
              v{currentSnapshot.systemPrompt?.version}
            </Link>
          </div>
          <div>
            <span className="text-gray-400">AI Latency:</span>
            <span className="ml-2">{currentSnapshot.aiLatency}ms</span>
          </div>
          <div>
            <span className="text-gray-400">Errors:</span>
            <span className="ml-2">{currentSnapshot.errorCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineView({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Round {snapshot.round}</h2>

      {/* Player Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Player Actions</h3>
        <div className="space-y-2">
          {snapshot.events.actions?.map((action: any, i: number) => (
            <div key={i} className="p-3 bg-gray-700 rounded">
              <div className="font-semibold">{action.player.role}</div>
              <div className="text-sm text-gray-300">{action.action.title}</div>
              <div className="text-xs text-gray-400 mt-1">
                Cost: {action.action.cost} points
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Responses */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">AI Responses</h3>
        <div className="space-y-2">
          {snapshot.events.aiResponses?.map((response: any, i: number) => (
            <div key={i} className="p-3 bg-blue-900 rounded">
              <div className="font-semibold">{response.agent}</div>
              <div className="text-sm text-gray-300 mt-1">{response.message}</div>
              <details className="mt-2">
                <summary className="text-xs text-blue-400 cursor-pointer">
                  Show AI Reasoning
                </summary>
                <pre className="text-xs bg-gray-800 p-2 mt-1 rounded overflow-auto">
                  {JSON.stringify(response.reasoning, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Consequences */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Consequences</h3>
        <div className="p-4 bg-yellow-900 rounded">
          <div className="text-sm mb-2">{snapshot.events.consequences?.narrative}</div>
          <div className="text-xs text-gray-300">
            Public Score: {snapshot.gameState.publicScore}
            ({snapshot.events.consequences?.scoreChange > 0 ? '+' : ''}
            {snapshot.events.consequences?.scoreChange})
          </div>
        </div>
      </div>
    </div>
  );
}

function StateInspector({ state }: { state: any }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Game State (JSON)</h2>
      <JSONTree data={state} theme="monokai" invertTheme={false} />
    </div>
  );
}

function EventsViewer({ events }: { events: any }) {
  const allEvents = [
    ...events.actions?.map((a: any) => ({ type: 'action', ...a })) || [],
    ...events.aiResponses?.map((a: any) => ({ type: 'ai', ...a })) || [],
    { type: 'consequence', ...events.consequences },
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Event Log</h2>
      <div className="space-y-2">
        {allEvents.map((event, i) => (
          <div key={i} className="p-3 bg-gray-700 rounded text-sm">
            <span className="text-gray-400">{formatTime(event.timestamp)}</span>
            <span className="ml-3 font-semibold">[{event.type}]</span>
            <span className="ml-2">{event.description || event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### User Retrospective UI

**URL:** `/retrospective/[gameId]` (Accessible after game ends)

**Features:**
- Same timeline scrubber
- **Filtered view:** Hide admin data, AI reasoning (show at end)
- **Reveal hidden scores** at the end
- **"What if" scenarios** (counterfactual analysis)
- **Share link** with other players

**Differences from Admin View:**

| Feature | Admin | User |
|---------|-------|------|
| Hidden scores | Always visible | Revealed at end |
| AI reasoning | Full details | Summary only |
| Prompt versions | Links to versions | Not shown |
| Performance metrics | All metrics | None |
| Debug info | Full state | Filtered |
| "What if" scenarios | No | Yes (engaging!) |

**Component:**

```typescript
// pages/retrospective/[gameId].tsx
export default function UserRetrospective() {
  const { gameId } = useRouter().query;
  const [game, setGame] = useState<Game | null>(null);
  const [snapshots, setSnapshots] = useState<GameSnapshot[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [revealHiddenScores, setRevealHiddenScores] = useState(false);

  useEffect(() => {
    fetchGameData(gameId as string).then(data => {
      setGame(data.game);
      setSnapshots(data.snapshots);

      // Auto-reveal if game is complete
      if (data.game.status === 'completed') {
        setRevealHiddenScores(true);
      }
    });
  }, [gameId]);

  const currentSnapshot = snapshots.find(s => s.round === selectedRound);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Game Retrospective</h1>
        <p className="text-gray-400">
          Played on {formatDate(game.createdAt)} • {game.rounds} rounds
        </p>
      </header>

      {/* Final Scores (if revealed) */}
      {revealHiddenScores && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Final Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {game.players.map(player => (
              <div key={player.id} className="p-4 bg-black bg-opacity-30 rounded">
                <div className="font-semibold">{player.role}</div>
                <div className="text-sm text-gray-300 mt-1">
                  Hidden Objective: {player.hiddenObjective}
                </div>
                <div className="text-2xl font-bold mt-2">
                  {player.hiddenScore} points
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <div className="text-lg">Public Score (Democratic Legitimacy)</div>
            <div className="text-4xl font-bold mt-2">{game.finalPublicScore}</div>
          </div>
        </div>
      )}

      {/* Timeline Scrubber (same as admin) */}
      <div className="mb-8">
        <TimelineScrubber
          snapshots={snapshots}
          selected={selectedRound}
          onSelect={setSelectedRound}
        />
      </div>

      {/* Round Details */}
      <RoundRetrospective
        snapshot={currentSnapshot}
        showHiddenScores={revealHiddenScores}
      />

      {/* "What If" Scenarios */}
      {revealHiddenScores && (
        <WhatIfAnalysis
          snapshot={currentSnapshot}
          gameId={gameId as string}
        />
      )}

      {/* Share with Players */}
      <div className="mt-8 text-center">
        <button className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700">
          Share Retrospective Link
        </button>
      </div>
    </div>
  );
}

function WhatIfAnalysis({ snapshot, gameId }: {
  snapshot: GameSnapshot;
  gameId: string;
}) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  const runWhatIf = async () => {
    // Call API to re-run consequences with different action
    const result = await fetch(`/api/what-if`, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        round: snapshot.round,
        alternateAction: selectedAction,
      }),
    }).then(r => r.json());

    setWhatIfResult(result);
  };

  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">
        💭 What If Analysis
      </h2>
      <p className="text-gray-400 mb-4">
        See how the round would have played out with different actions
      </p>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">
          Choose an alternate action:
        </label>
        <select
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 rounded"
        >
          <option value="">Select action...</option>
          {snapshot.events.allPossibleActions?.map((action: any) => (
            <option key={action.id} value={action.id}>
              {action.title}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={runWhatIf}
        disabled={!selectedAction}
        className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        Run Simulation
      </button>

      {whatIfResult && (
        <div className="mt-6 p-4 bg-purple-900 bg-opacity-50 rounded">
          <h3 className="font-semibold mb-2">Alternate Timeline:</h3>
          <p className="text-sm">{whatIfResult.narrative}</p>
          <div className="mt-3 text-xs">
            <div>Public Score Change:
              <span className={whatIfResult.scoreChange > 0 ? 'text-green-400' : 'text-red-400'}>
                {whatIfResult.scoreChange > 0 ? '+' : ''}{whatIfResult.scoreChange}
              </span>
              (Actual: {snapshot.events.consequences.scoreChange})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### API for "What If" Analysis

```typescript
// pages/api/what-if.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, round, alternateAction } = req.body;

  // Load original snapshot
  const snapshot = await db.gameSnapshot.findFirst({
    where: { gameId, round },
  });

  // Reconstruct game state
  const gameState = snapshot.gameState;

  // Replace one action with alternate
  const modifiedActions = snapshot.events.actions.map((a: any) =>
    a.player.isHuman ? { ...a, action: alternateAction } : a
  );

  // Re-run consequence generation (using same prompt version)
  const prompt = await db.promptVersion.findUnique({
    where: { id: snapshot.consequencePromptId },
  });

  const whatIfConsequences = await geminiService.generateConsequences({
    gameState,
    actions: modifiedActions,
    prompt: prompt.content,
  });

  res.json({
    narrative: whatIfConsequences.narrative,
    scoreChange: whatIfConsequences.scoreChange,
    comparison: {
      original: snapshot.events.consequences.scoreChange,
      alternate: whatIfConsequences.scoreChange,
      difference: whatIfConsequences.scoreChange - snapshot.events.consequences.scoreChange,
    },
  });
}
```

---

### Summary: What You Get

**Prompt Management:**
- ✅ Version-controlled prompts (append-only)
- ✅ Admin UI to create/activate versions
- ✅ Full audit trail (who, when, why)
- ✅ A/B testing capability
- ✅ Instant rollback
- ✅ Know which prompt each game used

**Session Replay (Admin):**
- ✅ Timeline of every round
- ✅ Full state inspection
- ✅ Event viewer (chronological)
- ✅ Prompt version links
- ✅ Performance metrics
- ✅ Debug info

**Session Replay (User):**
- ✅ Same timeline (filtered view)
- ✅ Hidden scores revealed at end
- ✅ "What if" scenarios (engaging!)
- ✅ Share link with other players
- ✅ Beautiful retrospective UI

**Time to Build:**
- Prompt management: 1 day (Day 8)
- Admin replay: 1 day (Day 9)
- User retrospective: 1 day (Day 10)
- Total: 3 days

**Priority:** MEDIUM-HIGH (Do after core Colyseus migration, before IRL event)

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

### Colyseus Admin API (Express)

```typescript
// server/routes/admin.ts (excerpt)
import { Router } from 'express';
import { matchMaker } from 'colyseus';

const router = Router();

router.get('/rooms', requireAdmin, async (_req, res) => {
  const rooms = await matchMaker.query({ name: 'game' });
  const data = rooms.map((room: any) => ({
    roomId: room.roomId,
    code: room.metadata?.code,
    clients: room.clients,
    createdAt: room.createdAt,
  }));
  res.json({ rooms: data });
});
```

**Admin Pages:**
- `/admin` - Login with password
- `/colyseus-admin/rooms` - List all active games
- `/colyseus-admin/rooms/[id]` - Detailed view of specific game
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
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start Express server (Colyseus + Next handler)
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

#### Cloud Run Timeout + Reconnection (EAGx profile)

- Constraints
  - WebSockets are bound by Cloud Run’s request timeout. Max 3600s (60 minutes); connections drop at timeout even with activity/keep‑alives.
  - For EAGx, keep deployment simple with a single instance to avoid cross‑instance room routing.

- Recommended settings (event window)
  - `--timeout 3600` — allow the longest WS sessions we can.
  - `--min-instances 1` — keep the process warm to avoid cold starts.
  - `--max-instances 1` — pin rooms to one process for the event; revisit after.
  - `--concurrency 100` — sufficient for ~5–10 concurrent games and ~100 peak users.
  - Memory 1–2 GiB depending on room/state size.

- Server reconnection (Colyseus)
  - Allow reconnect on ungraceful disconnects (covers the 60‑min cut and brief network blips):
    ```ts
    // GameRoom.ts
    onLeave(client: Client, consented: boolean) {
      if (!consented) {
        this.allowReconnection(client, 120).catch(() => {
          this.state.players.delete(client.sessionId);
        });
        return;
      }
      this.state.players.delete(client.sessionId);
    }
    ```

- Client reconnection
  - Persist reconnection data and auto‑reconnect on close:
    ```ts
    // After join
    localStorage.setItem('roomId', room.id);
    localStorage.setItem('reconnToken', room.reconnectionToken);

    // On socket close
    const roomId = localStorage.getItem('roomId');
    const token = localStorage.getItem('reconnToken');
    if (roomId && token) {
      client.reconnect(roomId, token).then((newRoom) => {
        room = newRoom;
        bindHandlers(room);
      }).catch(() => {/* show reconnect UI */});
    }
    ```

- Acceptance checks (staging)
  - Kill‑tab test: close the tab mid‑game; client rejoins within 5s with state and role intact.
  - 60‑minute cut test: at `--timeout 3600`, simulate/drop and ensure reconnect path works.
  - Deploy drain test: starting a new revision drops sockets; clients reconnect and rebind without losing progress.

- Ops runbook (event)
  - Avoid deploys during active rooms; confirm “active rooms = 0” before rolling.
  - Keep `max-instances=1` during EAGx; plan presence/redis + multi‑instance after the event if needed.

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
├── server/
│   ├── index.ts                      # NEW: Express + Colyseus + Next handler
│   └── routes/
│       └── admin.ts                  # NEW: Colyseus admin routes (/colyseus-admin/*)
├── game-server/                       # Colyseus game logic
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
│   └── api/                           # (Keep for other Next APIs if needed)
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

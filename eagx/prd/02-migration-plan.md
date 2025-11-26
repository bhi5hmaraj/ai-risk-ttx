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


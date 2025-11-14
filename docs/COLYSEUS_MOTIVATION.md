# Colyseus Migration: Motivation & Decision Document

**Date:** 2025-11-14
**Status:** Approved - Moving to Custom Server (Approach 2)
**Timeline:** 1-2 days to ship Milestone 1

---

## Executive Summary

We're migrating from Server-Sent Events (SSE) to Colyseus WebSocket framework to eliminate unreliable connection management and enable us to focus on game features instead of infrastructure debugging.

**Key Decision:** Use Next.js custom server with Colyseus (single service) for Milestone 1. Defer Matrix service (autonomous AI agents) until after validating Colyseus with real users.

**Expected Outcome:** Ship reliable multiplayer in 1-2 days, reduce connection bugs by 90%, spend 90% of dev time on gameplay (not infrastructure).

---

## The Problem: SSE "Black Magic"

### Current Architecture Pain Points

Our Next.js app currently uses Server-Sent Events (SSE) for real-time game state updates. This has created significant engineering friction:

#### 1. **Manual Connection Management**

```typescript
// Current SSE code - we manage everything manually
const eventSource = new EventSource(`/api/session/${id}/stream`);

eventSource.onerror = () => {
  // Questions we had to answer ourselves:
  // - How many times to retry?
  // - What backoff strategy?
  // - How to recover state on reconnect?
  // - When to show error UI vs keep retrying?

  // Our implementation (fragile):
  if (reconnectAttempts < 5) {
    setTimeout(() => reconnect(), Math.pow(2, reconnectAttempts) * 1000);
  }
};
```

**Problem:** We built our own reconnection logic with AI assistance. It works "sometimes" but fails in unpredictable ways. Debugging requires inspecting browser network tab, server logs, and client state simultaneously.

#### 2. **Split Protocol Architecture**

```
Client ←──── SSE ────── Server  (Receive updates)
Client ────→ HTTP POST → Server  (Send actions)
```

**Problem:** Two separate communication channels:
- SSE for server → client updates
- HTTP POST for client → server actions

Each needs its own error handling, retry logic, and timeout management. State can diverge if POST succeeds but SSE event is missed.

#### 3. **Manual State Synchronization**

```typescript
// Current state merging logic
eventSource.addEventListener('session', (e) => {
  const snapshot = JSON.parse(e.data);

  // Questions we had to solve:
  // - Merge or replace entire state?
  // - What if local state has pending changes?
  // - What if events arrive out of order?
  // - How to handle partial updates?

  // Our implementation (race conditions possible):
  setGameState(prev => ({ ...prev, ...snapshot }));
});
```

**Problem:** Every state update requires manual merging logic. JSON snapshots are large (entire state sent each time). No guarantees about event ordering or handling concurrent updates.

#### 4. **Debugging Nightmares**

**Typical bug report:**
> "The game froze after I submitted my action. Round didn't advance."

**Investigation required:**
1. Check browser network tab: Did SSE disconnect?
2. Check server logs: Was POST received? Did consequence phase complete?
3. Check client console: Was SSE event received? Did state merge fail?
4. Check timing: Race condition between events?

**Time to debug:** 30-60 minutes per incident
**Root cause clarity:** Low (often "worked when I tried to reproduce")

### Real-World Impact

**Developer experience:**
- 60% of debugging time spent on connection issues
- 30% on state synchronization bugs
- 10% on actual game logic

**User experience:**
- Intermittent "game frozen" reports
- Refresh required to recover from connection issues
- Multiplayer state sometimes diverges between players

**Technical debt:**
- 200+ lines of connection management code
- Complex error recovery paths (hard to test)
- "Works on my machine" bugs (timing-dependent)

---

## The Solution: Colyseus Framework

### What is Colyseus?

Colyseus is a battle-tested multiplayer game server framework for Node.js. It provides:

- **Authoritative state management** (server is source of truth)
- **Automatic state synchronization** (binary patches, not full JSON)
- **Built-in connection lifecycle** (reconnection, state recovery)
- **Room-based architecture** (each game is isolated)
- **WebSocket transport** (bidirectional, single protocol)

Used in production by hundreds of multiplayer games (.io games, real-time strategy, turn-based games).

### How Colyseus Solves Our Problems

#### 1. **Automatic Connection Management**

```typescript
// All we write:
const room = await client.create('game', { role: 'governor' });

// Colyseus handles automatically:
// ✅ WebSocket connection setup
// ✅ Reconnection with exponential backoff
// ✅ State snapshot on reconnect
// ✅ Connection health checks (ping/pong)
// ✅ Graceful disconnection handling
// ✅ Error reporting with clear codes
```

**Benefit:** Zero lines of reconnection code. Battle-tested implementation handles edge cases we haven't even encountered.

#### 2. **Single Bidirectional Protocol**

```
Client ←──── WebSocket ────→ Server
       (state updates + messages)
```

**Send message to server:**
```typescript
room.send('submit_action', { action: selectedAction });
```

**Receive state updates (automatic):**
```typescript
room.onStateChange((state) => {
  // State already updated, just use it
  console.log('Round:', state.round);
});
```

**Benefit:** One protocol, one connection, one set of error handling. State updates and messages flow over same channel.

#### 3. **Automatic State Synchronization**

**Server changes state:**
```typescript
// In GameRoom
this.state.round = 5;
this.state.publicScore += 10;
```

**Client receives binary patch:**
```
Patch #1: round: 4 → 5
Patch #2: publicScore: 50 → 60
(Only 8 bytes sent, not entire state object)
```

**Client automatically updates:**
```typescript
room.onStateChange((state) => {
  // state.round is now 5
  // state.publicScore is now 60
  // All other fields unchanged
  // NO manual merging code!
});
```

**Benefit:**
- Binary patches = 90% less bandwidth than JSON snapshots
- Deterministic updates = no race conditions
- Automatic synchronization = no manual merge logic

#### 4. **Built-in Debugging**

**Client console:**
```
[Colyseus] Connected to room abc123
[Colyseus] State changed (3 patches applied)
[Colyseus] Message received: 'progress' { role: 'Tech CEO', stage: 'ai-turn' }
```

**Server console:**
```
[GameRoom] Player joined: human_player
[GameRoom] Message from client: submit_action
[GameRoom] Broadcasting state change to 3 clients
```

**Benefit:** Clear causality. Timeline of events. Easy to trace client action → server processing → state update.

---

## Before vs After Comparison

### State Update Flow

**Before (SSE):**
```
1. User clicks "Submit Action"
2. Client: POST /api/session/actions
3. Server: Process action, update database
4. Server: Publish SSE event
5. Client SSE listener: Receive JSON snapshot
6. Client: Manually merge state with JSON.parse()
7. Client: setState() triggers re-render

Failure points: 4 (POST fail, SSE disconnect, parse error, merge conflict)
Lines of code: ~150 (connection + merge logic)
Bandwidth: 5-10 KB per update (full JSON state)
```

**After (Colyseus):**
```
1. User clicks "Submit Action"
2. Client: room.send('submit_action', action)
3. Server: this.state.round++
4. Colyseus: Auto-broadcast binary patch
5. Client: room.onStateChange() fires
6. React: Re-renders with new state

Failure points: 0 (WebSocket auto-reconnects with state recovery)
Lines of code: ~5 (framework handles the rest)
Bandwidth: 50-200 bytes per update (binary diff)
```

### Code Complexity

**Before (SSE Connection Management):**
```typescript
// ~200 lines of connection code
let eventSource: EventSource | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000;

function connect(sessionId: string) {
  try {
    eventSource = new EventSource(`/api/session/${sessionId}/stream`);

    eventSource.onopen = () => {
      reconnectAttempts = 0;
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Complex state merging logic
        setGameState(prev => {
          // Merge arrays carefully
          const newPlayers = data.players || prev.players;
          const newEvents = [...prev.eventLog, ...(data.newEvents || [])];

          return {
            ...prev,
            ...data,
            players: newPlayers,
            eventLog: newEvents,
            lastUpdate: Date.now()
          };
        });
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);

      if (eventSource?.readyState === EventSource.CLOSED) {
        setConnectionStatus('disconnected');

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempts - 1);

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

          setTimeout(() => {
            connect(sessionId);
          }, delay);
        } else {
          setConnectionStatus('failed');
          setError('Connection lost. Please refresh.');
        }
      }
    };
  } catch (err) {
    console.error('Failed to connect:', err);
    setConnectionStatus('failed');
  }
}

// Cleanup
function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// Must also handle POST separately
async function submitAction(action: Action) {
  try {
    const response = await fetch(`/api/session/${sessionId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Wait for SSE to confirm?
    // What if SSE event never arrives?
    // Implement timeout? Retry logic?
  } catch (err) {
    // Error handling...
  }
}
```

**After (Colyseus):**
```typescript
// ~10 lines total
const { gameState, connected, submitActions } = useGameRoom({
  role: selectedRole,
  setup: gameSetup,
  onStateChange: (state) => {
    // State already updated, just use it
    console.log('New state:', state);
  }
});

// Submit action
await submitActions('human_player', [selectedAction]);

// That's it. Framework handles everything.
```

**Reduction:** 95% less boilerplate code

---

## Why This Matters for Our MVP

### Current Situation

We're building an **AI-powered tabletop exercise simulation**. Our core value proposition is:
- Strategic gameplay with AI opponents
- Realistic crisis scenarios
- Multiplayer collaboration

**Not:**
- Custom-built WebSocket infrastructure
- Novel real-time synchronization algorithms

### Resource Allocation

**With SSE (current):**
- 60% dev time: Debugging connection issues
- 30% dev time: State synchronization
- 10% dev time: Game features

**With Colyseus:**
- 5% dev time: Connection setup (one-time)
- 5% dev time: State sync (automatic)
- 90% dev time: **Game features, AI quality, UI polish**

### User Impact

**Problems we can finally fix:**
- ✅ "Game froze" bugs (automatic reconnection)
- ✅ Multiplayer state divergence (deterministic sync)
- ✅ Slow updates (binary patches vs JSON)
- ✅ Connection instability (battle-tested framework)

**Features we can finally build:**
- ✅ Real-time human chat (bidirectional WebSocket)
- ✅ Spectator mode (join existing games)
- ✅ Seamless reconnection (state recovery)
- ✅ Better progress indicators (granular events)

---

## Architecture Decision: Custom Server (Approach 2)

### Why Single Service (Not Separate Stein Service)

We evaluated two approaches:

**Approach 1: Separate Services**
```
Next.js (Vercel) ←→ Stein (Cloud Run) ←→ Matrix (Cloud Run)
```

**Approach 2: Custom Server**
```
Next.js + Colyseus (Cloud Run)
```

**We chose Approach 2** because:

#### 1. **Matrix is "Good to Have" Not "Must Have"**

Matrix service provides:
- Autonomous AI agents (act without being asked)
- AI-to-AI communication
- Tool use (web search, real-world data)

**Current needs:**
- AI responds to player actions ✅ (have this with direct LLM calls)
- State synchronization ✅ (Colyseus provides)
- Multiplayer support ✅ (Colyseus provides)

**Unknown needs:**
- Do users want proactive AI? (need to test)
- Is autonomous behavior valuable? (need feedback)
- Will it improve gameplay? (validate first)

**Conclusion:** Don't build Matrix until we've validated Colyseus and gathered user feedback.

#### 2. **Fewer Moving Parts = Fewer Bugs**

**Separate services introduce:**
- Cross-service network calls (timeout, retry, failure modes)
- Service discovery / coordination
- Deployment complexity (3 services vs 1)
- Debugging across services (distributed tracing needed)

**Example failure scenario (3 services):**
```
User submits action → Next.js receives
Next.js → Stein (network call)
Stein → Matrix (network call - 5s timeout)
Matrix → LLM (network call - 10s timeout)
LLM → Matrix response (delayed)
Matrix → Stein (network call - user gave up)
Stein → Next.js (user already refreshed page)

Total: 3 network boundaries where things can fail
```

**Single service:**
```
User submits action → GameRoom receives
GameRoom → LLM (only 1 network call)
LLM → GameRoom response
GameRoom → Client (WebSocket, auto-reconnects)

Total: 1 network boundary (the unavoidable LLM call)
```

#### 3. **Ship Fast, Validate, Then Architect**

**Approach 2 timeline:**
- Week 1: Ship Colyseus, validate it works
- Week 2: Polish gameplay, get user feedback
- Week 3+: Decide based on data (build Matrix? or polish features?)

**Approach 1 timeline:**
- Week 1-2: Build Stein service
- Week 3-4: Build Matrix service
- Week 5-6: Debug cross-service issues
- Week 7-8: Finally add game features
- Week 9: Realize users wanted different features

**Risk:** Spend 8 weeks building infrastructure users don't need.

#### 4. **Extraction Path Preserved**

`game-server/` folder is **designed for extraction**:

```bash
# If we need Matrix later (< 1 day to extract):
cp -r game-server ../stein/src
# Add Express wrapper (10 min)
# Replace AI calls with Matrix (2-4 hours)
# Update WS URL in Next.js (1 min)
```

**We're not burning bridges.** We're deferring complexity until we know it's needed.

---

## Migration Plan

### Phase 1: Proof of Concept (Days 1-2)

**Goal:** Validate Colyseus solves our problems

- [ ] Install Colyseus dependencies
- [ ] Create custom server (`server.ts`)
- [ ] Implement basic GameRoom
- [ ] Test WebSocket connection from browser
- [ ] Verify state synchronization works

**Success criteria:** Can connect, see state updates in real-time

### Phase 2: Core Game Loop (Days 3-5)

**Goal:** Full game playable via Colyseus

- [ ] Migrate lobby page to `useGameRoom` hook
- [ ] Implement action submission flow
- [ ] Integrate existing AI service (direct LLM calls)
- [ ] Test full round: human action → AI response → consequences
- [ ] Add human-to-human chat

**Success criteria:** Can play complete game from lobby to end

### Phase 3: Remove SSE (Days 6-7)

**Goal:** Clean up old code

- [ ] Delete SSE connection management code
- [ ] Remove `SessionMonitor` component (if SSE-only)
- [ ] Remove `/api/session/*/stream` endpoint
- [ ] Update error handling to use WebSocket errors

**Success criteria:** No EventSource references in codebase

### Phase 4: Production Deploy (Day 8)

**Goal:** Live in production

- [ ] Update Dockerfile for custom server
- [ ] Deploy to Cloud Run
- [ ] Test with real users
- [ ] Monitor connection stability

**Success criteria:** Game playable in production, < 1% connection errors

### Phase 5: User Validation (Week 2)

**Goal:** Gather data for Milestone 2 decision

- [ ] 10+ user playthroughs
- [ ] Collect feedback on connection reliability
- [ ] Measure time spent debugging vs building features
- [ ] Survey: Do users want autonomous AI?

**Decision point:** Build Matrix service? Or focus on gameplay polish?

---

## Success Metrics

### Technical Metrics (Week 1)

- [ ] Connection stability: > 99% (vs current ~85%)
- [ ] Reconnection success: > 95%
- [ ] State synchronization bugs: < 5 per week (vs current ~20)
- [ ] Debugging time: < 10% of dev time (vs current 60%)

### Developer Experience (Week 2)

- [ ] Time to add new feature: < 1 day (vs current 2-3 days)
- [ ] Lines of connection code: < 20 (vs current 200+)
- [ ] Time to debug connection issue: < 10 min (vs current 30-60 min)
- [ ] Developer confidence: "I understand how this works"

### User Experience (Week 3+)

- [ ] "Game froze" reports: < 1 per 100 sessions
- [ ] Multiplayer state divergence: 0 reported
- [ ] Positive feedback on connection reliability
- [ ] Users focus on gameplay feedback (not technical issues)

---

## Risks & Mitigation

### Risk 1: Colyseus Learning Curve

**Risk:** Team unfamiliar with Colyseus, could slow development

**Likelihood:** Medium
**Impact:** Low (framework is well-documented)

**Mitigation:**
- Comprehensive migration guide created (`COLYSEUS_MIGRATION.md`)
- Small scope (only GameRoom needed for MVP)
- Excellent documentation: https://docs.colyseus.io/
- Active community for questions

### Risk 2: Framework Lock-in

**Risk:** Colyseus becomes limiting, hard to migrate away

**Likelihood:** Low (used in production by many games)
**Impact:** Medium (would need to rebuild)

**Mitigation:**
- `game-server/` folder is self-contained
- Game logic separate from Colyseus state sync
- Can wrap or replace if needed
- Framework is open-source (can fork if needed)

### Risk 3: Performance at Scale

**Risk:** Colyseus can't handle our concurrent user load

**Likelihood:** Very Low (designed for multiplayer games)
**Impact:** Medium (would need optimization)

**Mitigation:**
- Colyseus handles 1000+ concurrent connections per instance
- Our game is turn-based (lower bandwidth than real-time action)
- Can scale horizontally (multiple instances + Redis)
- Monitor metrics, optimize if needed

### Risk 4: Still Need Matrix Later

**Risk:** Users demand autonomous AI, must build Matrix anyway

**Likelihood:** Medium (depends on user feedback)
**Impact:** Low (extraction path is clear)

**Mitigation:**
- `game-server/` designed for extraction (< 1 day)
- Not a wasted effort (validated Colyseus first)
- Have real usage data to inform Matrix design
- Can build incrementally (keep both modes)

---

## Alternatives Considered

### Alternative 1: Keep SSE, Fix the Bugs

**Pros:**
- No migration needed
- Familiar technology

**Cons:**
- Still have two separate protocols (SSE + HTTP)
- Still need manual state synchronization
- Still need custom reconnection logic
- Doesn't solve root problem (manual connection management)

**Decision:** Rejected. Fixing SSE doesn't give us the abstraction level we need.

### Alternative 2: Build Custom WebSocket Server

**Pros:**
- Full control over implementation
- No framework dependency

**Cons:**
- 3-6 months of work (state sync, reconnection, binary patches)
- Reimplementing solved problems
- More bugs than battle-tested framework
- Opportunity cost (not building game features)

**Decision:** Rejected. Wrong place to invest engineering effort.

### Alternative 3: Socket.io (WebSocket Library)

**Pros:**
- Popular WebSocket library
- Good documentation
- Similar to Colyseus

**Cons:**
- No automatic state synchronization (still manual)
- No room-based architecture
- No binary state patches
- Would still need to build state sync ourselves

**Decision:** Rejected. Doesn't solve state synchronization problem.

### Alternative 4: Separate Stein Service (Approach 1)

**Pros:**
- Clean architectural boundaries
- Ready for Matrix service
- Independent scaling

**Cons:**
- 3 services to manage (vs 1)
- Cross-service networking complexity
- More bugs, harder debugging
- Matrix might not be needed

**Decision:** Rejected for MVP. Defer until Matrix is validated need.

---

## Conclusion

### The Core Motivation

We're migrating to Colyseus because:

1. **SSE is flaky and hard to debug** ("black magic" connection code)
2. **We want to operate at a higher level of abstraction** (framework handles plumbing)
3. **We want to focus on game features** (not infrastructure)
4. **Colyseus is battle-tested** (used in production by hundreds of games)

### The Right Architecture for Now

Custom Next.js server with Colyseus is the right choice because:

1. **Ships fastest** (1-2 days vs 1-2 weeks)
2. **Simplest** (one service, fewer bugs)
3. **Validates Colyseus** (before committing to multi-service)
4. **Preserves options** (can extract later if needed)

### What Success Looks Like

**Week 1:** Colyseus shipped, game playable, connection stable
**Week 2:** User feedback collected, < 1% connection errors
**Week 3+:** Data-driven decision: Build Matrix? Or polish gameplay?

---

## Next Steps

1. **Immediate:** Install dependencies, run custom server
2. **This week:** Migrate game page, test full loop
3. **Next week:** Remove SSE code, deploy to production
4. **Week 2:** Collect user feedback, measure success metrics
5. **Decision point:** Proceed to Milestone 2 (Matrix) or focus on polish

---

## Appendix: Technical Details

### Colyseus State Schema Example

```typescript
// Server defines schema
export class GameState extends Schema {
  @type('number') round: number = 0;
  @type('number') publicScore: number = 50;
  @type({ map: Player }) players = new MapSchema<Player>();
}

// Colyseus automatically:
// 1. Tracks changes (round: 0 → 1)
// 2. Generates binary patch
// 3. Broadcasts to all clients
// 4. Client state updates automatically
```

### Message Flow Example

```typescript
// Client sends message
room.send('submit_action', {
  playerId: 'human_player',
  action: { title: 'Investigate', cost: 2 }
});

// Server receives in GameRoom
this.onMessage('submit_action', (client, message) => {
  // Process action
  this.state.round++;

  // State change automatically broadcasts to all clients
});

// All connected clients receive state update
room.onStateChange((state) => {
  console.log('Round is now:', state.round);
});
```

### Reconnection Flow

```typescript
// Client disconnects (network issue)
// Colyseus automatically:
// 1. Detects disconnect
// 2. Waits 3 seconds for reconnection
// 3. Client reconnects automatically
// 4. Server sends current state snapshot
// 5. Client is caught up
// All without any code from us!
```

---

**Document Owner:** Development Team
**Last Updated:** 2025-11-14
**Next Review:** After Week 1 (post-deployment)

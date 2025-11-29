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
- **Risk Mitigation:** Commit fully to WebSocket/Colyseus; retire SSE to avoid split focus, and instead invest in observability (structured logs/metrics/traces) plus strong admin controls for live recovery.

**Expected Outcomes:**
- Week 3: Colyseus deployed, stable multiplayer tested with 50+ games, with observability and admin tooling exercised
- Week 4 (Event): Confident, single-protocol (WebSocket) rollout with rehearsed admin controls for fast mitigation
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


# Colyseus Migration Tasks - EAGx Event (Dec 12, 2025)

## Phase 0: Server Setup & Infrastructure (COMPLETED)

### ai-risk-ttx-301 [P0] Express + Colyseus + Next Handler Setup
**Status:** closed
**Description:** Wire Express + Colyseus + Next handler in server/index.ts
**Acceptance:**
- Express app with cors, express.json, trust proxy configured
- Colyseus attached via WebSocketTransport
- Next handler mounted at app.use(handle)
- Colyseus admin routes at /colyseus-admin/*
- /healthz endpoint returns 200
- pnpm run dev:colyseus serves pages and accepts WS connections

### ai-risk-ttx-302 [P0] CORS Configuration
**Status:** closed
**Description:** Configure CORS for Cloud Run deployment
**Acceptance:**
- Allow origins: simulacra.cc, *.a.run.app, localhost
- Use NEXT_PUBLIC_APP_URL for dynamic origin
- Remove Vercel-specific CORS logic

### ai-risk-ttx-303 [P0] Dockerfile for Production
**Status:** closed
**Description:** Create production-ready Dockerfile
**Acceptance:**
- Multi-stage build (deps, builder, runner)
- Builds Next.js and Custom Server
- Includes HEALTHCHECK instruction
- Copies build artifacts correctly
- ARG for build-time env vars

### ai-risk-ttx-304 [P0] Cloud Build CI/CD
**Status:** closed
**Description:** Configure Cloud Build and GitHub Actions for deployment
**Acceptance:**
- cloudbuild.yaml with branch-based deployment (prod vs preview)
- GitHub Actions workflow triggers Cloud Build
- Session affinity and timeout configured
- GCP_CREDENTIALS secret documented

---

## Phase 1: Core Game Room Implementation

### ai-risk-ttx-305 [P0] Define Colyseus State Schema
**Priority:** 0
**Type:** task
**Description:** Define GameState and Player schemas using @colyseus/schema
**Design:**
```typescript
class Player extends Schema {
  @type("string") sessionId
  @type("string") name
  @type("string") role
  @type("boolean") isHuman
  @type("number") actionPoints = 3
  @type("boolean") hasSubmitted = false
  @type("boolean") connected = true
}

class GameState extends Schema {
  @type("string") phase: 'lobby' | 'action' | 'consequence' |'end'
  @type("number") round = 0
  @type("number") publicScore = 75
  @type("string") roomCode
  @type({ map: Player }) players
}
```
**Acceptance:**
- Schema classes in server/rooms/schema/GameState.ts
- Proper decorators for synchronization
- Type-safe access to properties

### ai-risk-ttx-306 [P0] GameRoom Lifecycle Methods
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-305
**Description:** Implement onCreate, onJoin, onLeave, onDispose in GameRoom
**Acceptance:**
- onCreate initializes room with code and metadata
- onJoin adds player to state, assigns role
- onLeave sets player.connected = false
- allowReconnection(client, 120) for graceful disconnects
- Two browser tabs see synchronized state
- Reconnect restores same player

### ai-risk-ttx-307 [P0] Message Handler Contracts
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-305
**Description:** Define and implement message handlers with Zod validation
**Design:**
```typescript
// shared/messages.ts
const SubmitActionSchema = z.object({
  actionId: z.string(),
  actionPointsSpent: z.number().min(1).max(3)
})

// GameRoom.ts
onMessage('submit_action', (client, message) => {
  const validated = SubmitActionSchema.parse(message)
  // Process action...
})
```
**Acceptance:**
- All client→server messages validated with Zod
- Messages: submit_action, set_role, start_game, advance_round
- Type-safe message handling

---

## Phase 2: Room Code & Lobby System

### ai-risk-ttx-308 [P0] Room Code Generation
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-306
**Description:** Implement 6-character room code generation and validation
**Acceptance:**
- Generate unique alphanumeric codes (e.g., ABC123)
- Store code in room metadata
- Validate code format on join
- No collision detection (stateless, rely on Colyseus room IDs)

### ai-risk-ttx-309 [P0] Postgres Room Persistence
**Priority:** 0
**Type:** task
**Description:** Integrate Prisma to persist room metadata to Postgres
**Design:**
```prisma
model ColyseusRoom {
  id          String   @id
  code        String   @unique
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  endedAt     DateTime?
  hostId      String?
  playerCount Int      @default(0)
  phase       String   @default("lobby")
}
```
**Acceptance:**
- New Prisma model for ColyseusRoom
- onCreate: Save room to DB with code
- onJoin: Update playerCount
- onDispose: Set endedAt
- DATABASE_URL from env connects to Postgres

### ai-risk-ttx-310 [P0] Client Join Flow
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-308,ai-risk-ttx-309
**Description:** Implement client-side room joining via code
**Acceptance:**
- Lobby page: Create room, display code/QR
- Game page /game/[code]: Resolve roomId from code via API
- client.joinById(roomId) with Colyseus client
- Handle join errors (room full, invalid code)

---

## Phase 3: AI Agent Integration

### ai-risk-ttx-311 [P0] Agent Tool Schema Definition
**Priority:** 0
**Type:** task
**Description:** Define OpenAI Agents SDK tool schemas for game actions
**Design:**
```typescript
const submitActionTool = {
  type: 'function',
  function: {
    name: 'submit_action',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string' },
        reasoning: { type: 'string' }
      },
      required: ['actionId']
    }
  }
}
```
**Acceptance:**
- Tool schemas in server/agents/tools.ts
- Matches message handler contracts
- Compatible with Gemini 2.0 Flash Exp via LiteLLM

### ai-risk-ttx-312 [P0] AI Turn Processing
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-311,ai-risk-ttx-307
**Description:** Integrate AI agents to submit actions during game rounds
**Acceptance:**
- AI players call tools to submit actions
- Execute in parallel for all AI players
- Timeout handling (10s per AI)
- Error handling and fallback to random action

### ai-risk-ttx-313 [P1] LiteLLM Proxy Validation
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-311
**Description:** Validate LiteLLM's translation of complex tool parameters for Gemini
**Acceptance:**
- Test tool calls in isolation
- Verify nested object parameters work
- Document any limitations or workarounds
- If issues found, implement P2 "Complexity Ladder" backup

---

## Phase 4: Full Game Loop

### ai-risk-ttx-314 [P0] Action Submission Flow
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-307,ai-risk-ttx-312
**Description:** Implement complete action submission from players (human + AI)
**Acceptance:**
- Human submits via submit_action message
- AI players auto-submit via agent tools
- Track hasSubmitted in player state
- Prevent duplicate submissions

### ai-risk-ttx-315 [P0] Round Advancement Logic
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-314
**Description:** Implement round advancement and consequence generation
**Acceptance:**
- Host can advance round via advance_round message
- Wait for all players to submit (or timeout)
- Generate consequences using LLM
- Update game state (round++, phase = 'consequence')
- Broadcast new state to all clients

### ai-risk-ttx-316 [P0] End-to-End Game Flow Test
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-315
**Description:** Test complete game from lobby to end
**Acceptance:**
- Create room, join with 2+ clients
- Play through 3 rounds
- AI opponents functioning
- Debrief generated at end
- No connection drops or state desync

---

## Phase 5: Production Edge Cases

### ai-risk-ttx-317 [P0] Disconnection Handling
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-306
**Description:** Handle player disconnections gracefully with 60s reconnection window
**Acceptance:**
- onLeave sets player.connected = false
- allowReconnection(client, 60) permits rejoin
- Reconnected client sees correct state
- Game can continue with disconnected players
- Kill-tab test passes (rejoin within 5s)

### ai-risk-ttx-318 [P1] Concurrent Action Prevention
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-314
**Description:** Prevent race conditions in action submission
**Acceptance:**
- Lock prevents simultaneous submissions
- Reject duplicate action from same player
- Handle rapid message bursts gracefully

### ai-risk-ttx-319 [P1] Game Lifecycle Management
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-309
**Description:** Implement timeouts and cleanup
**Acceptance:**
- Idle timeout: 30 minutes (no activity)
- Max duration: 3 hours
- onDispose cleans up resources
- Memory leak testing (no retained references)
- Update Postgres endedAt on disposal

---

## Phase 6: Admin Dashboard

### ai-risk-ttx-320 [P1] Colyseus Admin API Routes
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-309
**Description:** Create Express routes for admin operations
**Acceptance:**
- GET /colyseus-admin/rooms - list active rooms
- GET /colyseus-admin/rooms/:roomId - state snapshot
- POST /colyseus-admin/rooms/:roomId/force-advance
- POST /colyseus-admin/rooms/:roomId/end
- Authorization via ADMIN_SECRET bearer token

### ai-risk-ttx-321 [P1] Admin Dashboard UI
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-320
**Description:** Update Next.js admin pages to use Colyseus admin routes
**Acceptance:**
- List all active games
- View detailed room state
- Force advance stuck rounds
- End game manually
- < 5 minute diagnostic time for IRL event issues

---

## Phase 7: Deployment & Validation

### ai-risk-ttx-322 [P0] Cloud Run WebSocket Smoke Test
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-304,ai-risk-ttx-316
**Description:** Deploy minimal Colyseus app to Cloud Run and test WebSocket behavior
**Acceptance:**
- Deploy to Cloud Run staging
- Connect from external client
- Verify WebSocket handshake
- Test reconnection over public internet
- Document any Cloud Run-specific issues

### ai-risk-ttx-323 [P1] Feature Flag Implementation
**Priority:** 1
**Type:** task
**Description:** Implement COLYSEUS_ENABLED feature flag for gradual rollout
**Acceptance:**
- Env var COLYSEUS_ENABLED=true/false
- If false, use existing SSE system
- If true, use Colyseus
- Can toggle without code deployment

### ai-risk-ttx-324 [P1] Load Testing
**Priority:** 1
**Type:** task
**Deps:** ai-risk-ttx-322
**Description:** Stress test with 20 concurrent games
**Acceptance:**
- 20 games running simultaneously
- CPU/memory within Cloud Run limits
- < 10s AI action generation
- < 15s consequence generation
- < 200ms WebSocket latency
- Error rate < 0.1%

---

## Phase 8: Observability & Monitoring

### ai-risk-ttx-325 [P1] Structured Logging
**Priority:** 1
**Type:** task
**Description:** Implement structured logging for debugging
**Acceptance:**
- Log context includes: roomId, sessionId, phase, round
- Use console.log with JSON format
- Integrate with Sentry for errors
- No PII in logs

### ai-risk-ttx-326 [P2] Sentry Integration
**Priority:** 2
**Type:** task
**Deps:** ai-risk-ttx-325
**Description:** Configure Sentry for server and client error tracking
**Acceptance:**
- Sentry DSN configured
- Error boundary in React
- Server errors captured
- Source maps uploaded
- Ignore noisy browser errors

---

## Milestone: Pre-Event Validation (T-3 Days: Dec 9)

### ai-risk-ttx-327 [P0] Dry Run with 18-24 People
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-324,ai-risk-ttx-321
**Description:** Full simulation of IRL event conditions
**Acceptance:**
- 18-24 participants
- All join via room codes
- Complete 3-round game
- Admin dashboard used for monitoring
- Document all issues found
- < 5% error rate

### ai-risk-ttx-328 [P0] GO/NO-GO Decision
**Priority:** 0
**Type:** task
**Deps:** ai-risk-ttx-327
**Description:** Final decision: Use Colyseus or fallback to SSE
**Acceptance:**
- Dry run success rate > 95%
- Reconnection working reliably
- Admin team comfortable with dashboard
- Rollback plan tested
- If NO-GO: Set COLYSEUS_ENABLED=false

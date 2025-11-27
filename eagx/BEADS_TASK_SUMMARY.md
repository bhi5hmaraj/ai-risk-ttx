# Colyseus Migration - Beads Task Breakdown Summary

## Overview
Created **23 detailed sub-tasks** in Beads for the EAGx Colyseus migration (Dec 12, 2025 IRL event).

---

## What Was Created

### Phase 0-1: Core Infrastructure (6 tasks)
**Impact:** Foundation for all Colyseus functionality

1. **ai-risk-ttx-574** - Colyseus State Schema Definition [P0]
   - **Effect:** Enables state synchronization between server and all clients
   - **Files:** `server/rooms/schema/GameState.ts`
   - **Changes:** New Player and GameState schema classes with decorators

2. **ai-risk-ttx-575** - GameRoom Lifecycle Implementation [P0]
   - **Effect:** Handles player joining, leaving, and reconnection
   - **Files:** `server/rooms/GameRoom.ts`
   - **Changes:** onCreate, onJoin, onLeave, allowReconnection methods

3. **ai-risk-ttx-576** - Message Handler Contracts with Zod [P0]
   - **Effect:** Type-safe client-server communication
   - **Files:** `shared/messages.ts`, `server/rooms/GameRoom.ts`
   - **Changes:** Zod validation schemas for all messages

### Phase 2: Room Codes & Persistence (3 tasks)
**Impact:** Players can create and join games via simple codes

4. **ai-risk-ttx-577** - Room Code Generation System [P0]
   - **Effect:** Simple 6-character codes for easy game joining
   - **Files:** `server/lib/room-codes.ts`
   - **Changes:** Code generation utility, QR code support

5. **ai-risk-ttx-578** - Postgres Room Persistence with Prisma [P0]
   - **Effect:** Room metadata survives server restarts, enables analytics
   - **Files:** `prisma/schema.prisma`, `server/lib/prisma.ts`
   - **Changes:** New ColyseusRoom model, migration, onCreate/onJoin/onDispose hooks
   - **Database:** New table `ColyseusRoom` with code, timestamps, player count

6. **ai-risk-ttx-579** - Client Join Flow via Room Code [P0]
   - **Effect:** Users can join games from any device via code
   - **Files:** `app/lobby/page.tsx`, `app/game/[code]/page.tsx`, `services/colyseusClient.ts`
   - **Changes:** Lobby UI for code display, join flow with error handling

### Phase 3: AI Integration (3 tasks)
**Impact:** AI opponents function in multiplayer games

7. **ai-risk-ttx-580** - AI Agent Tool Schema Definition [P0]
   - **Effect:** AI agents can interact with game using OpenAI tools
   - **Files:** `server/agents/tools.ts`
   - **Changes:** Tool definitions matching message contracts

8. **ai-risk-ttx-581** - AI Turn Processing Integration [P0]
   - **Effect:** AI players submit actions automatically during rounds
   - **Files:** `server/rooms/GameRoom.ts`, `server/agents/ai-player.ts`
   - **Changes:** Parallel AI execution, timeout handling, fallback logic

9. **ai-risk-ttx-582** - LiteLLM Gemini Tool Call Validation [P1]
   - **Effect:** Early detection of LiteLLM/Gemini compatibility issues
   - **Files:** `tests/litellm-validation.test.ts`
   - **Changes:** Isolated test suite for tool calling

### Phase 4: Full Game Loop (3 tasks)
**Impact:** Complete playable game end-to-end

10. **ai-risk-ttx-583** - Action Submission Flow (Human + AI) [P0]
    - **Effect:** Both humans and AI can submit actions, game tracks completion
    - **Files:** `server/rooms/GameRoom.ts`, updates to message handlers
    - **Changes:** hasSubmitted tracking, duplicate prevention

11. **ai-risk-ttx-584** - Round Advancement and Consequence Generation [P0]
    - **Effect:** Game progresses through rounds with LLM-generated consequences
    - **Files:** `server/rooms/GameRoom.ts`, integration with `server/services/llm/*`
    - **Changes:** Round advancement logic, consequence integration, state updates

12. **ai-risk-ttx-585** - End-to-End Game Flow Testing [P0]
    - **Effect:** Confidence that full game works before deploying
    - **Files:** `tests/e2e-game-flow.test.ts`, `scripts/test-full-game.ts`
    - **Changes:** Comprehensive test suite

### Phase 5: Production Edge Cases (3 tasks)
**Impact:** Reliability under real-world conditions

13. **ai-risk-ttx-586** - Disconnection Handling with Reconnection Window [P0]
    - **Effect:** Players can rejoin after network issues (60s window)
    - **Files:** `server/rooms/GameRoom.ts` (enhanced onLeave)
    - **Changes:** Reconnection window, state preservation, kill-tab tests

14. **ai-risk-ttx-587** - Concurrent Action Prevention (Lock Mechanism) [P1]
    - **Effect:** No data corruption from race conditions
    - **Files:** `server/rooms/GameRoom.ts` (action handler locks)
    - **Changes:** Mutex/lock implementation for submissions

15. **ai-risk-ttx-588** - Game Lifecycle and Cleanup Management [P1]
    - **Effect:** No memory leaks, automatic cleanup of inactive games
    - **Files:** `server/rooms/GameRoom.ts` (onDispose, timeouts)
    - **Changes:** 30min idle timeout, 3hr max duration, resource cleanup

### Phase 6: Admin Dashboard (2 tasks)
**Impact:** On-site debugging capability during IRL event

16. **ai-risk-ttx-589** - Colyseus Admin API Routes [P1]
    - **Effect:** Backend support for admin operations
    - **Files:** `server/api/colyseus-admin.ts` (new Express routes)
    - **Changes:** Routes for listing rooms, viewing state, force advance, end game

17. **ai-risk-ttx-590** - Admin Dashboard UI Integration [P1]
    - **Effect:** < 5 minute diagnostic time during event issues
    - **Files:** `app/admin/colyseus/page.tsx`
    - **Changes:** List view, detail view, action buttons, auto-refresh

### Phase 7: Deployment & Validation (3 tasks)
**Impact:** Production readiness

18. **ai-risk-ttx-591** - Cloud Run WebSocket Smoke Test [P0]
    - **Effect:** Early validation of WebSocket behavior on Cloud Run
    - **Files:** Deployment only, no code changes
    - **Changes:** Deploy to staging, external client tests, issue documentation

19. **ai-risk-ttx-592** - Feature Flag: COLYSEUS_ENABLED Toggle [P1]
    - **Effect:** Safe rollout with instant rollback capability
    - **Files:** `server/index.ts`, `middleware.ts`
    - **Changes:** Conditional routing based on env var

20. **ai-risk-ttx-593** - Load Testing: 20 Concurrent Games [P1]
    - **Effect:** Confidence in production performance under load
    - **Files:** `scripts/load-test-colyseus.ts`
    - **Changes:** Load test script, performance benchmarks

### Phase 8: Observability (1 task)
**Impact:** Debugging and monitoring

21. **ai-risk-ttx-594** - Structured Logging Implementation [P1]
    - **Effect:** Easier debugging with contextual logs
    - **Files:** `server/lib/logger.ts`, all GameRoom methods
    - **Changes:** JSON logging with roomId/sessionId context, Sentry integration

### Milestone: Pre-Event (2 tasks)
**Impact:** GO/NO-GO decision confidence

22. **ai-risk-ttx-fdqt** - Pre-Event Dry Run with 18-24 People [P0]
    - **Effect:** Full simulation under realistic conditions
    - **Files:** Documentation of results
    - **Changes:** Test execution, issue tracking

23. **ai-risk-ttx-tbx4** - GO/NO-GO Decision: Colyseus vs SSE Fallback [P0]
    - **Effect:** Informed decision on technology choice for Dec 12 event
    - **Files:** Decision document with evidence
    - **Changes:** Environment variable configuration based on decision

---

## Documentation References

All tasks include references to:
- **eagx/TASK_BREAKDOWN_GUIDE.md** - Contract-first approach, phase details
- **eagx/TASKS_DRAFT.md** - Original task planning
- **eagx/PRD.md** - Requirements and success criteria
- **eagx/GEMINI_FEEDBACK.md** - Risks and mitigation strategies
- **warden_dilemma/** - Working example patterns

---

## Next Steps

1. **View all tasks:**
   ```bash
   bd list | grep -E "(Colyseus|Room Code|GameRoom)"
   ```

2. **See ready work (no blockers):**
   ```bash
   bd ready
   ```

3. **Start Phase 0-1 tasks first:**
   - ai-risk-ttx-574 (Schema)
   - ai-risk-ttx-575 (Lifecycle)
   - ai-risk-ttx-576 (Messages)

4. **Track progress:**
   ```bash
   bd stats
   ```

---

## Critical Path to Dec 12

**Days 1-2 (Nov 27-28):**
- Phase 0-1: Core infrastructure
- ai-risk-ttx-591: Cloud Run smoke test ✅ MUST PASS

**Days 3-6 (Nov 29-Dec 2):**
- Phase 2-4: Room codes, AI, full game loop
- ai-risk-ttx-582: LiteLLM validation ✅ MUST PASS

**Days 7-9 (Dec 3-5):**
- Phase 5: Edge cases (reconnection, cleanup)
- Phase 6: Admin dashboard

**Days 10-11 (Dec 6-7):**
- Phase 7: Load testing, feature flag

**Day 12 (Dec 9, T-3):**
- ai-risk-ttx-fdqt: Dry run with 18-24 people ✅ MUST PASS
- ai-risk-ttx-tbx4: GO/NO-GO decision

**Dec 12:**
- IRL Event with selected technology

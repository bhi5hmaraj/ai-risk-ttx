# Phase 2: Colyseus Migration - Frontend Integration

**Status**: 🟡 In Progress (40% Complete)
**Last Updated**: 2025-11-28
**Related**: `eagx/colyseus-migration-tasks.md`, `eagx/STATE_ARCHITECTURE.md`, `eagx/RETROSPECTIVE_2025-11-28.md`

**⚠️ CRITICAL GAPS**: Room code system, Cloud Run validation, multi-player testing

## Overview

Phase 2 focuses on replacing legacy HTTP/SSE-based frontend architecture with Colyseus WebSocket integration. The goal is to remove all dependencies on SessionService, HTTP polling, and SSE streams while maintaining the existing UI/UX.

## Architecture Comparison

### Legacy (HTTP + SSE)
```
Client                    Server
  ↓                         ↓
SessionService.create() → POST /api/session/create
  ↓                         ↓
SessionMeta stored    ← {id, revision, hostToken}
  ↓
SessionService.start() → POST /api/session/:id/start
  ↓                         ↓
SSE subscription      ← GET /api/session/:id/events
  ↓                         ↓
useSession hook       → Parse SSE events
  ↓                         ↓
SessionStore update   → Update gameState
  ↓
useRoundOptions       → GET /api/session/:id/action-options
  ↓
SessionService.submitActions() → POST /api/session/:id/actions
  ↓
SessionService.advance() → POST /api/session/:id/advance
```

### New (Colyseus WebSocket)
```
Client                    Server
  ↓                         ↓
colyseusClient.join() → WebSocket handshake
  ↓                         ↓
Room connection       ← GameRoom.onCreate()
  ↓                         ↓
room.send("start_game") → GameStartHandler
  ↓                         ↓
room.onStateChange()  ← Colyseus Schema sync (automatic)
  ↓                         ↓
ColyseusProvider      → syncColyseusToZustand()
  ↓                         ↓
Zustand stores updated → gameStore, sessionStore
  ↓                         ↓
room.onMessage("action_options") ← Generated server-side
  ↓                         ↓
actionStore.setActionOptions() → Options available
  ↓
room.send("submit_action") → ActionSubmissionHandler
  ↓
room.send("advance_round") → RoundAdvanceHandler
```

## Legacy Dependencies Audit

### Files Using Legacy SessionService

| File | Usage | Status | Notes |
|------|-------|--------|-------|
| `hooks/useGameActions.ts` | `SessionService.create()`, `.start()`, `.submitActions()`, `.advance()` | 🔴 Needs replacement | Core game flow |
| `hooks/useRoundOptions.ts` | `SessionService.getActionOptions()` | 🟡 Partially fixed | Now using Colyseus messages |
| `hooks/useGameController.ts` | `SessionService.create()`, `.start()` | 🔴 Needs replacement | Alternative flow |
| `components/SessionMonitor.tsx` | SSE subscription | 🔴 Needs removal | No longer needed |
| `stores/sessionStore.ts` | `sessionMeta`, `sseStatus` | 🟡 Needs refactor | Keep hasStartIntent |
| `hooks/useSession.ts` | Returns sessionMeta | 🟡 Needs refactor | Thin wrapper |
| `components/RouteOrchestrator.tsx` | Checks `sessionMeta` | 🟡 Needs update | Navigation logic |

### Files Using Legacy GameService

| File | Usage | Status | Notes |
|------|-------|--------|-------|
| None currently | - | ✅ Clean | GameService not actively used |

## Migration Tasks

### ✅ Completed (Phase 1 + Recent Fixes)

1. **Server Infrastructure**
   - [x] Colyseus server setup (`server/index.ts`)
   - [x] GameRoom with StateManager + Schema sync
   - [x] Handler pattern (SOLID refactoring) - 8 handlers
   - [x] LLM integration in GameStartHandler
   - [x] Action option generation server-side
   - [x] **NEW**: maxRounds field in schema and adapters
   - [x] **NEW**: State adapter with phase enum mapping
   - [x] **NEW**: Auto-advance on all_submitted

2. **Client Infrastructure**
   - [x] ColyseusProvider with global connection
   - [x] State sync (Colyseus → Zustand)
   - [x] useGameActionsColyseus hook
   - [x] Navigation on game_started event
   - [x] **NEW**: Enriched player data preservation
   - [x] **NEW**: hasStartIntent clearing on game_ended
   - [x] **NEW**: Diagnostic logging for navigation

### 🟡 In Progress (Phase 2) - **Updated Nov 28**

3. **Replace useGameActions.ts** ✅ **DONE**
   - [x] Remove `SessionService.create()` → Use `colyseus.connect()`
   - [x] Remove `SessionService.start()` → Use `colyseus.startGame()`
   - [x] Remove `SessionService.submitActions()` → Use `colyseus.submitAction()`
   - [x] Remove `SessionService.advance()` → Use `colyseus.advanceRound()`
   - [x] Update handleConfirmActions to use Colyseus messages
   - [x] Remove sessionCreationInFlightRef (no longer needed)

4. **Fix useRoundOptions.ts** ✅ **DONE**
   - [x] Add Colyseus message listener in ColyseusProvider
   - [x] Remove SessionService.getActionOptions() call
   - [x] Remove sessionMeta check (use Colyseus connection state instead)
   - [x] Show loading state while waiting for action_options message
   - [x] Handle action options arriving asynchronously

5. **Refactor sessionStore** ⚠️ **PARTIAL**
   - [ ] Remove `sessionMeta` (still exists, not used in Colyseus flow)
   - [ ] Remove `sseStatus` (still exists, not used)
   - [x] Keep `hasStartIntent` (used by RouteOrchestrator) - **NOW CLEARED ON GAME END**
   - [ ] Add `colyseusSessionId` for player identification
   - [x] Add `isGeneratingOptions` loading flag - **DONE**

6. **Remove SessionMonitor component** ❌ **NOT DONE**
   - [ ] Remove `components/SessionMonitor.tsx`
   - [ ] Remove mount in `app/layout.tsx`
   - [ ] SSE handling now done by Colyseus onMessage
   - **Note**: Can be deferred, doesn't break anything

7. **Update RouteOrchestrator** ✅ **MOSTLY DONE**
   - [x] Add detailed diagnostic logging
   - [x] Fix navigation to /end (phase check working)
   - [ ] Remove `sessionMeta` check (still present but not critical)
   - [ ] Use Colyseus connection state instead

### 🔴 Blocked / Not Started

8. **Testing & Validation**
   - [ ] End-to-end flow: Lobby → Start → Actions → Advance → End
   - [ ] Multi-player testing (2+ human players)
   - [ ] Reconnection handling (seat reservation fix)
   - [ ] Loading states during LLM calls
   - [ ] Error handling (connection drops, LLM failures)

9. **Cleanup**
   - [ ] Remove unused SessionService methods
   - [ ] Remove SSE-related code
   - [ ] Update documentation
   - [ ] Remove legacy API routes (after confirming not used)

## Current Issues - **Updated Nov 28**

### 🔴 Critical - **ACTIVE**

1. ~~**"seat reservation expired" error**~~ ✅ **FIXED Nov 27**
   - ~~**Symptom**: WebSocket connection fails with seat reservation timeout~~
   - **Fix Applied**: Increased Colyseus `reserveTime` to 30 seconds

2. ~~**Missing loading state for action options**~~ ✅ **FIXED Nov 27**
   - ~~**Symptom**: Client shows "Game session not initialized" immediately~~
   - **Fix Applied**: Added isGeneratingOptions flag and LoadingScreen

3. ~~**useRoundOptions still calling legacy HTTP**~~ ✅ **FIXED Nov 27**
   - ~~**Symptom**: SessionService.getActionOptions() call fails with "no sessionMeta"~~
   - **Fix Applied**: Removed SessionService call, using Colyseus messages

4. ~~**Game stuck at end state**~~ ✅ **FIXED Nov 28**
   - ~~**Symptom**: Navigation to /end but stuck showing "waiting for opponents"~~
   - **Fix Applied**: Clear hasStartIntent on game_ended, add auto-advance on all_submitted

5. **End screen is blank** 🔴 **NEW ISSUE - Nov 28**
   - **Symptom**: Navigation to /end works, but screen renders blank/white
   - **Root cause**: Unknown - EndPage phase check might be failing, or data missing
   - **Impact**: Game can't complete, users see blank screen
   - **Fix needed**: Debug eventLog, players array, debrief API call
   - **Diagnostic logs added**: RouteOrchestrator and EndPage have detailed logging

### 🟡 Medium Priority

6. ~~**RouteOrchestrator sessionMeta dependency**~~ ⚠️ **PARTIALLY FIXED**
   - **Status**: Navigation works, but sessionMeta checks still present (harmless)
   - **Impact**: Dead code, should clean up post-event

7. ~~**SessionStore schema mismatch**~~ ⚠️ **PARTIALLY FIXED**
   - **Status**: sessionMeta/sseStatus still in store but unused
   - **Impact**: Dead code, no functional impact

### 🔴 Critical - **BLOCKING EVENT**

8. **Room code system missing** ❌ **NOT IMPLEMENTED**
   - **Impact**: Can't do multi-player - users have no way to join
   - **Severity**: SHOW-STOPPER
   - **Time needed**: 3-5 days

9. **Cloud Run deployment never tested** ❌ **NOT VALIDATED**
   - **Impact**: Don't know if production deployment works
   - **Severity**: SHOW-STOPPER
   - **Time needed**: 1-2 days

10. **No multi-player testing** ❌ **NOT DONE**
    - **Impact**: Unknown bugs with 2+ humans
    - **Severity**: HIGH
    - **Time needed**: 2-3 days

## Implementation Strategy

### Step 1: Fix Loading States (Immediate)

**Goal**: Show loading screen while waiting for action options

**Changes needed**:
1. Add `isGeneratingOptions` flag to actionStore
2. Set flag when game_started event received
3. Clear flag when action_options event received
4. Update GamePage to show LoadingScreen during generation

**Files to modify**:
- `stores/actionStore.ts` - Add isGeneratingOptions state
- `providers/ColyseusProvider.tsx` - Set flag on game_started
- `app/game/page.tsx` - Show LoadingScreen if isGeneratingOptions

### Step 2: Replace useGameActions (High Priority)

**Goal**: Remove all SessionService calls, use Colyseus messages

**Changes needed**:
1. Create new `useGameActionsColyseus.ts` (or rename existing)
2. Replace handleStartGame to use colyseus.startGame()
3. Replace handleConfirmActions to use colyseus.submitAction()
4. Remove sessionMeta dependencies
5. Update UI components to use new hook

**Files to modify**:
- `hooks/useGameActionsColyseus.ts` - Implement full Colyseus flow
- `app/lobby/page.tsx` - Use new hook
- `app/game/page.tsx` - Use new hook

### Step 3: Refactor sessionStore (Medium Priority)

**Goal**: Remove legacy HTTP session concepts

**New schema**:
```typescript
interface SessionStore {
  // Colyseus connection state
  colyseusRoomId: string | null;
  colyseusSessionId: string | null;
  isConnected: boolean;

  // Navigation state (keep these)
  hasStartIntent: boolean;

  // Loading states
  isGeneratingScenario: boolean;
  isGeneratingOptions: boolean;

  // Methods
  setColyseusConnection: (roomId: string, sessionId: string) => void;
  setStartIntent: (v: boolean) => void;
  clear: () => void;
}
```

### Step 4: Fix seat reservation (Critical)

**Options**:
1. Increase Colyseus `reserveTime` setting
2. Pre-fetch room before user clicks "Start"
3. Add retry logic for seat reservation failures
4. Use reconnection tokens more aggressively

### Step 5: End-to-End Testing

**Test scenarios**:
1. Single player full game flow
2. Multi-player game (2-3 humans)
3. Network interruption handling
4. Browser refresh/back button
5. Concurrent games (multiple tabs)

## Success Criteria

- [ ] No SessionService calls in production code
- [ ] No SSE subscriptions
- [ ] All game flows work via Colyseus
- [ ] Loading states shown during async operations
- [ ] No "seat reservation expired" errors
- [ ] Clean navigation (no sessionMeta checks)
- [ ] Tests passing for new Colyseus flow

## Rollback Plan

If Colyseus migration causes critical issues:

1. Revert to `main` branch (pre-migration)
2. Keep Colyseus code in feature branch
3. Fix issues incrementally
4. Re-merge when stable

**Revert commits**:
```bash
git revert 5fa94fc..HEAD  # Revert all Phase 2 commits
git push origin feat/stein-multiplayer --force
```

## Notes

- **sessionMeta is dead weight** - It's checked in multiple places but never set in Colyseus flow
- **SSE code can be removed** - Colyseus handles all real-time communication
- **Loading states are critical** - LLM calls take 5-60s, users need feedback
- ~~**Seat reservation is a Colyseus anti-pattern**~~ → **FIXED** with 30s timeout
- **Tests need updating** - Most tests assume HTTP/SSE architecture

## Next Steps - **Updated Nov 28**

1. ✅ ~~Complete audit (this document)~~
2. ✅ ~~Implement loading states for action options~~
3. ✅ ~~Replace useGameActions with Colyseus messages~~
4. ✅ ~~Fix seat reservation timeout~~
5. ⚠️ Refactor sessionStore (partial, non-critical)
6. ❌ **End-to-end testing** - CRITICAL, NOT DONE
7. ⚠️ Remove legacy code (partial cleanup done)

## Immediate Priorities (Next 7 Days)

**SHOW-STOPPERS** (Must be done for Dec 12 event):
1. **Fix end screen blank issue** (1 day) - Game can't complete
2. **Room code system** (3-5 days) - Can't do multi-player without this
3. **Cloud Run deployment test** (1-2 days) - Never validated
4. **Multi-player testing** (2-3 days) - Unknown bugs
5. **Dry run with 18-24 people** (1 day + fixes) - Validation

**TIMELINE**: Extremely tight. Need to complete items 1-4 by Dec 9 for GO/NO-GO decision.

## Updated Success Metrics

### Completed ✅
- [x] Core Colyseus infrastructure
- [x] State synchronization (Colyseus → Zustand)
- [x] Server-side action generation
- [x] Auto-advance on all submissions
- [x] Navigation to end screen
- [x] maxRounds synchronization
- [x] Private objectives display

### In Progress ⚠️
- [ ] End screen rendering (navigation works, content missing)
- [ ] SessionStore cleanup (non-critical)
- [ ] Legacy code removal (non-critical)

### Blocked ❌
- [ ] Room code joining
- [ ] Cloud Run deployment
- [ ] Multi-player validation
- [ ] Admin dashboard
- [ ] Disconnection handling
- [ ] Load testing
- [ ] Dry run

## Decision Point

**GO/NO-GO Criteria for Dec 9**:
- **GO if**: Room codes work, Cloud Run tested, dry run successful (>95% success rate)
- **NO-GO if**: Any show-stopper incomplete → Fallback to SSE (proven to work)

**See**: `eagx/RETROSPECTIVE_2025-11-28.md` for detailed analysis and recommendations.

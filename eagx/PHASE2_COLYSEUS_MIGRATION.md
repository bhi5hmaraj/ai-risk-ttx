# Phase 2: Colyseus Migration - Frontend Integration

**Status**: 🟡 In Progress
**Last Updated**: 2025-11-27
**Related**: `eagx/colyseus-migration-tasks.md`, `eagx/STATE_ARCHITECTURE.md`

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

### ✅ Completed (Phase 1)

1. **Server Infrastructure**
   - [x] Colyseus server setup (`server/index.ts`)
   - [x] GameRoom with StateManager + Schema sync
   - [x] Handler pattern (SOLID refactoring)
   - [x] LLM integration in GameStartHandler
   - [x] Action option generation server-side

2. **Client Infrastructure**
   - [x] ColyseusProvider with global connection
   - [x] State sync (Colyseus → Zustand)
   - [x] useGameActionsColyseus hook
   - [x] Navigation on game_started event

### 🟡 In Progress (Phase 2)

3. **Replace useGameActions.ts**
   - [ ] Remove `SessionService.create()` → Use `colyseus.connect()`
   - [ ] Remove `SessionService.start()` → Use `colyseus.startGame()`
   - [ ] Remove `SessionService.submitActions()` → Use `colyseus.submitAction()`
   - [ ] Remove `SessionService.advance()` → Use `colyseus.advanceRound()`
   - [ ] Update handleConfirmActions to use Colyseus messages
   - [ ] Remove sessionCreationInFlightRef (no longer needed)

4. **Fix useRoundOptions.ts**
   - [x] Add Colyseus message listener in ColyseusProvider
   - [ ] Remove SessionService.getActionOptions() call
   - [ ] Remove sessionMeta check (use Colyseus connection state instead)
   - [ ] Show loading state while waiting for action_options message
   - [ ] Handle action options arriving asynchronously

5. **Refactor sessionStore**
   - [ ] Remove `sessionMeta` (replace with Colyseus roomId/sessionId)
   - [ ] Remove `sseStatus` (no longer using SSE)
   - [ ] Keep `hasStartIntent` (used by RouteOrchestrator)
   - [ ] Add `colyseusSessionId` for player identification
   - [ ] Add `isGeneratingOptions` loading flag

6. **Remove SessionMonitor component**
   - [ ] Remove `components/SessionMonitor.tsx`
   - [ ] Remove mount in `app/layout.tsx`
   - [ ] SSE handling now done by Colyseus onMessage

7. **Update RouteOrchestrator**
   - [ ] Remove `sessionMeta` check
   - [ ] Use Colyseus connection state instead
   - [ ] Check `room.state.phase` instead of HTTP session

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

## Current Issues

### 🔴 Critical

1. **"seat reservation expired" error**
   - **Symptom**: WebSocket connection fails with seat reservation timeout
   - **Root cause**: Colyseus reserves seats temporarily during join, expires if client doesn't connect fast enough
   - **Impact**: Players can't reconnect, connection unstable
   - **Fix needed**: Adjust Colyseus `reserveTime` or fix connection timing

2. **Missing loading state for action options**
   - **Symptom**: Client shows "Game session not initialized" immediately
   - **Root cause**: Trying to check sessionMeta (doesn't exist in Colyseus)
   - **Impact**: Poor UX, confusing error message
   - **Fix needed**: Show LoadingScreen while waiting for action_options message

3. **useRoundOptions still calling legacy HTTP**
   - **Symptom**: SessionService.getActionOptions() call fails with "no sessionMeta"
   - **Root cause**: Hook not updated to use Colyseus messages
   - **Impact**: Action options never load
   - **Fix needed**: Remove SessionService call, rely on Colyseus broadcast

### 🟡 Medium Priority

4. **RouteOrchestrator sessionMeta dependency**
   - **Symptom**: Navigation logic checks sessionMeta existence
   - **Root cause**: Legacy HTTP session checking
   - **Impact**: Navigation might fail without sessionMeta
   - **Fix needed**: Check Colyseus connection state instead

5. **SessionStore schema mismatch**
   - **Symptom**: sessionMeta stored but never set in Colyseus flow
   - **Root cause**: Store designed for HTTP sessions
   - **Impact**: Dead code, potential bugs
   - **Fix needed**: Refactor to Colyseus-native schema

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
- **Seat reservation is a Colyseus anti-pattern** - Need to understand their best practices
- **Tests need updating** - Most tests assume HTTP/SSE architecture

## Next Steps

1. ✅ Complete audit (this document)
2. → Implement loading states for action options
3. → Replace useGameActions with Colyseus messages
4. → Fix seat reservation timeout
5. → Refactor sessionStore
6. → End-to-end testing
7. → Remove legacy code

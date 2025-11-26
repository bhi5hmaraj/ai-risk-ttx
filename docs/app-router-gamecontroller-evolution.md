# useGameController Evolution: App Router Migration

## Current Architecture (SPA Mode)

### How it Works Today

**File**: `hooks/useGameController.ts` (600+ lines)

```typescript
// Single hook managing all game state
export const useGameController = () => {
  const [gameState, setGameState] = useState<GameState>(...);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  // ... 15+ more state variables

  // Feature flag determines mode
  const USE_BACKEND_STATE = useMemo(() => {
    return process.env.NEXT_PUBLIC_BACKEND_STATE === '1';
  }, []);

  // Dual-mode operation
  const handleConfirmActions = useCallback((actions) => {
    if (USE_BACKEND_STATE) {
      // Server-authoritative path (lines 254-298)
      sessionClient.submitActions(...);
      sessionClient.advance(...);
    } else {
      // Client-side state management (lines 299-305)
      runConsequencePhase(...);
    }
  }, [USE_BACKEND_STATE, ...deps]);
};
```

### Current Usage Pattern

**File**: `app/page.tsx` (SPA-style routing)

```typescript
export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Hook called once at top level
  const { state, actions, derived } = useGameController();

  // Screens rendered conditionally
  const renderScreen = () => {
    switch (currentScreen) {
      case 'lobby': return <LobbyScreen {...state} {...actions} />;
      case 'game': return <GameScreen {...state} {...actions} />;
      // ...
    }
  };

  return <>{renderScreen()}</>;
}
```

**Problem**: When we migrate to proper page routes, state will be lost on navigation because each page re-mounts the hook.

---

## After App Router Migration

### Required Changes

#### 1. **Lift State to Context Provider** ⚠️ CRITICAL CHANGE

**New File**: `contexts/GameContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useGameController } from '@/hooks/useGameController';

type GameContextType = ReturnType<typeof useGameController>;

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const gameController = useGameController();
  return <GameContext.Provider value={gameController}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
```

**Wrap in Layout**: `app/layout.tsx`

```typescript
import { GameProvider } from '@/contexts/GameContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameProvider>
          <Navigation />
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
```

---

#### 2. **Replace Hook Calls with Context Consumer**

**Before** (in app/page.tsx):
```typescript
const { state, actions, derived } = useGameController();
```

**After** (in app/lobby/page.tsx):
```typescript
import { useGame } from '@/contexts/GameContext';

export default function LobbyPage() {
  const { state, actions, derived } = useGame();

  return (
    <LobbyScreen
      selectedRoleName={state.selectedRoleName}
      setSelectedRoleName={actions.setSelectedRoleName}
      gamePath={state.gamePath}
      // ...
    />
  );
}
```

**Benefit**: State persists across page navigations! 🎉

---

#### 3. **Navigation Layer Changes**

**Before** (SPA):
```typescript
// app/page.tsx
setCurrentScreen('lobby'); // useState
```

**After** (App Router):
```typescript
// screens/GameRulesScreen.tsx
'use client';
import { useRouter } from 'next/navigation';

export function GameRulesScreen({ onNavigateToLobby }: Props) {
  const router = useRouter();

  const handleNavigate = () => {
    router.push('/lobby'); // Next.js routing
  };

  return <button onClick={handleNavigate}>Go to Lobby</button>;
}
```

**OR** keep callback pattern:
```typescript
// app/page.tsx (now just the home page)
export default function HomePage() {
  const router = useRouter();

  return (
    <GameRulesScreen
      onNavigateToLobby={() => router.push('/lobby')}
    />
  );
}
```

---

#### 4. **Phase-Based Automatic Routing** (OPTIONAL)

Currently, `app/page.tsx` has automatic navigation logic based on game phase:

```typescript
// Current: lines 234-252 in app/page.tsx
useEffect(() => {
  if (gameState.phase === GamePhase.STARTING ||
      gameState.phase === GamePhase.ACTION ||
      gameState.phase === GamePhase.CONSEQUENCE) {
    if (humanPlayer) {
      setCurrentScreen('game');
    }
  }
  if (gameState.phase === GamePhase.END) {
    setCurrentScreen('end');
  }
}, [gameState.phase, humanPlayer]);
```

**After Migration** - Add to `useGameController` or separate `usePhaseRouter` hook:

```typescript
// hooks/usePhaseRouter.ts
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { GamePhase } from '@/types';

export function usePhaseRouter(phase: GamePhase, humanPlayer: Player | null) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Auto-navigate based on game phase
    if (phase === GamePhase.STARTING ||
        phase === GamePhase.ACTION ||
        phase === GamePhase.CONSEQUENCE) {
      if (humanPlayer && pathname !== '/game') {
        router.push('/game');
      } else if (!humanPlayer && pathname !== '/lobby') {
        router.push('/lobby');
      }
    }

    if (phase === GamePhase.END && pathname !== '/end') {
      router.push('/end');
    }
  }, [phase, humanPlayer, pathname, router]);
}
```

**Usage in Layout**:
```typescript
// app/layout.tsx
'use client';

export default function RootLayout({ children }: { children: ReactNode }) {
  const { state, derived } = useGame();
  usePhaseRouter(state.gameState.phase, derived.humanPlayer);

  return <>{children}</>;
}
```

---

### What Stays THE SAME ✅

The good news: **Most of `useGameController` stays unchanged!**

#### ✅ Dual-Mode Operation Preserved

```typescript
// This logic remains IDENTICAL
const handleConfirmActions = useCallback((actions) => {
  if (USE_BACKEND_STATE) {
    // Server-authoritative mode (session backend)
    sessionClient.submitActions(sessionMeta.id, humanPlayer.id, actions, sessionMeta.revision);
    sessionClient.advance(sessionMeta.id, ...);
  } else {
    // Client-side state management
    runConsequencePhase(updatedPlayers, gameState);
  }
}, [USE_BACKEND_STATE, sessionMeta, ...]);
```

#### ✅ SSE Streaming (lines 515-549)

```typescript
// EventSource connection for real-time updates - NO CHANGES NEEDED
useEffect(() => {
  if (!USE_BACKEND_STATE || !sessionMeta?.id) return;

  const source = new EventSource(`/api/session/${sessionMeta.id}/stream`);
  source.addEventListener('session', (event) => {
    const payload = JSON.parse(event.data);
    setGameState(payload.snapshot.state);
    setPlayers(...);
  });

  return () => source.close();
}, [USE_BACKEND_STATE, sessionMeta?.id]);
```

#### ✅ All Game Logic

- `runConsequencePhase` - Unchanged
- `handleStartGame` - Unchanged
- `callLLMAndCount` - Unchanged
- Action generation logic - Unchanged
- Timer/pause logic - Unchanged

---

## Summary: What Changes, What Doesn't

### 🔴 **MUST CHANGE** (Breaking Changes)

1. **Create GameProvider** - Wrap app in context provider
2. **Replace `useGameController()` calls** - Use `useGame()` from context in all pages/screens
3. **Navigation calls** - Use `router.push('/path')` instead of `setCurrentScreen()`
4. **Phase-based routing** - Move from conditional rendering to `usePhaseRouter` hook

### 🟢 **NO CHANGES NEEDED** (Preserved)

1. ✅ Feature flag (`USE_BACKEND_STATE`)
2. ✅ Dual-mode operation (client vs server-authoritative)
3. ✅ Session backend integration (`sessionClient` calls)
4. ✅ SSE streaming for real-time updates
5. ✅ All game logic (consequence calculation, AI turns, etc.)
6. ✅ State structure (GameState, Player[], etc.)
7. ✅ LLM API integration

---

## Migration Checklist

### Phase 1: Create Context
- [ ] Create `contexts/GameContext.tsx`
- [ ] Add `GameProvider` to `app/layout.tsx`
- [ ] Export `useGame()` hook

### Phase 2: Update Pages
- [ ] Replace `useGameController()` → `useGame()` in all pages
- [ ] Update Navigation component to use `useRouter()`
- [ ] Update screen components to accept router prop or use hook directly

### Phase 3: Phase-Based Routing
- [ ] Create `hooks/usePhaseRouter.ts`
- [ ] Add to layout or create wrapper component
- [ ] Remove conditional screen rendering from app/page.tsx

### Phase 4: Testing
- [ ] Run navigation tests (19 tests must pass)
- [ ] Test state persistence across routes
- [ ] Test both modes: `BACKEND_STATE=0` and `BACKEND_STATE=1`
- [ ] Test SSE streaming with backend mode
- [ ] Test browser back/forward buttons

---

## Architecture Diagram: Before vs After

### BEFORE (Current SPA)
```
┌────────────────────────────────────────┐
│         app/page.tsx                   │
│  const [screen, setScreen] = useState  │
│  const controller = useGameController()│
│                                        │
│  switch(screen) {                      │
│    case 'lobby': <LobbyScreen />       │
│    case 'game': <GameScreen />         │
│  }                                     │
└────────────────────────────────────────┘
         ↓ ALL STATE LIVES HERE
```

### AFTER (App Router + Context)
```
┌────────────────────────────────────────┐
│          app/layout.tsx                │
│   <GameProvider>                       │
│     ← useGameController() called once  │
│     ← State lives in provider          │
│                                        │
│     <Navigation />                     │
│     {children} ← Routes render here    │
│   </GameProvider>                      │
└────────────────────────────────────────┘
         ↓ STATE PERSISTS ACROSS PAGES

┌──────────┬──────────┬──────────┐
│ /lobby   │  /game   │  /end    │
│ page.tsx │ page.tsx │ page.tsx │
│          │          │          │
│ useGame()│ useGame()│ useGame()│
│  ↓       │  ↓       │  ↓       │
│ <Lobby/> │ <Game/>  │ <End/>   │
└──────────┴──────────┴──────────┘
     ↑ All pages access same state via context
```

---

## Deep Linking & URL State (Future Enhancement)

With App Router, you can add URL-based state:

```typescript
// app/game/page.tsx
export default function GamePage({ searchParams }: { searchParams: { session?: string } }) {
  const { state, actions } = useGame();

  useEffect(() => {
    // Hydrate from URL if available
    if (searchParams.session && !state.sessionMeta) {
      sessionClient.getSession(searchParams.session).then(snapshot => {
        actions.setGameState(snapshot.state);
        actions.setSessionMeta({ id: snapshot.id, revision: snapshot.revision, hostToken: '' });
      });
    }
  }, [searchParams.session]);

  return <GameScreen {...state} />;
}
```

**URL Pattern**: `https://app.com/game?session=abc123`

---

## Server-Side Rendering Considerations

Since `useGameController` has client-side logic (EventSource, localStorage, etc.), all pages must be client components:

```typescript
// app/game/page.tsx
'use client'; // Required!

import { useGame } from '@/contexts/GameContext';

export default function GamePage() {
  const { state, actions } = useGame();
  return <GameScreen {...state} {...actions} />;
}
```

**Why?**
- `EventSource` only works in browser
- `localStorage` for session persistence
- React hooks with complex state

**Alternative**: Create server-fetched initial state, then hydrate client context. (Future enhancement)

---

## Performance Considerations

### Current (SPA)
- ✅ No re-mounting of hook
- ✅ All state in memory
- ❌ Large bundle (all screens loaded upfront)

### After (App Router)
- ✅ Code splitting per route
- ✅ State persists via context
- ✅ Smaller initial bundle
- ⚠️ Must use context (not re-call hook)

---

## Testing Strategy

### Unit Tests (No Changes)
```typescript
// tests/hooks.useGameController.test.ts
// These tests continue to work - hook logic unchanged
```

### Integration Tests (Update)
```typescript
// tests/app.page.navigation.test.tsx
// Update mocks:
vi.mock('@/contexts/GameContext', () => ({
  useGame: () => mockGameController,
}));

// Instead of mocking useGameController directly
```

### E2E Tests (New)
```typescript
// tests/e2e.navigation.test.ts
test('state persists across page navigation', async () => {
  render(<App />); // Full app with GameProvider

  // Select role in lobby
  fireEvent.click(screen.getByText('Tech CEO'));

  // Navigate to about page
  fireEvent.click(screen.getByText('About'));
  expect(window.location.pathname).toBe('/about');

  // Navigate back to lobby
  fireEvent.click(screen.getByText('Back'));

  // Role should still be selected
  expect(screen.getByText(/Tech CEO/)).toBeTruthy();
});
```

---

## Rollout Plan

### Stage 1: Add Context (Non-Breaking)
1. Create `GameProvider`
2. Add to layout
3. Keep existing `app/page.tsx` using context
4. **Deploy** - should work identically

### Stage 2: Create Routes (Parallel)
1. Create `app/lobby/page.tsx`, etc.
2. Keep SPA version at `/` for fallback
3. Test new routes at `/lobby?new=1`
4. **Deploy** - both versions work

### Stage 3: Cutover
1. Update Navigation links to new routes
2. Add redirects from `/` based on phase
3. Remove old SPA screen switching
4. **Deploy** - migration complete

### Stage 4: Cleanup
1. Remove unused screen state logic
2. Archive old tests
3. Update documentation

---

## Conclusion

### The Big Picture

**useGameController doesn't fundamentally change** - it's still the same 600-line hook with dual-mode operation, SSE streaming, and all the game logic.

**What changes is WHERE it lives**:
- Before: Called in `app/page.tsx`
- After: Called in `GameProvider`, consumed via `useGame()` context

**Benefits**:
- ✅ State persists across navigation
- ✅ Proper URL-based routing
- ✅ Code splitting per route
- ✅ Better SEO (meta tags per page)
- ✅ Deep linking support
- ✅ Browser history works correctly

**Risks**:
- 🟡 Must ensure all pages use 'use client'
- 🟡 Context must wrap entire app
- 🟡 Tests need updating to mock context

**Effort Estimate**:
- Context setup: 1-2 hours
- Page creation: 2-3 hours
- Testing: 3-4 hours
- **Total: 1 day**

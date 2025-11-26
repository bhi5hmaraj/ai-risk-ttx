# Modular Architecture: Breaking Down useGameController

## Current State Analysis

**File**: `hooks/useGameController.ts`
**Size**: 644 lines
**State Variables**: 21
**Responsibilities**: 8+

### Current Problems 🔴

1. **God Object Anti-Pattern** - Single hook manages everything
2. **Poor Separation of Concerns** - Game logic mixed with UI state
3. **Hard to Test** - Mocking requires entire hook context
4. **Difficult to Extend** - Adding features touches monolithic hook
5. **No Code Splitting** - All logic loaded even if not needed
6. **Tight Coupling** - Changes ripple through entire codebase

### Current Responsibilities

```typescript
useGameController() {
  // 1. Game State (GameState, Players, round, phase)
  // 2. Lobby State (selectedRole, gamePath, gameSetup, customScenario)
  // 3. Session State (sessionMeta, SSE connection)
  // 4. UI State (loading, error, timer, isPaused)
  // 5. Action State (actionOptions, aiCompletionStatus)
  // 6. Modal State (isActionTreeOpen, isHistoryOpen, expandedRound)
  // 7. Game Logic (runConsequencePhase, handleConfirmActions)
  // 8. LLM Integration (callLLMAndCount, chat history)
}
```

---

## Proposed Modular Architecture 🎯

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     COMPONENT LAYER                      │
│  (Pages, Screens, UI Components)                        │
└──────────────────┬──────────────────────────────────────┘
                   │ uses hooks
┌──────────────────▼──────────────────────────────────────┐
│                    HOOK LAYER                            │
│  useGame() useSession() useGameActions() useTimer()     │
└──────────────────┬──────────────────────────────────────┘
                   │ reads/writes
┌──────────────────▼──────────────────────────────────────┐
│                   ZUSTAND STORES                         │
│  gameStore sessionStore uiStore lobbyStore actionStore  │
└──────────────────┬──────────────────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────────────────┐
│                   SERVICE LAYER                          │
│  GameService SessionService LLMService                   │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Zustand Stores (State Management)

### 1.1 Game Store (Core Game State)

**File**: `stores/gameStore.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GameState, Player, GameLogEntry } from '@/types';

interface GameStore {
  // State
  gameState: GameState;
  players: Player[];

  // Computed (selectors)
  humanPlayer: () => Player | null;
  latestLogEntry: () => GameLogEntry | null;

  // Actions
  setGameState: (state: GameState | ((prev: GameState) => GameState)) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        gameState: {
          phase: GamePhase.LOBBY,
          round: 0,
          coreMetric: { name: 'Democratic Legitimacy', description: "Public's trust", value: 100 },
          eventLog: [],
          currentEvent: null,
        },
        players: [],

        // Computed selectors
        humanPlayer: () => get().players.find(p => p.isHuman) ?? null,
        latestLogEntry: () => {
          const log = get().gameState.eventLog;
          return log.length > 0 ? log[log.length - 1] : null;
        },

        // Actions
        setGameState: (stateOrUpdater) => set((state) => ({
          gameState: typeof stateOrUpdater === 'function'
            ? stateOrUpdater(state.gameState)
            : stateOrUpdater,
        })),

        setPlayers: (playersOrUpdater) => set((state) => ({
          players: typeof playersOrUpdater === 'function'
            ? playersOrUpdater(state.players)
            : playersOrUpdater,
        })),

        updatePlayer: (playerId, updates) => set((state) => ({
          players: state.players.map(p =>
            p.id === playerId ? { ...p, ...updates } : p
          ),
        })),

        resetGame: () => set({
          gameState: {
            phase: GamePhase.LOBBY,
            round: 0,
            coreMetric: { name: 'Democratic Legitimacy', description: "Public's trust", value: 100 },
            eventLog: [],
            currentEvent: null,
          },
          players: [],
        }),
      }),
      { name: 'game-store' }
    )
  )
);
```

---

### 1.2 Session Store (Backend State)

**File**: `stores/sessionStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SessionStore {
  // State
  sessionMeta: { id: string; revision: number; hostToken: string } | null;
  isBackendMode: boolean;
  sseConnection: EventSource | null;

  // Actions
  setSessionMeta: (meta: SessionStore['sessionMeta']) => void;
  setSSEConnection: (connection: EventSource | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  devtools((set) => ({
    sessionMeta: null,
    isBackendMode: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_STATE === '1',
    sseConnection: null,

    setSessionMeta: (meta) => set({ sessionMeta: meta }),
    setSSEConnection: (connection) => set({ sseConnection: connection }),
    clearSession: () => set({ sessionMeta: null, sseConnection: null }),
  }))
);
```

---

### 1.3 UI Store (Loading, Error, Modals)

**File**: `stores/uiStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIStore {
  // Loading state
  isLoading: boolean;
  loadingMessage: string;

  // Error state
  error: string | null;

  // Modal flags
  isActionTreeOpen: boolean;
  isHistoryOpen: boolean;
  expandedRound: number | null;

  // Timer state
  timer: number;
  isPaused: boolean;

  // Actions
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setActionTreeOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setExpandedRound: (round: number | null) => void;
  setTimer: (seconds: number) => void;
  togglePause: () => void;
  resetUI: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools((set) => ({
    isLoading: false,
    loadingMessage: '',
    error: null,
    isActionTreeOpen: false,
    isHistoryOpen: true,
    expandedRound: null,
    timer: 300,
    isPaused: false,

    setLoading: (isLoading, message = '') =>
      set({ isLoading, loadingMessage: message }),

    setError: (error) => set({ error }),

    setActionTreeOpen: (open) => set({ isActionTreeOpen: open }),

    setHistoryOpen: (open) => set({
      isHistoryOpen: open,
      expandedRound: open ? null : undefined, // Reset expanded round when closing
    }),

    setExpandedRound: (round) => set({ expandedRound: round }),

    setTimer: (seconds) => set({ timer: seconds }),

    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

    resetUI: () => set({
      isLoading: false,
      loadingMessage: '',
      error: null,
      isActionTreeOpen: false,
      isHistoryOpen: false,
      expandedRound: null,
      timer: 300,
      isPaused: false,
    }),
  }))
);
```

---

### 1.4 Lobby Store (Pre-Game Setup)

**File**: `stores/lobbyStore.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GameSetup } from '@/types';

interface LobbyStore {
  // State
  selectedRoleName: string | null;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  gameSetup: GameSetup | null;
  customScenario: string;

  // Actions
  setSelectedRoleName: (name: string | null) => void;
  setGamePath: (path: LobbyStore['gamePath']) => void;
  setGameSetup: (setup: GameSetup | null) => void;
  setCustomScenario: (scenario: string) => void;
  resetLobby: () => void;
}

export const useLobbyStore = create<LobbyStore>()(
  devtools(
    persist(
      (set) => ({
        selectedRoleName: null,
        gamePath: null,
        gameSetup: null,
        customScenario: '',

        setSelectedRoleName: (name) => set({ selectedRoleName: name }),
        setGamePath: (path) => set({ gamePath: path }),
        setGameSetup: (setup) => set({ gameSetup: setup }),
        setCustomScenario: (scenario) => set({ customScenario: scenario }),

        resetLobby: () => set({
          selectedRoleName: null,
          gamePath: null,
          gameSetup: null,
          customScenario: '',
        }),
      }),
      { name: 'lobby-store' }
    )
  )
);
```

---

### 1.5 Action Store (Round Actions)

**File**: `stores/actionStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ActionOption } from '@/types';

interface ActionStore {
  // State
  actionOptions: ActionOption[];
  aiCompletionStatus: Record<string, boolean>;
  llmCallsThisRound: number;
  chatHistory: any[] | null;

  // Actions
  setActionOptions: (options: ActionOption[]) => void;
  setAICompletionStatus: (status: Record<string, boolean>) => void;
  updateAICompletion: (roleName: string, completed: boolean) => void;
  incrementLLMCalls: () => void;
  resetLLMCalls: () => void;
  setChatHistory: (history: any[] | null) => void;
  resetActions: () => void;
}

export const useActionStore = create<ActionStore>()(
  devtools((set) => ({
    actionOptions: [],
    aiCompletionStatus: {},
    llmCallsThisRound: 0,
    chatHistory: null,

    setActionOptions: (options) => set({ actionOptions: options }),

    setAICompletionStatus: (status) => set({ aiCompletionStatus: status }),

    updateAICompletion: (roleName, completed) => set((state) => ({
      aiCompletionStatus: { ...state.aiCompletionStatus, [roleName]: completed },
    })),

    incrementLLMCalls: () => set((state) => ({
      llmCallsThisRound: state.llmCallsThisRound + 1
    })),

    resetLLMCalls: () => set({ llmCallsThisRound: 0 }),

    setChatHistory: (history) => set({ chatHistory: history }),

    resetActions: () => set({
      actionOptions: [],
      aiCompletionStatus: {},
      llmCallsThisRound: 0,
      chatHistory: null,
    }),
  }))
);
```

---

## Layer 2: Service Layer (Business Logic)

### 2.1 Game Service

**File**: `services/GameService.ts`

```typescript
import { applyConsequences } from '@/lib/gameLogic';
import { selectInitialPlayers } from '@/lib/gameSetup';
import type { GameState, Player, GameSetup, ActionOption } from '@/types';
import * as llmApiClient from './llmApiClient';

export class GameService {
  /**
   * Initialize players for a new game
   */
  static initializePlayers(
    selectedRoleName: string,
    gamePath: 'classic' | 'custom' | 'ai_safety',
    gameSetup: GameSetup | null
  ): { players: Player[]; coreMetric: any } {
    return selectInitialPlayers(selectedRoleName, gamePath, gameSetup, null, null);
  }

  /**
   * Run the consequence phase (AI turns + consequence generation)
   */
  static async runConsequencePhase(params: {
    gameState: GameState;
    players: Player[];
    actionOptions: ActionOption[];
    chatHistory: any[] | null;
    gameSetup: GameSetup;
    onAIComplete?: (roleName: string) => void;
    onLLMCall?: () => void;
  }): Promise<{
    gameState: GameState;
    players: Player[];
    chatHistory: any[];
  }> {
    const { gameState, players, actionOptions, chatHistory, gameSetup, onAIComplete, onLLMCall } = params;

    let llmCalls = 0;
    const trackCall = () => {
      llmCalls++;
      onLLMCall?.();
    };

    // Generate AI turns in parallel
    const aiPlayers = players.filter(p => !p.isHuman);
    const prevActions = gameState.eventLog.find(e => e.round === gameState.round - 1)?.playerActions || null;

    const aiTurnPromises = aiPlayers.map(async (player) => {
      const result = await llmApiClient.generateAITurn(player, gameState, prevActions);
      trackCall();
      onAIComplete?.(player.role.name);
      return result;
    });

    // Generate counterfactual in parallel
    const counterfactualPromise = llmApiClient.generateCounterfactualConsequences(gameState);

    // Wait for all AI turns
    const aiTurnResults = await Promise.all(aiTurnPromises);
    const counterfactual = await counterfactualPromise;
    trackCall();

    if (!counterfactual) {
      throw new Error('Failed to generate counterfactual');
    }

    // Update players with AI actions
    const playersWithActions = players.map((p) => {
      if (p.isHuman) return p;
      const aiIndex = aiPlayers.findIndex(ai => ai.id === p.id);
      const turn = aiTurnResults[aiIndex];
      return turn ? { ...p, actions: turn.chosenActions, hasSubmittedActions: true } : p;
    });

    // Generate consequences
    const consResult = await llmApiClient.generateConsequencesChat(
      gameState,
      playersWithActions,
      counterfactual.publicScoreUpdate,
      chatHistory || [],
      gameSetup
    );
    trackCall();

    if (!consResult) {
      throw new Error('Failed to generate consequences');
    }

    // Apply consequences
    const { gameState: nextState, players: nextPlayers } = applyConsequences(
      gameState,
      consResult.consequences,
      playersWithActions,
      aiPlayers,
      aiTurnResults as any,
      actionOptions,
      llmCalls
    );

    return {
      gameState: nextState,
      players: nextPlayers,
      chatHistory: consResult.chatHistory,
    };
  }

  /**
   * Generate action options for human player
   */
  static async generateActionOptions(params: {
    player: Player;
    gameState: GameState;
    previousRoundActions: any[] | null;
  }): Promise<{ options: ActionOption[] }> {
    const result = await llmApiClient.generateActionOptions(
      params.player,
      params.gameState,
      params.previousRoundActions
    );
    return result || { options: [] };
  }
}
```

---

### 2.2 Session Service (Backend Integration)

**File**: `services/SessionService.ts`

```typescript
import * as sessionClient from './sessionClient';
import type { GameState, Player, ActionOption, GameSetup } from '@/types';

export class SessionService {
  /**
   * Create a new session
   */
  static async create(params: {
    mode: 'classic' | 'ai_safety' | 'custom';
    setup?: GameSetup;
    maxRounds?: number;
    aiPlayers?: number;
  }) {
    return await sessionClient.createSession(params);
  }

  /**
   * Get session snapshot
   */
  static async get(id: string, sinceRevision?: number) {
    return await sessionClient.getSession(id, sinceRevision);
  }

  /**
   * Submit actions and advance round
   */
  static async submitAndAdvance(params: {
    sessionId: string;
    revision: number;
    hostToken: string;
    playerId: string;
    playerRoleName: string;
    actions: ActionOption[];
    availableOptions: ActionOption[];
  }) {
    // Submit actions
    const submitted = await sessionClient.submitActions(
      params.sessionId,
      params.playerId,
      params.actions,
      params.revision
    );

    // Advance round
    const advanced = await sessionClient.advance(
      params.sessionId,
      submitted.revision,
      params.hostToken,
      {
        humanRoleName: params.playerRoleName,
        humanPlayerId: params.playerId,
        humanActions: params.actions,
        humanAvailableOptions: params.availableOptions,
      }
    );

    return advanced;
  }

  /**
   * Connect to SSE stream
   */
  static createEventSource(sessionId: string): EventSource {
    return new EventSource(`/api/session/${sessionId}/stream`);
  }

  /**
   * Get action options from backend
   */
  static async getActionOptions(params: {
    sessionId: string;
    playerId: string;
    playerRoleName: string;
  }) {
    return await sessionClient.getActionOptions(
      params.sessionId,
      params.playerId,
      params.playerRoleName
    );
  }
}
```

---

## Layer 3: Specialized Hooks (Composition)

### 3.1 useGame (Core Game Hook)

**File**: `hooks/useGame.ts`

```typescript
'use client';

import { useGameStore } from '@/stores/gameStore';
import { shallow } from 'zustand/shallow';

/**
 * Hook for accessing core game state
 */
export function useGame() {
  const { gameState, players, humanPlayer, latestLogEntry, setGameState, setPlayers, updatePlayer, resetGame } =
    useGameStore(
      (state) => ({
        gameState: state.gameState,
        players: state.players,
        humanPlayer: state.humanPlayer(),
        latestLogEntry: state.latestLogEntry(),
        setGameState: state.setGameState,
        setPlayers: state.setPlayers,
        updatePlayer: state.updatePlayer,
        resetGame: state.resetGame,
      }),
      shallow
    );

  return {
    gameState,
    players,
    humanPlayer,
    latestLogEntry,
    setGameState,
    setPlayers,
    updatePlayer,
    resetGame,
  };
}
```

---

### 3.2 useSession (Backend Connection)

**File**: `hooks/useSession.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useGameStore } from '@/stores/gameStore';
import { SessionService } from '@/services/SessionService';
import { shallow } from 'zustand/shallow';

/**
 * Hook for session backend integration (SSE streaming, etc.)
 */
export function useSession() {
  const { sessionMeta, isBackendMode, sseConnection, setSessionMeta, setSSEConnection, clearSession } =
    useSessionStore(shallow);

  const { setGameState, setPlayers } = useGameStore(
    (state) => ({ setGameState: state.setGameState, setPlayers: state.setPlayers }),
    shallow
  );

  // SSE Connection Effect
  useEffect(() => {
    if (!isBackendMode || !sessionMeta?.id) {
      if (sseConnection) {
        sseConnection.close();
        setSSEConnection(null);
      }
      return;
    }

    // Close existing connection
    if (sseConnection) {
      sseConnection.close();
    }

    // Create new SSE connection
    const source = SessionService.createEventSource(sessionMeta.id);
    setSSEConnection(source);

    // Handle session events
    source.addEventListener('session', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const snapshot = payload?.snapshot;
        if (!snapshot) return;

        // Update revision
        setSessionMeta({ ...sessionMeta, revision: snapshot.revision });

        // Update game state
        if (snapshot.state) {
          setGameState(snapshot.state);
        }

        // Update players submission status
        const submitted = snapshot.submitted ?? {};
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            hasSubmittedActions: submitted[p.id] ?? p.hasSubmittedActions,
          }))
        );
      } catch (error) {
        console.error('[useSession] Failed to parse SSE event:', error);
      }
    });

    // Cleanup on unmount
    return () => {
      source.close();
      setSSEConnection(null);
    };
  }, [isBackendMode, sessionMeta?.id]);

  return {
    sessionMeta,
    isBackendMode,
    setSessionMeta,
    clearSession,
  };
}
```

---

### 3.3 useGameActions (Game Logic)

**File**: `hooks/useGameActions.ts`

```typescript
'use client';

import { useCallback } from 'react';
import { useGame } from './useGame';
import { useSession } from './useSession';
import { useLobby } from './useLobby';
import { useUI } from './useUI';
import { useActions } from './useActions';
import { GameService } from '@/services/GameService';
import { SessionService } from '@/services/SessionService';
import { GamePhase } from '@/types';
import type { ActionOption } from '@/types';

/**
 * Hook for game actions (start game, confirm actions, etc.)
 */
export function useGameActions() {
  const { gameState, players, humanPlayer, setGameState, setPlayers } = useGame();
  const { sessionMeta, isBackendMode, setSessionMeta } = useSession();
  const { selectedRoleName, gamePath, gameSetup } = useLobby();
  const { setLoading, setError } = useUI();
  const { actionOptions, chatHistory, setActionOptions, setChatHistory, resetActions, updateAICompletion, incrementLLMCalls } = useActions();

  /**
   * Start the game
   */
  const handleStartGame = useCallback(async () => {
    if (!selectedRoleName) return;

    try {
      setLoading(true, 'Initializing game...');

      // Initialize players
      const { players: initialPlayers, coreMetric } = GameService.initializePlayers(
        selectedRoleName,
        gamePath || 'classic',
        gameSetup
      );

      setPlayers(initialPlayers);
      setGameState((prev) => ({
        ...prev,
        phase: GamePhase.STARTING,
        coreMetric,
        eventLog: [],
        round: 0,
        currentEvent: null,
      }));

      // Create backend session if enabled
      if (isBackendMode && !sessionMeta) {
        const created = await SessionService.create({
          mode: gamePath as any || 'classic',
          setup: gamePath === 'custom' ? gameSetup || undefined : undefined,
        });
        setSessionMeta({ id: created.id, revision: created.revision, hostToken: created.hostToken });
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleName, gamePath, gameSetup, isBackendMode, sessionMeta]);

  /**
   * Confirm player actions
   */
  const handleConfirmActions = useCallback(async (actions: ActionOption[]) => {
    if (!humanPlayer) return;

    try {
      setLoading(true, 'Submitting actions...');

      // Backend mode: submit via session API
      if (isBackendMode && sessionMeta) {
        const result = await SessionService.submitAndAdvance({
          sessionId: sessionMeta.id,
          revision: sessionMeta.revision,
          hostToken: sessionMeta.hostToken,
          playerId: humanPlayer.id || 'human',
          playerRoleName: humanPlayer.role.name,
          actions,
          availableOptions: actionOptions,
        });

        setSessionMeta({ ...sessionMeta, revision: result.revision });
        setGameState(result.state as any);
        resetActions();
        return;
      }

      // Client mode: run consequence phase locally
      const updatedPlayer = { ...humanPlayer, actions, hasSubmittedActions: true };
      const updatedPlayers = players.map(p => p.isHuman ? updatedPlayer : p);
      setPlayers(updatedPlayers);

      const result = await GameService.runConsequencePhase({
        gameState,
        players: updatedPlayers,
        actionOptions,
        chatHistory,
        gameSetup: gameSetup!,
        onAIComplete: (roleName) => updateAICompletion(roleName, true),
        onLLMCall: () => incrementLLMCalls(),
      });

      setGameState(result.gameState);
      setPlayers(result.players);
      setChatHistory(result.chatHistory);
      resetActions();
    } catch (error: any) {
      setError(error?.message || 'Failed to submit actions');
    } finally {
      setLoading(false);
    }
  }, [humanPlayer, players, gameState, actionOptions, chatHistory, gameSetup, isBackendMode, sessionMeta]);

  return {
    handleStartGame,
    handleConfirmActions,
  };
}
```

---

### 3.4 useLobby / useUI / useActions

**Files**: `hooks/useLobby.ts`, `hooks/useUI.ts`, `hooks/useActions.ts`

```typescript
// hooks/useLobby.ts
'use client';
import { useLobbyStore } from '@/stores/lobbyStore';
import { shallow } from 'zustand/shallow';

export function useLobby() {
  return useLobbyStore(shallow);
}

// hooks/useUI.ts
'use client';
import { useUIStore } from '@/stores/uiStore';
import { shallow } from 'zustand/shallow';

export function useUI() {
  return useUIStore(shallow);
}

// hooks/useActions.ts
'use client';
import { useActionStore } from '@/stores/actionStore';
import { shallow } from 'zustand/shallow';

export function useActions() {
  return useActionStore(shallow);
}
```

---

### 3.5 useTimer (Timer Management)

**File**: `hooks/useTimer.ts`

```typescript
'use client';

import { useEffect, useCallback } from 'react';
import { useUI } from './useUI';
import { useGame } from './useGame';
import { useGameActions } from './useGameActions';
import { GamePhase } from '@/types';
import { GAME_CONFIG } from '@/constants';

/**
 * Hook for managing game timer
 */
export function useTimer() {
  const { timer, isPaused, setTimer, togglePause } = useUI();
  const { gameState, humanPlayer } = useGame();
  const { handleConfirmActions } = useGameActions();

  // Timer countdown effect
  useEffect(() => {
    if (
      timer > 0 &&
      gameState.phase === GamePhase.ACTION &&
      !isPaused &&
      !humanPlayer?.hasSubmittedActions
    ) {
      const interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);

      return () => clearInterval(interval);
    }

    // Auto-submit when timer expires
    if (timer <= 0 && gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      handleConfirmActions([]);
    }
  }, [timer, gameState.phase, isPaused, humanPlayer, handleConfirmActions]);

  // Reset timer on new round
  useEffect(() => {
    if (gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
    }
  }, [gameState.phase, gameState.round]);

  return {
    timer,
    isPaused,
    togglePause,
  };
}
```

---

## Layer 4: Component Usage

### 4.1 Page Component Example

**File**: `app/game/page.tsx`

```typescript
'use client';

import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useGameActions } from '@/hooks/useGameActions';
import { useTimer } from '@/hooks/useTimer';
import { GameScreen } from '@/screens/GameScreen';

export default function GamePage() {
  const { gameState, players, humanPlayer } = useGame();
  const { isLoading, loadingMessage, error } = useUI();
  const { handleConfirmActions } = useGameActions();
  const { timer, isPaused, togglePause } = useTimer();

  return (
    <GameScreen
      gameState={gameState}
      players={players}
      humanPlayer={humanPlayer}
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      error={error}
      timer={timer}
      isPaused={isPaused}
      onConfirmActions={handleConfirmActions}
      onTogglePause={togglePause}
    />
  );
}
```

---

## Migration Strategy

### Phase 1: Add Zustand Stores (Parallel)
1. Create all 5 store files
2. Add devtools and persist middleware
3. Write unit tests for stores
4. **Deploy** - No breaking changes yet

### Phase 2: Add Service Layer (Parallel)
1. Extract `GameService` logic from hook
2. Extract `SessionService` logic
3. Write unit tests for services
4. **Deploy** - Still using old hook

### Phase 3: Create New Hooks (Parallel)
1. Create specialized hooks (useGame, useSession, etc.)
2. Keep old `useGameController` as wrapper
3. Test new hooks in isolation
4. **Deploy** - Both implementations available

### Phase 4: Migrate Components
1. Update one page at a time
2. Replace `useGameController()` with new hooks
3. Run regression tests
4. **Deploy** - Gradual migration

### Phase 5: Cleanup
1. Remove old `useGameController`
2. Remove unused code
3. Update documentation

---

## Benefits of Modular Architecture

### ✅ Separation of Concerns
- Game logic separated from UI state
- Backend integration isolated in SessionService
- Business logic in service layer

### ✅ Testability
```typescript
// Test stores independently
test('gameStore.resetGame clears state', () => {
  const store = useGameStore.getState();
  store.setPlayers([mockPlayer]);
  store.resetGame();
  expect(store.players).toEqual([]);
});

// Test services with mocked dependencies
test('GameService.runConsequencePhase calls LLM', async () => {
  vi.mock('@/services/llmApiClient');
  const result = await GameService.runConsequencePhase({...});
  expect(llmApiClient.generateAITurn).toHaveBeenCalled();
});
```

### ✅ Performance
- Zustand only re-renders components that use changed state
- Selective subscriptions with `shallow`
- Computed selectors prevent unnecessary calculations

### ✅ Code Splitting
```typescript
// Only load timer logic in game screen
const GamePage = lazy(() => import('./GamePage'));

// Lobby doesn't need timer or action logic
const LobbyPage = lazy(() => import('./LobbyPage'));
```

### ✅ Developer Experience
- Zustand devtools for time-travel debugging
- Persist middleware for state recovery
- Clear file organization by concern

### ✅ Extensibility
- Add new stores without touching existing code
- Add new services without modifying hooks
- Compose hooks for different use cases

---

## Comparison: Before vs After

### Before (Monolithic Hook)
```typescript
// 644 lines, 21 state variables
const controller = useGameController();
// Returns everything mixed together
```

**Problems**:
- Hard to test (need to mock entire context)
- No code splitting
- Changes ripple everywhere
- Difficult to understand what depends on what

### After (Modular Architecture)
```typescript
// Each hook focused on one concern
const { gameState, players } = useGame();              // Game state
const { sessionMeta } = useSession();                   // Backend connection
const { isLoading, setError } = useUI();                // UI state
const { handleConfirmActions } = useGameActions();      // Game actions
const { timer, togglePause } = useTimer();              // Timer logic
```

**Benefits**:
- Easy to test each piece independently
- Code splitting by feature
- Changes isolated to specific stores/hooks
- Clear dependencies

---

## File Structure

```
src/
├── stores/
│   ├── gameStore.ts          (Game state)
│   ├── sessionStore.ts       (Backend connection)
│   ├── uiStore.ts            (UI state)
│   ├── lobbyStore.ts         (Pre-game setup)
│   └── actionStore.ts        (Round actions)
│
├── services/
│   ├── GameService.ts        (Game logic)
│   ├── SessionService.ts     (Backend integration)
│   └── llmApiClient.ts       (LLM API calls)
│
├── hooks/
│   ├── useGame.ts            (Game state access)
│   ├── useSession.ts         (Session management)
│   ├── useGameActions.ts     (Game actions)
│   ├── useTimer.ts           (Timer management)
│   ├── useLobby.ts           (Lobby state)
│   ├── useUI.ts              (UI state)
│   └── useActions.ts         (Action state)
│
└── app/
    ├── layout.tsx            (No provider needed! Zustand is global)
    ├── page.tsx              (Home)
    ├── lobby/page.tsx        (Uses useLobby, useGameActions)
    ├── game/page.tsx         (Uses useGame, useTimer, useGameActions)
    └── end/page.tsx          (Uses useGame, useUI)
```

---

## Summary

### Current State
- **644-line monolithic hook**
- 21 state variables
- 8+ responsibilities mixed together
- Hard to test, extend, and understand

### Proposed State
- **5 focused Zustand stores** (~100 lines each)
- **2 service classes** for business logic
- **7 specialized hooks** for composition
- Clean separation of concerns
- Easy to test, extend, and understand

### Effort Estimate
- Create stores: 1 day
- Extract services: 1 day
- Create new hooks: 1 day
- Migrate components: 2 days
- Testing & cleanup: 1 day
- **Total: 1 week**

### Key Advantages
1. ✅ **No Provider Needed** - Zustand stores are global singletons
2. ✅ **Selective Re-renders** - Only components using changed state re-render
3. ✅ **Devtools** - Time-travel debugging with Zustand devtools
4. ✅ **Persist** - Auto-save state to localStorage
5. ✅ **Testability** - Each piece can be tested in isolation
6. ✅ **Performance** - Optimized subscriptions, no Context re-render issues

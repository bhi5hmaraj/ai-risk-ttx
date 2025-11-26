# useGameController Bloat Analysis

**Size**: 539 lines (MASSIVE RED FLAG)

## 🔴 Critical Issues

### 1. DEAD CODE (Should Delete Immediately)

```typescript
// Lines 166-173: Deprecated stubs - DELETE
const runConsequencePhase = useCallback(() => {
  console.warn('[useGameController] runConsequencePhase is deprecated...');
}, []);

const handleConfirmActions = useCallback(() => {
  console.warn('[useGameController] handleConfirmActions is deprecated...');
}, []);
```

### 2. DUPLICATE LOGIC (Exists in Both useGameController AND useGameActions)

| Responsibility | useGameController | useGameActions | Problem |
|---|---|---|---|
| Start game | ✅ lines 177-231 | ✅ lines 62-164 | **DUPLICATE** |
| Confirm actions | ⚠️ deprecated stub | ✅ lines 27-60 | **Partially migrated** |
| Loading state | ✅ lines 52-53 | ✅ lines 17 (via useUI) | **DUPLICATE** |
| Session creation | ✅ lines 203-218 | ✅ lines 84-154 | **DUPLICATE** |
| Error handling | ✅ line 54 | ✅ line 17 (via useUI) | **DUPLICATE** |

### 3. MASSIVE SSE HANDLING (Lines 380-485 = 105 LINES!)

**Problem**: SSE subscription lives in useGameController but should be in SessionMonitor component.

```typescript
// Lines 380-485: MOVE TO SessionMonitor component
useEffect(() => {
  // ... 105 lines of SSE handling ...
  const source = new EventSource(`/api/session/${sessionMeta.id}/stream`);
  // complex merge logic, error handling, etc.
}, [sessionMeta?.id]);
```

**Issues**:
- SessionMonitor component (components/SessionMonitor.tsx) exists but isn't used
- Duplicate SSE subscription risk
- Complex merge logic (lines 425-446) buried in a hook
- Should be a presentation component, not embedded in controller

### 4. SCENARIO INITIALIZATION MESS (Lines 233-322 = 89 LINES!)

**Problem**: Classic vs preset scenario logic embedded in controller.

```typescript
// Lines 233-264: Classic scenario init
const initializeClassicScenario = async () => { ... }

// Lines 266-307: Preset scenario init
const initializePresetScenario = (setup: GameSetup) => { ... }

// Lines 309-322: Branching logic
useEffect(() => {
  if (gamePath === 'classic' || !gamePath) {
    initializeClassicScenario();
  } else {
    initializePresetScenario(setup);
  }
}, [gameState.phase]);
```

**Should be**: Extracted to `hooks/useScenarioInitializer.ts` or handled by backend.

### 5. CLIENT-SIDE CHAT MODE LOGIC (Should Be Server-Only)

```typescript
// Line 82: chatHistoryRef for client chat mode
const chatHistoryRef = useRef<any[] | null>(null);

// Lines 243-245: Client-side chat call
const initChat = await callLLMAndCount(() => generateInitialScenarioChat(setup, players));
if (initChat) chatHistoryRef.current = initChat.chatHistory;
```

**Problem**: Backend now handles all LLM calls. This is dead logic from pre-migration.

### 6. UI STATE MIXED WITH GAME STATE

**Should be in UI stores or separate hooks**:

```typescript
// Lines 62-64: Action tree UI state
const [isActionTreeOpen, setIsActionTreeOpen] = useState(false);
const [isHistoryOpen, setIsHistoryOpen] = useState(true);
const [expandedRound, setExpandedRound] = useState<number | null>(null);

// Lines 487-494: UI handlers
const handleOpenActionTree = useCallback(() => {
  setIsActionTreeOpen(true);
}, []);
```

**Should be**: In `stores/uiStore.ts` or a separate `hooks/useHistoryPanel.ts`.

### 7. TIMER MANAGEMENT (Lines 347-355)

```typescript
useEffect(() => {
  let interval: ReturnType<typeof setInterval> | undefined;
  if (timer > 0 && gameState.phase === GamePhase.ACTION && !isPaused && !humanPlayer?.hasSubmittedActions) {
    interval = setInterval(() => setTimer((t) => t - 1), 1000);
  } else if (timer <= 0 && ...) {
    handleConfirmActions([]);
  }
  return () => clearInterval(interval);
}, [gameState.phase, handleConfirmActions, humanPlayer, isPaused, timer]);
```

**Should be**: Extracted to `hooks/useActionTimer.ts`.

---

## ✅ What SHOULD Stay in useGameController

```typescript
export const useGameController = () => {
  // 1. Read from stores (orchestration only)
  const gameState = useGameStore((s) => s.gameState);
  const players = useGameStore((s) => s.players);

  // 2. Basic lobby state (scenario selection)
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [gamePath, setGamePath] = useState<'classic' | 'custom' | 'ai_safety' | null>(null);

  // 3. Coordinate modular hooks
  const { handleStartGame, handleConfirmActions } = useGameActions();
  const { loadHumanOptions } = useRoundOptions();

  // 4. Derived values
  const humanPlayer = useMemo(() => players.find(p => p.isHuman), [players]);

  // 5. Reset orchestration
  const resetState = useCallback(() => {
    resetGameStore();
    clearSessionStore();
    resetUI();
  }, []);

  return { state, actions, derived };
};
```

**Target size**: ~100-150 lines MAX

---

## 🔧 Refactoring Plan

### Step 1: Delete Dead Code ✅ (Immediate - 5 min)
- Lines 166-173: Remove deprecated stubs
- Lines 81-82: Remove `chatHistoryRef`
- Lines 24-26: Remove old LLM client imports
- Lines 113-124: Remove `callLLMAndCount` (server handles this)

### Step 2: Extract SSE to SessionMonitor Component (High Impact - 30 min)
```
hooks/useGameController.ts (lines 380-485)
  ↓
components/SessionMonitor.tsx (already exists but unused!)
```

- Move entire SSE effect to SessionMonitor
- Mount SessionMonitor in layout
- Remove from useGameController

### Step 3: Extract Timer to useActionTimer Hook (Low Impact - 15 min)
```
hooks/useGameController.ts (lines 55-56, 347-355)
  ↓
hooks/useActionTimer.ts (NEW)
```

### Step 4: Extract UI State to Store or Hooks (Medium Impact - 20 min)
```
hooks/useGameController.ts (lines 62-64, 487-494)
  ↓
stores/uiStore.ts OR hooks/useHistoryPanel.ts
```

### Step 5: Extract Scenario Initialization (Medium Impact - 30 min)
```
hooks/useGameController.ts (lines 233-322)
  ↓
hooks/useScenarioInitializer.ts (NEW) OR delete if backend handles
```

### Step 6: Consolidate Start Logic (High Impact - 45 min)
- Choose ONE place: useGameActions.handleStartGame
- Make useGameController a thin wrapper that delegates
- Remove duplicate session creation logic

---

## 📊 Impact Estimate

| Refactor | Lines Removed | Lines Added | Net Change | Priority |
|---|---|---|---|---|
| Delete dead code | -50 | 0 | -50 | **P0** |
| Extract SSE | -105 | +5 (import) | -100 | **P0** |
| Extract timer | -15 | +2 | -13 | P1 |
| Extract UI state | -20 | +2 | -18 | P1 |
| Extract init | -89 | +5 | -84 | P2 |
| Consolidate start | -50 | +10 | -40 | P0 |
| **TOTAL** | **-329** | **+24** | **-305** | |

**Result**: 539 lines → ~230 lines → ~150 lines after cleanup

---

## 🚨 Why This Happened

1. **Incomplete Migration**: Started moving to useGameActions but left old code in place
2. **No Clear Boundaries**: SSE, UI state, game logic all mixed
3. **Fear of Breaking**: Deprecated stubs instead of deleting
4. **"Just One More Thing"**: Each feature added to the monolith instead of separate hook

---

## 📝 Next Steps

1. **Immediate (today)**: Delete dead code, extract SSE to SessionMonitor
2. **This week**: Extract timer and UI state
3. **Next sprint**: Consolidate start logic, remove duplication

---

## 🔍 Command to Find More Issues

```bash
# Find all useState in useGameController
grep -n "useState\|useRef\|useEffect" hooks/useGameController.ts

# Count concerns
grep -c "useEffect" hooks/useGameController.ts  # Should be 0-2 max, actually: 7!
```

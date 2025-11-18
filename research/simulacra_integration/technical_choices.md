# Technical Implementation Options

**Choosing the right tools and approach**

---

## Core Decision: Client vs Server

### Option A: Pure TypeScript (Client-Side)

**All levels run in the browser**

**Pros**:
- No backend changes needed
- Fast (no network latency)
- Works offline
- Simple deployment

**Cons**:
- Limited to simpler algorithms
- Can't use external tools (PRISM, Storm)
- Browser performance constraints
- Harder to upgrade algorithms

**Best for**: Levels 1-3

**Implementation**:
```typescript
// Everything in src/services/
formalModel.ts         // Levels 1-2
temporalLogic.ts       // Level 3
mdpAnalysis.ts         // Level 4 (if feasible)
```

---

### Option B: Python Backend (Server-Side)

**Formal analysis runs on server**

**Pros**:
- Use powerful tools (PRISM, NetworkX, NumPy)
- Easy to upgrade algorithms
- Can handle larger state spaces
- Leverage existing research code

**Cons**:
- Requires FastAPI service
- Network latency (1-3s)
- More complex deployment
- Server costs

**Best for**: Level 4 (probabilistic analysis)

**Architecture**:
```
React Frontend
    ↓ HTTP
FastAPI Backend (Python)
    ↓
PRISM / Storm (model checker)
```

**Implementation**:
```python
# api/formal_analysis.py
@router.post("/analyze")
async def analyze_risk(request: AnalysisRequest):
    mdp = build_mdp(request.current_state, request.trace)
    p_catastrophe = prism.check_property(mdp, 'P=? [ F "catastrophe" ]')
    return {"p_catastrophe": p_catastrophe, ...}
```

---

### Option C: Hybrid (Recommended)

**Client-side for Levels 1-3, optional server for Level 4**

**Flow**:
```
Levels 1-2: Always run (TypeScript, instant)
Level 3: Run basic checks (TypeScript)
Level 4: On-demand (click "Analyze" → POST to Python backend)
```

**Pros**:
- Best of both worlds
- Core functionality fast and offline
- Power features available when needed
- Incremental adoption

**Cons**:
- More code to maintain
- Need both TypeScript and Python expertise

---

## Libraries & Tools

### TypeScript Libraries

**State machines**:
- `xstate` - FSM library (good for modes)
- `robot3` - Lightweight FSM

**Graphs**:
- `graphology` - Graph manipulation
- `cytoscape.js` - Already used in Simulacra

**Math**:
- `mathjs` - Numerical computation
- `numeric.js` - Matrix operations

**Recommendation**: Keep it simple, use plain TypeScript for Levels 1-3

---

### Python Libraries

**Model checking**:
- `PRISM` - Probabilistic model checker (gold standard)
- `Storm` - Modern alternative to PRISM
- `stormpy` - Python bindings for Storm

**MDP**:
- `mdptoolbox` - MDP algorithms in Python
- `pymdp` - Lightweight MDP solver
- `NetworkX` - Graph algorithms

**API**:
- `FastAPI` - Modern Python web framework
- `Pydantic` - Data validation

**Recommendation**: Start with `pymdp` or `mdptoolbox`, upgrade to Storm if needed

---

## Data Flow

### Level 1-3 (Client-Side)

```typescript
// In useGameController.ts
function handleActionsSubmit(actions: PlayerAction[]) {
  // 1. Update formal state (sync, < 50ms)
  const newFormalState = formalModel.updateState(formalState, actions);
  const newMode = formalModel.detectTransition(newFormalState);
  const propertyResults = temporalLogic.checkProperties(trace, newFormalState);

  // 2. Generate LLM (async, 2-5s)
  const consequences = await geminiService.generateConsequences(...);

  // 3. Update UI
  setGameState({ ...gameState, formalState: newFormalState });
}
```

**Total latency**: ~2-5s (dominated by LLM, formal is instant)

---

### Level 4 (Hybrid)

```typescript
// When player clicks "Analyze Risk"
async function handleAnalyzeRisk() {
  setLoading(true);

  // Call backend
  const analysis = await formalAnalysisService.analyze({
    current_state: formalState,
    trace: eventLog
  });

  // Display results in modal
  setRiskAnalysis(analysis);
  setShowModal(true);
  setLoading(false);
}
```

**Latency**: 1-3s (acceptable for on-demand feature)

---

## Performance Targets

| Operation | Target | Acceptable | Critical Path |
|-----------|--------|------------|---------------|
| Update variables (L1) | < 10ms | < 50ms | Yes |
| Detect mode (L2) | < 50ms | < 100ms | Yes |
| Check properties (L3) | < 100ms | < 500ms | Yes |
| MDP analysis (L4) | < 2s | < 5s | No (on-demand) |

**Budget**: Total formal processing should add < 200ms to round latency

---

## Storage

### Client-Side State

```typescript
// useGameController.ts
const [gameState, setGameState] = useState<GameState>({
  // ... existing fields
  formalState: FormalState,
  propertyResults: PropertyCheckResult[]
});
```

**Size**: ~5KB per round × 15 rounds = ~75KB (negligible)

---

### Event Log

```typescript
interface GameLogEntry {
  // ... existing fields
  formalState: FormalState,
  modeTransition?: {
    from: GovernanceMode,
    to: GovernanceMode,
    trigger: string
  },
  propertyViolations: Violation[]
}
```

**Size**: ~10KB per game (very manageable)

---

### Persistence

**Option 1**: LocalStorage (simple)
```typescript
localStorage.setItem('gameTrace', JSON.stringify(eventLog));
```

**Option 2**: IndexedDB (for larger data)
**Option 3**: Backend database (if multiplayer)

**Recommendation**: Start with LocalStorage for single-player

---

## Deployment

### Vercel (Current)

**Client-side (Levels 1-3)**:
- No changes needed
- Bundle size increase: ~50KB (acceptable)

**Hybrid (Level 4)**:
- Add `api/formal_analysis.py` as serverless function
- Vercel supports Python functions
- May need to increase timeout (10s → 60s)

**Environment variables**:
```
FORMAL_ANALYSIS_ENABLED=true  # Toggle Level 4
PRISM_PATH=/var/task/prism    # If using PRISM
```

---

## Security Considerations

### Client-Side
- No security concerns (all computation in browser)
- Formal state not sensitive

### Backend (Level 4)
- **Input validation**: Validate trace data (Pydantic)
- **Rate limiting**: Prevent abuse (1 request/10s per user)
- **Timeout**: Kill long-running computations (30s max)
- **Sandboxing**: If executing user-defined properties

---

## Testing Infrastructure

### Unit Tests
```bash
npm test                    # Jest for TypeScript
pytest                      # Python tests (if backend)
```

### Integration Tests
```typescript
describe('Formal Integration', () => {
  it('should complete a full round with formal updates', async () => {
    const result = await simulateRound(gameState, actions);
    expect(result.formalState.compute).toBeGreaterThan(initialCompute);
    expect(result.modeTransition).toBeDefined();
  });
});
```

### Property-Based Tests
```typescript
import fc from 'fast-check';

fc.assert(
  fc.property(
    fc.array(fc.record({ /* action schema */ })),
    (actions) => {
      const result = updateFormalState(initialState, actions);
      expect(result.trust).toBeGreaterThanOrEqual(0);
      expect(result.trust).toBeLessThanOrEqual(1);
    }
  )
);
```

---

## Monitoring & Analytics

### Client-Side Metrics

```typescript
// Track formal model performance
performance.mark('formal-start');
const newState = formalModel.updateState(...);
performance.mark('formal-end');
const duration = performance.measure('formal', 'formal-start', 'formal-end');

if (duration.duration > 100) {
  console.warn('Formal model slow:', duration.duration, 'ms');
}
```

### Analytics

```typescript
// Track feature usage
analytics.track('formal_analysis_viewed', {
  level: 4,
  p_catastrophe: analysis.p_catastrophe,
  round: gameState.round
});
```

---

## Rollback Plan

### If formal layer causes issues:

**Level 1**: Feature flag to disable
```typescript
const FORMAL_ENABLED = process.env.VITE_FORMAL_ENABLED === 'true';

if (FORMAL_ENABLED) {
  // Update formal state
}
```

**Level 2-4**: Graceful degradation
- If mode detection fails → stay in current mode
- If property check fails → skip, log warning
- If MDP analysis times out → show cached result

---

## Recommended Stack

**For prototype (Levels 1-2)**:
- Pure TypeScript
- No external libraries
- ~1 week

**For production (Levels 1-3)**:
- TypeScript for core
- Optional Python for advanced checks
- ~6 weeks

**For research (Level 4)**:
- Python backend with Storm/PRISM
- React frontend
- ~12 weeks

---

**Next**: [UI Components](ui_components.md) for component design

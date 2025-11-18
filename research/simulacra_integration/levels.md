# Implementation Levels: Detailed Specifications

**Progressive integration from minimal to full formal verification**

---

## Level 1: State Tracking (1 week, HIGH value)

### Goal
Track continuous variables (compute, alignment, trust) and display real-time metrics.

### Type Definitions

```typescript
// types/formal.ts
export interface FormalState {
  compute: number;           // log10(FLOP/s), range [24, 28]
  alignment: number;         // [0, 1]
  security: number;          // [0, 1]
  trust: number;             // [0, 1]
  alignmentGap: number;      // Derived: compute - alignment*10
  riskScore: number;         // Derived: heuristic risk metric
}
```

### Update Function

```typescript
// services/formalModel.ts
export function updateFormalState(
  currentState: FormalState,
  actions: PlayerAction[]
): FormalState {
  let { compute, alignment, trust, security } = currentState;

  for (const action of actions) {
    // Parse action tags/descriptions for updates
    if (action.tags?.includes('deploy')) {
      compute += 0.2;
      trust -= 0.05;
    }
    if (action.tags?.includes('safety_research')) {
      alignment += 0.1 * (1 - alignment);  // Diminishing returns
    }
    if (action.tags?.includes('regulate')) {
      trust += 0.05;
      compute += 0.05;  // Slower growth
    }
    if (action.tags?.includes('security')) {
      security += 0.1 * (1 - security);
    }
  }

  // Compute derived metrics
  const alignmentGap = compute - alignment * 10;
  const riskScore = Math.max(0, alignmentGap - trust * 5);

  return { compute, alignment, security, trust, alignmentGap, riskScore };
}
```

### UI Component

```tsx
// components/game/FormalMetrics.tsx
export function FormalMetrics({ formalState }: { formalState: FormalState }) {
  const computeFLOPS = 10 ** formalState.compute;

  return (
    <div className="formal-metrics">
      <h3>Risk Metrics</h3>
      <div className="metrics-grid">
        <Metric
          label="Compute"
          value={computeFLOPS.toExponential(1) + " FLOP/s"}
          color="blue"
        />
        <Metric
          label="Alignment"
          value={(formalState.alignment * 100).toFixed(0) + "%"}
          color={formalState.alignment > 0.6 ? 'green' : 'orange'}
        />
        <Metric
          label="Trust"
          value={(formalState.trust * 100).toFixed(0) + "%"}
          color={formalState.trust > 0.4 ? 'green' : 'red'}
        />
        <Metric
          label="Risk Score"
          value={formalState.riskScore.toFixed(1)}
          color={formalState.riskScore > 5 ? 'red' : 'green'}
        />
      </div>
    </div>
  );
}
```

### Integration

```typescript
// hooks/useGameController.ts (modified)
const [formalState, setFormalState] = useState<FormalState>({
  compute: 26.0,
  alignment: 0.15,
  trust: 0.70,
  security: 0.50,
  alignmentGap: 24.5,
  riskScore: 2.1
});

// In handleActionsSubmit
function handleActionsSubmit(actions: PlayerAction[]) {
  // Update formal state
  const newFormalState = updateFormalState(formalState, actions);
  setFormalState(newFormalState);

  // Continue with LLM generation...
}
```

---

## Level 2: Mode Detection (2-3 weeks, HIGH value)

### Goal
Detect which governance mode the game is in, apply mode-specific parameters.

### Type Definitions

```typescript
export enum GovernanceMode {
  BASELINE = 'baseline',
  RACE = 'race',
  SLOWDOWN = 'slowdown',
  REGULATION_WINDOW = 'regulation_window',
  MISALIGNMENT_EVIDENCE = 'misalignment_evidence',
  PAUSE = 'pause',
  CATASTROPHE = 'catastrophe',
  ALIGNED = 'aligned'
}

export interface FormalState {
  // ... from Level 1
  mode: GovernanceMode;
  evidenceCount: number;
  roundsInMode: number;
}
```

### Mode Transition Logic

```typescript
export function detectModeTransition(
  currentMode: GovernanceMode,
  state: FormalState,
  actions: PlayerAction[]
): GovernanceMode {
  // baseline → race
  if (currentMode === 'baseline' && state.compute > 26.5) {
    return 'race';
  }

  // race → regulation_window
  if (currentMode === 'race' && state.trust < 0.4) {
    return 'regulation_window';
  }

  // race → misalignment_evidence
  if (currentMode === 'race' && state.evidenceCount >= 3) {
    return 'misalignment_evidence';
  }

  // misalignment_evidence → pause
  if (currentMode === 'misalignment_evidence' &&
      actions.some(a => a.tags?.includes('pause'))) {
    return 'pause';
  }

  // pause → aligned (success)
  if (currentMode === 'pause' && state.alignment > 0.9) {
    return 'aligned';
  }

  // misalignment_evidence → catastrophe
  if (currentMode === 'misalignment_evidence' &&
      state.alignment < 0.3 && state.compute > 27.5) {
    return 'catastrophe';
  }

  return currentMode;  // No transition
}
```

### Mode Parameters

```typescript
interface ModeParameters {
  computeGrowth: number;
  alignmentProgress: number;
  trustChange: number;
}

export function getModeParameters(mode: GovernanceMode): ModeParameters {
  switch (mode) {
    case 'race':
      return { computeGrowth: 1.5, alignmentProgress: 0.05, trustChange: -0.05 };
    case 'slowdown':
      return { computeGrowth: 0.3, alignmentProgress: 0.4, trustChange: 0.03 };
    case 'pause':
      return { computeGrowth: 0.0, alignmentProgress: 0.6, trustChange: 0.0 };
    default:
      return { computeGrowth: 0.5, alignmentProgress: 0.1, trustChange: -0.02 };
  }
}
```

### UI Component

```tsx
export function ModeIndicator({ formalState }: { formalState: FormalState }) {
  const modeColor = getModeColor(formalState.mode);
  const modeDescription = getModeDescription(formalState.mode);

  return (
    <div className="mode-indicator">
      <div className={`mode-badge mode-${formalState.mode}`}>
        {formalState.mode.toUpperCase().replace('_', ' ')}
      </div>
      <p className="mode-description">{modeDescription}</p>

      {formalState.mode === 'misalignment_evidence' && (
        <div className="warning">
          ⚠️ Evidence: {formalState.evidenceCount}/3 — Action required!
        </div>
      )}
    </div>
  );
}
```

---

## Level 3: Property Checking (4-6 weeks, MEDIUM value)

### Goal
Check temporal logic properties in real-time, warn on violations.

### Property Definition

```typescript
export interface Property {
  id: string;
  name: string;
  formula: string;
  type: 'safety' | 'liveness';
  check: (trace: GameLogEntry[], state: FormalState) => boolean;
  explanation: string;
}

export const PROPERTIES: Property[] = [
  {
    id: 'no_premature_deployment',
    name: 'No Deployment Before Alignment',
    formula: 'AG (alignment < 0.6 → ¬deployed)',
    type: 'safety',
    check: (trace, state) => {
      return trace.every(entry => {
        const deployed = entry.actions.some(a => a.tags?.includes('deploy'));
        return !deployed || entry.formalState.alignment >= 0.6;
      });
    },
    explanation: 'AI systems should only be deployed when alignment ≥ 60%'
  },

  {
    id: 'trust_floor',
    name: 'Trust Above Critical Threshold',
    formula: 'AG (trust ≥ 0.3)',
    type: 'safety',
    check: (trace, state) => {
      return state.trust >= 0.3 && trace.every(e => e.formalState.trust >= 0.3);
    },
    explanation: 'Public trust must never fall below 30% (legitimacy crisis)'
  },

  {
    id: 'eventual_alignment',
    name: 'Alignment Eventually Achieved',
    formula: 'F (alignment ≥ 0.7)',
    type: 'liveness',
    check: (trace, state) => {
      return state.alignment >= 0.7 || trace.some(e => e.formalState.alignment >= 0.7);
    },
    explanation: 'Alignment capacity should eventually reach 70%'
  }
];
```

### Checker Function

```typescript
export interface PropertyCheckResult {
  property: Property;
  satisfied: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export function checkProperties(
  properties: Property[],
  trace: GameLogEntry[],
  currentState: FormalState
): PropertyCheckResult[] {
  return properties.map(prop => {
    const satisfied = prop.check(trace, currentState);

    return {
      property: prop,
      satisfied,
      message: generateMessage(prop, satisfied, currentState),
      severity: satisfied ? 'info' : (prop.type === 'safety' ? 'error' : 'warning')
    };
  });
}

function generateMessage(prop: Property, satisfied: boolean, state: FormalState): string {
  if (satisfied) {
    return `✓ ${prop.name}: Satisfied`;
  } else {
    return `✗ ${prop.name}: VIOLATED — ${prop.explanation}`;
  }
}
```

### UI Component

```tsx
export function PropertyMonitor({ propertyResults }: { propertyResults: PropertyCheckResult[] }) {
  return (
    <div className="property-monitor">
      <h3>Safety Properties</h3>
      <div className="properties-list">
        {propertyResults.map(result => (
          <PropertyItem key={result.property.id} result={result} />
        ))}
      </div>
    </div>
  );
}

function PropertyItem({ result }: { result: PropertyCheckResult }) {
  return (
    <div className={`property-item ${result.severity}`}>
      <div className="property-header">
        <span className="icon">{result.satisfied ? '✓' : '✗'}</span>
        <code className="formula">{result.property.formula}</code>
      </div>
      <p className="message">{result.message}</p>
    </div>
  );
}
```

---

## Level 4: Probabilistic Analysis (2-3 months, MEDIUM value)

### Goal
Build MDP, compute P(catastrophe), provide optimal policy suggestions.

### MDP Abstraction

```typescript
export interface MDPState {
  mode: GovernanceMode;
  computeRegion: 'low' | 'medium' | 'high';
  alignmentRegion: 'low' | 'medium' | 'high';
  trustRegion: 'low' | 'medium' | 'high';
}

export function abstractToMDPState(formalState: FormalState): MDPState {
  return {
    mode: formalState.mode,
    computeRegion: formalState.compute < 26.5 ? 'low' :
                   formalState.compute < 27.5 ? 'medium' : 'high',
    alignmentRegion: formalState.alignment < 0.3 ? 'low' :
                     formalState.alignment < 0.7 ? 'medium' : 'high',
    trustRegion: formalState.trust < 0.4 ? 'low' :
                 formalState.trust < 0.7 ? 'medium' : 'high'
  };
}
```

### Probability Computation (Simplified)

```typescript
export function computeProbabilities(
  mdp: MDP,
  initialState: MDPState,
  targetStates: MDPState[],
  horizon: number
): number {
  // Simplified: matrix exponentiation
  let probabilities = new Map<string, number>();
  probabilities.set(stateToString(initialState), 1.0);

  for (let step = 0; step < horizon; step++) {
    const nextProbs = new Map<string, number>();

    for (const [stateStr, prob] of probabilities) {
      const state = stringToState(stateStr);
      const transitions = mdp.getTransitions(state);

      for (const trans of transitions) {
        const targetStr = stateToString(trans.toState);
        nextProbs.set(
          targetStr,
          (nextProbs.get(targetStr) || 0) + prob * trans.probability
        );
      }
    }

    probabilities = nextProbs;
  }

  // Sum probabilities of target states
  return targetStates.reduce((sum, target) =>
    sum + (probabilities.get(stateToString(target)) || 0), 0
  );
}
```

### UI Component

```tsx
export function RiskAnalysis({ formalState, mdp }: Props) {
  const currentMDPState = abstractToMDPState(formalState);
  const pCatastrophe = computeProbabilities(
    mdp,
    currentMDPState,
    getCatastropheStates(),
    10
  );
  const pSuccess = computeProbabilities(
    mdp,
    currentMDPState,
    getAlignedStates(),
    10
  );

  return (
    <div className="risk-analysis">
      <h3>Risk Analysis</h3>

      <div className="risk-gauge">
        <CircularProgress value={pCatastrophe * 100} />
        <div>P(Catastrophe): {(pCatastrophe * 100).toFixed(1)}%</div>
      </div>

      <div className="risk-gauge">
        <CircularProgress value={pSuccess * 100} />
        <div>P(Success): {(pSuccess * 100).toFixed(1)}%</div>
      </div>

      <CounterfactualAnalysis mdp={mdp} currentState={currentMDPState} />
      <OptimalPolicyDisplay mdp={mdp} currentState={currentMDPState} />
    </div>
  );
}
```

---

## Summary Table

| Level | Effort | Value | Key Feature | Example Output |
|-------|--------|-------|-------------|----------------|
| **1** | 1 week | HIGH | Variable tracking | "Alignment: 62%" |
| **2** | 2-3 weeks | HIGH | Mode detection | "Mode: RACE (Round 3)" |
| **3** | 4-6 weeks | MED | Property checking | "✗ Deployed without sufficient alignment" |
| **4** | 2-3 months | MED | Probabilistic analysis | "P(catastrophe): 18.3%" |

---

**Recommended**: Start with Levels 1-2, evaluate Level 3 based on player interest, add Level 4 only if there's demand for power-user features.

**Next**: [LLM Strategies](llm_strategies.md) for integrating formal analysis with narrative generation

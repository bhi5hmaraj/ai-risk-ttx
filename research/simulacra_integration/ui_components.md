# UI Components & Progressive Disclosure

**Component designs for displaying formal metrics**

---

## Design Philosophy

### Progressive Disclosure

**Principle**: Show complexity gradually based on user engagement

**Three levels**:
1. **Always visible**: Basic metrics (trust, alignment, risk)
2. **Expandable**: Mode indicator, property status
3. **Modal**: Full analysis, counterfactuals

**Example**:
```
[Always] Trust: 45% | Alignment: 62% | Risk: 6.2
         ↓ click to expand
[Expand] Mode: RACE | Properties: ✓ 8/10
         ↓ click "Analyze"
[Modal]  P(Catastrophe): 18.3% | Counterfactuals | Optimal Policy
```

---

## Component 1: FormalMetrics (Level 1)

### Always Visible - Compact Panel

```tsx
export function FormalMetrics({ formalState }: Props) {
  return (
    <div className="formal-metrics-compact">
      <MetricBadge
        icon="💻"
        label="Compute"
        value={formatCompute(formalState.compute)}
        tooltip="Available compute for AI training"
      />
      <MetricBadge
        icon="🎯"
        label="Alignment"
        value={`${(formalState.alignment * 100).toFixed(0)}%`}
        color={getAlignmentColor(formalState.alignment)}
        tooltip="How well AI goals match human values"
      />
      <MetricBadge
        icon="🤝"
        label="Trust"
        value={`${(formalState.trust * 100).toFixed(0)}%`}
        color={getTrustColor(formalState.trust)}
        tooltip="Public confidence in AI governance"
      />
      <MetricBadge
        icon="⚠️"
        label="Risk"
        value={formalState.riskScore.toFixed(1)}
        color={getRiskColor(formalState.riskScore)}
        tooltip="Overall catastrophe risk score"
      />
    </div>
  );
}
```

**Layout** (right sidebar):
```
┌─────────────────┐
│ 💻 Compute      │
│ 10^27.2 FLOP/s  │
├─────────────────┤
│ 🎯 Alignment 🟡 │
│ 33%             │
├─────────────────┤
│ 🤝 Trust 🟢     │
│ 57%             │
├─────────────────┤
│ ⚠️  Risk 🔴     │
│ 6.8/10          │
└─────────────────┘
```

---

## Component 2: ModeIndicator (Level 2)

### Expandable Section

```tsx
export function ModeIndicator({ formalState, expanded, onToggle }: Props) {
  return (
    <div className="mode-indicator">
      <button onClick={onToggle} className="mode-header">
        <ModeBadge mode={formalState.mode} />
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="mode-details">
          <p className="mode-description">
            {getModeDescription(formalState.mode)}
          </p>

          {formalState.roundsInMode > 0 && (
            <p className="mode-duration">
              Round {formalState.roundsInMode} in this mode
            </p>
          )}

          {getTransitionWarnings(formalState).map(warning => (
            <WarningCard key={warning.id} warning={warning} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Collapsed**:
```
▶ MODE: RACE
```

**Expanded**:
```
▼ MODE: RACE (Round 3)

  Uncoordinated capability race. Compute
  growing rapidly, alignment lagging.

  ⚠️ Warning: Evidence count 2/3
  One more incident triggers crisis mode.

  Available transitions:
  • REGULATION_WINDOW (if trust < 40%)
  • MISALIGNMENT_EVIDENCE (if evidence ≥ 3)
```

---

## Component 3: PropertyMonitor (Level 3)

### Expandable Property List

```tsx
export function PropertyMonitor({ propertyResults, expanded, onToggle }: Props) {
  const violations = propertyResults.filter(r => !r.satisfied);
  const satisfied = propertyResults.filter(r => r.satisfied);

  return (
    <div className="property-monitor">
      <button onClick={onToggle} className="property-header">
        <span>Safety Properties</span>
        <StatusBadge violations={violations.length} />
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="property-list">
          {violations.length > 0 && (
            <section className="violations">
              <h4>⚠️ Violations</h4>
              {violations.map(r => (
                <PropertyCard key={r.property.id} result={r} />
              ))}
            </section>
          )}

          <section className="satisfied">
            <h4>✓ Satisfied ({satisfied.length})</h4>
            {satisfied.map(r => (
              <PropertyCard key={r.property.id} result={r} collapsed />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ result, collapsed }: Props) {
  return (
    <div className={`property-card ${result.severity}`}>
      <div className="property-header">
        <span className="icon">{result.satisfied ? '✓' : '✗'}</span>
        <code className="formula">{result.property.formula}</code>
      </div>
      {!collapsed && (
        <>
          <p className="property-name">{result.property.name}</p>
          <p className="message">{result.message}</p>
        </>
      )}
    </div>
  );
}
```

**Layout**:
```
▼ Safety Properties (1 violation)

  ⚠️ Violations
  ┌──────────────────────────────┐
  │ ✗ AG (alignment < 0.6 → ¬dep)│
  │ No Deployment Before Alignment│
  │ Deployed AI with only 33%    │
  │ alignment (threshold: 60%)   │
  └──────────────────────────────┘

  ✓ Satisfied (8)
  AG (trust ≥ 0.3)
  F (alignment ≥ 0.7)
  ...
```

---

## Component 4: RiskAnalysis (Level 4)

### Modal with Full Analysis

```tsx
export function RiskAnalysisModal({ formalState, mdp, onClose }: Props) {
  const analysis = useMemo(
    () => computeAnalysis(formalState, mdp),
    [formalState, mdp]
  );

  return (
    <Modal open onClose={onClose} size="large">
      <ModalHeader>
        <h2>Formal Risk Analysis</h2>
      </ModalHeader>

      <ModalBody>
        <RiskGauges
          pCatastrophe={analysis.pCatastrophe}
          pSuccess={analysis.pSuccess}
        />

        <Divider />

        <CounterfactualAnalysis
          current={analysis.current}
          counterfactuals={analysis.counterfactuals}
        />

        <Divider />

        <OptimalPolicyDisplay
          optimalAction={analysis.optimalAction}
          reasoning={analysis.reasoning}
        />
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={exportAnalysis}>Export</Button>
      </ModalFooter>
    </Modal>
  );
}
```

**Layout**:
```
╔══════════════════════════════════════╗
║ Formal Risk Analysis                 ║
╠══════════════════════════════════════╣
║ ┌────────┐  ┌────────┐              ║
║ │   🔴   │  │   🟢   │              ║
║ │ 18.3%  │  │ 41.2%  │              ║
║ └────────┘  └────────┘              ║
║ Catastrophe  Success                 ║
║──────────────────────────────────────║
║ What-If Analysis                     ║
║ If you had PAUSED 2 rounds ago:      ║
║ • P(Catastrophe): 12.1% (↓ 6.2%)    ║
║ • P(Success): 52.7% (↑ 11.5%)       ║
║──────────────────────────────────────║
║ Model Recommendation: PAUSE NOW      ║
║ Reasoning: Alignment gap critical... ║
║──────────────────────────────────────║
║ [Close]        [Export Analysis]     ║
╚══════════════════════════════════════╝
```

---

## Layouts

### Desktop (>1024px)

```
┌────────────────────────────────────────┐
│ Header: Round 5                        │
├──────────────────┬─────────────────────┤
│                  │ Formal Metrics      │
│  Main Narrative  │ ├─ Compute          │
│  (LLM Generated) │ ├─ Alignment        │
│                  │ ├─ Trust            │
│                  │ └─ Risk             │
│                  │                     │
│                  │ ▼ Mode: RACE        │
│                  │   Description...    │
│                  │                     │
│                  │ ▼ Properties (1 ✗)  │
│                  │   Violation...      │
│                  │                     │
│  [Submit Action] │ [Analyze Risk]      │
└──────────────────┴─────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────┐
│ Header           │
├──────────────────┤
│ Main Narrative   │
│                  │
│ [Submit Action]  │
├──────────────────┤
│ ▼ Formal Metrics │
│   Compute: 27.2  │
│   Align: 33%     │
│   Trust: 57%     │
│   Risk: 6.8      │
├──────────────────┤
│ ▶ Mode           │
│ ▶ Properties     │
│ [Analyze Risk]   │
└──────────────────┘
```

---

## Responsive Design

```scss
.formal-sidebar {
  @media (max-width: 768px) {
    position: sticky;
    bottom: 0;
    width: 100%;
    max-height: 50vh;
    overflow-y: auto;
  }

  @media (min-width: 769px) {
    position: sticky;
    top: 80px;
    width: 320px;
    height: calc(100vh - 100px);
    overflow-y: auto;
  }
}
```

---

## Animations

### Mode Transition

```tsx
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  className="mode-transition-badge"
>
  {oldMode} → {newMode}
</motion.div>
```

### Property Violation Alert

```tsx
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300 }}
  className="violation-alert"
>
  ⚠️ Property Violated!
</motion.div>
```

---

## Accessibility

### ARIA Labels

```tsx
<div
  role="region"
  aria-label="Formal metrics panel"
  aria-live="polite"
>
  {/* Metrics update announce to screen readers */}
</div>
```

### Keyboard Navigation

```tsx
<button
  onClick={onToggle}
  onKeyPress={(e) => e.key === 'Enter' && onToggle()}
  aria-expanded={expanded}
>
  Expand details
</button>
```

---

## Color Scheme

### Metric Colors

```typescript
function getAlignmentColor(alignment: number): string {
  if (alignment >= 0.7) return 'green';
  if (alignment >= 0.4) return 'yellow';
  return 'red';
}

function getTrustColor(trust: number): string {
  if (trust >= 0.6) return 'green';
  if (trust >= 0.3) return 'yellow';
  return 'red';
}

function getRiskColor(risk: number): string {
  if (risk <= 3) return 'green';
  if (risk <= 6) return 'yellow';
  return 'red';
}
```

### Mode Colors

```typescript
const MODE_COLORS = {
  baseline: '#888',
  race: '#f44336',
  slowdown: '#4caf50',
  regulation_window: '#ff9800',
  misalignment_evidence: '#e91e63',
  pause: '#2196f3',
  catastrophe: '#000',
  aligned: '#00c853'
};
```

---

**Next**: See [Example Round](example_round.md) for how these components work together

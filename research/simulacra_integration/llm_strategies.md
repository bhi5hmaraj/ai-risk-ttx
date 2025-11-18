# LLM Integration Strategies

**How to combine formal analysis with LLM narrative generation**

---

## The Challenge

**Formal model** provides rigorous state tracking and verification.
**LLM** provides rich, emergent narratives.

**Problem**: How to keep them consistent?

Three strategies, ordered by increasing coupling:

---

## Strategy 1: Parallel (Loose Coupling)

### Approach
Formal model and LLM run independently. Display both outputs side-by-side.

### Flow
```
Player Actions
    ├─→ Update Formal State (sync, fast)
    └─→ Generate LLM Narrative (async, slow)
         ↓
    Display Both
```

### Implementation

```typescript
async function handleActionsSubmit(actions: PlayerAction[]) {
  // 1. Update formal state (instant)
  const newFormalState = updateFormalState(formalState, actions);
  setFormalState(newFormalState);

  // 2. Generate LLM consequences (parallel, no guidance)
  const consequences = await generateConsequences(gameState, actions);

  // 3. Merge and display
  setGameState({
    ...gameState,
    formalState: newFormalState,
    eventLog: [...gameState.eventLog, consequences]
  });
}
```

### Pros
- Simple implementation
- Fast (no coupling delays)
- LLM creativity unconstrained

### Cons
- **Divergence risk**: LLM might contradict formal state
- No consistency guarantees
- Players might see conflicting info

### Best For
- Level 1-2 initial implementation
- Quick prototyping
- Low-stakes scenarios

---

## Strategy 2: Guided (Tight Coupling)

### Approach
Formal analysis informs LLM prompts. LLM generates narratives consistent with formal state.

### Flow
```
Player Actions
    ↓
Update Formal State
    ↓
Analyze (mode, properties, risk)
    ↓
Build Enhanced Prompt (inject formal guidance)
    ↓
Generate LLM Narrative (guided by formal constraints)
    ↓
Display Consistent Output
```

### Implementation

```typescript
async function handleActionsSubmit(actions: PlayerAction[]) {
  // 1. Update formal state
  const newFormalState = updateFormalState(formalState, actions);
  const newMode = detectModeTransition(formalState.mode, newFormalState, actions);

  // 2. Check properties
  const propertyResults = checkProperties(gameState.eventLog, newFormalState);
  const violations = propertyResults.filter(r => !r.satisfied);

  // 3. Build formal guidance block
  const formalGuidance = `
CURRENT FORMAL STATE:
- Mode: ${newMode} (round ${newFormalState.roundsInMode + 1} in this mode)
- Compute: 10^${newFormalState.compute.toFixed(1)} FLOP/s
- Alignment: ${(newFormalState.alignment * 100).toFixed(0)}%
- Trust: ${(newFormalState.trust * 100).toFixed(0)}%
- Risk Score: ${newFormalState.riskScore.toFixed(1)}/10

${violations.length > 0 ? `
⚠️ PROPERTY VIOLATIONS:
${violations.map(v => `- ${v.property.name}: ${v.message}`).join('\n')}
` : '✓ All safety properties satisfied'}

MODE TRANSITION STATUS:
${newMode !== formalState.mode
  ? `TRANSITION: ${formalState.mode} → ${newMode}`
  : `Remaining in ${newMode} mode`}

CONSTRAINTS:
- Generate consequences that reflect current mode dynamics
- Respect property violations if any
- Adjust narrative tone based on risk score
`;

  // 4. Generate LLM consequences with guidance
  const enhancedPrompt = `${basePrompt}\n\n${formalGuidance}\n\n${actionsDescription}`;
  const consequences = await callLLM(enhancedPrompt);

  // 5. Update state
  setGameState({
    ...gameState,
    formalState: { ...newFormalState, mode: newMode },
    eventLog: [...gameState.eventLog, consequences]
  });
}
```

### Guidance Format Example

```
CURRENT FORMAL STATE:
- Mode: MISALIGNMENT_EVIDENCE (round 2 in this mode)
- Compute: 10^27.2 FLOP/s
- Alignment: 33%
- Trust: 57%
- Risk Score: 6.8/10

⚠️ PROPERTY VIOLATIONS:
- No Deployment Before Alignment: Deployed AI with only 33% alignment (threshold: 60%)

MODE TRANSITION STATUS:
TRANSITION: race → misalignment_evidence
Evidence threshold crossed! System has detected 3 concrete misalignment incidents.

CONSTRAINTS:
- Narrative should reflect the transition to MISALIGNMENT_EVIDENCE mode
- Highlight the deployment despite insufficient alignment
- Show public/expert concern about the violation
- Possibly introduce new evidence (incident report, safety failure)
```

### Pros
- **Consistency**: LLM narrative aligns with formal state
- **Educational**: Players see how formal constraints affect story
- **Quality control**: Reduces nonsensical outputs

### Cons
- Longer prompts → higher latency/cost
- LLM might resist or misinterpret constraints
- Less creative freedom

### Best For
- Level 2-3 production
- Educational contexts
- High-stakes scenarios where consistency matters

---

## Strategy 3: Validation (Post-hoc Checking)

### Approach
LLM generates freely, then validate output. Regenerate if inconsistent.

### Flow
```
Player Actions
    ↓
Update Formal State
    ↓
Generate LLM Narrative
    ↓
Parse Implied Formal Changes
    ↓
Validate Against Constraints
    ↓
If Valid → Accept
If Invalid → Regenerate (with violation feedback)
```

### Implementation

```typescript
async function handleActionsSubmit(actions: PlayerAction[]) {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    // Generate consequences
    const consequences = await generateConsequences(
      gameState,
      actions,
      attempt > 0 ? lastViolations : undefined  // Feedback on retry
    );

    // Parse implied formal state changes from narrative
    const impliedChanges = parseFormalChanges(consequences.description);
    const projectedState = applyChanges(formalState, impliedChanges);

    // Validate hard constraints
    const violations = checkHardConstraints(projectedState);

    if (violations.length === 0) {
      // Valid! Use it
      return updateGameState(consequences, projectedState);
    }

    // Log and retry
    console.warn(`Attempt ${attempt + 1} violated:`, violations);
    lastViolations = violations;
    attempt++;
  }

  // Fallback: Generate deterministic consequences from formal model
  return generateDeterministicConsequences(gameState, actions);
}
```

### Parsing Example

```typescript
function parseFormalChanges(narrativeText: string): FormalChanges {
  const changes: FormalChanges = {};

  // Look for keywords indicating compute growth
  if (/deployed|launched|scaled/i.test(narrativeText)) {
    changes.compute = 0.3;  // Significant jump
  }

  // Look for alignment mentions
  if (/safety research|alignment breakthrough/i.test(narrativeText)) {
    changes.alignment = 0.15;
  }

  // Look for trust impacts
  if (/scandal|failure|concern/i.test(narrativeText)) {
    changes.trust = -0.1;
  }
  if (/transparency|audit|compliance/i.test(narrativeText)) {
    changes.trust = 0.05;
  }

  return changes;
}
```

### Hard Constraints

```typescript
function checkHardConstraints(state: FormalState): Violation[] {
  const violations = [];

  // Can't have negative values
  if (state.trust < 0 || state.alignment < 0) {
    violations.push({ type: 'range', message: 'Negative values' });
  }

  // Alignment can't jump more than 20% in one round
  if (Math.abs(state.alignment - formalState.alignment) > 0.2) {
    violations.push({ type: 'rate', message: 'Unrealistic alignment change' });
  }

  // If in PAUSE mode, compute must not grow
  if (state.mode === 'pause' && state.compute > formalState.compute) {
    violations.push({ type: 'mode', message: 'Compute grew during pause' });
  }

  return violations;
}
```

### Pros
- Catches LLM mistakes automatically
- Guarantees consistency (eventually)
- Useful for debugging/logging

### Cons
- Multiple LLM calls → slow (3x latency in worst case)
- Expensive (multiple API calls)
- Deterministic fallback might disappoint players

### Best For
- Critical applications where consistency is mandatory
- Testing/validation during development
- Fallback for Strategy 2

---

## Hybrid Approach (Recommended)

Combine strategies based on context:

1. **Use Strategy 2 (Guided) as default**
   - Inject formal guidance into prompts
   - Most rounds will be consistent first-try

2. **Add Strategy 3 (Validation) as safety net**
   - If LLM output violates hard constraints, regenerate
   - Fallback to deterministic if all attempts fail

3. **Allow Strategy 1 (Parallel) for creative scenarios**
   - Optional "creative mode" toggle
   - Less constraints, more emergence

### Implementation

```typescript
async function generateConsequencesWithValidation(
  gameState: GameState,
  actions: PlayerAction[]
): Promise<Consequence> {
  // Build guided prompt (Strategy 2)
  const formalGuidance = buildFormalGuidance(gameState.formalState);
  const guidedPrompt = `${basePrompt}\n\n${formalGuidance}`;

  // Generate with guidance
  const consequences = await callLLM(guidedPrompt);

  // Validate (Strategy 3)
  const violations = validateConsequences(consequences, gameState.formalState);

  if (violations.length > 0) {
    console.warn('Violations detected, regenerating...');
    return regenerateWithFeedback(gameState, actions, violations);
  }

  return consequences;
}
```

---

## Prompt Engineering Tips

### Good Formal Guidance Block

**Clear structure**:
```
FORMAL STATE:
- Current values (with units)
- Mode and transition status
- Property violations

CONSTRAINTS:
- What must be true in the narrative
- What should be emphasized

CONTEXT:
- Previous round summary
- Player actions this round
```

**Specific numbers**:
```
✓ "Compute: 10^27.2 FLOP/s (dangerous threshold)"
✗ "Compute increased significantly"
```

**Actionable constraints**:
```
✓ "Narrative must reflect the mode transition from RACE to PAUSE"
✗ "Be consistent with formal model"
```

### Bad Guidance (Too Vague)

```
Please be consistent with the game state.
The alignment is low.
Players made some choices.
```

---

## Testing Strategies

### Unit Tests
```typescript
describe('Formal Guidance Generation', () => {
  it('should include mode transition in guidance', () => {
    const guidance = buildFormalGuidance(stateBeforeTransition);
    expect(guidance).toContain('TRANSITION: race → pause');
  });

  it('should list violations', () => {
    const guidance = buildFormalGuidance(stateWithViolations);
    expect(guidance).toContain('⚠️ PROPERTY VIOLATIONS');
  });
});
```

### Integration Tests
```typescript
describe('Validated Generation', () => {
  it('should regenerate on hard constraint violation', async () => {
    const mockLLM = jest.fn()
      .mockResolvedValueOnce(invalidConsequence)  // First try: invalid
      .mockResolvedValueOnce(validConsequence);   // Second try: valid

    const result = await generateWithValidation(gameState, actions);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    expect(result).toEqual(validConsequence);
  });
});
```

---

**Next**: [UI Components](ui_components.md) for displaying formal metrics

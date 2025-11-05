# Architecture Governance: Preventing Drift

**Problem Statement**: Multiple contributors adding features their own way → 539-line god objects, duplicate logic, broken boundaries.

**Goal**: Enforce architectural boundaries and patterns programmatically, not through code review alone.

---

## 🔒 Hard Rules (Enforced by Tooling)

### 1. ESLint Import Boundaries

**File**: `.eslintrc.js` (add these rules)

```javascript
module.exports = {
  plugins: ['import'],
  rules: {
    // Prevent server code in client
    'import/no-restricted-paths': ['error', {
      zones: [
        // Client cannot import server
        {
          target: './app/**',
          from: './server/**',
          message: 'Client code cannot import server code. Use API calls instead.'
        },
        {
          target: './hooks/**',
          from: './server/**',
          message: 'Client hooks cannot import server code. Use API calls instead.'
        },
        {
          target: './components/**',
          from: './server/**',
          message: 'Components cannot import server code. Use API calls instead.'
        },

        // Server cannot import client
        {
          target: './server/**',
          from: './app/**',
          message: 'Server code cannot import client code.'
        },
        {
          target: './server/**',
          from: './hooks/**',
          message: 'Server code cannot import hooks. Extract shared logic.'
        },
        {
          target: './server/**',
          from: './components/**',
          message: 'Server code cannot import components.'
        },

        // Shared can be imported by anyone, but cannot import client/server
        {
          target: './shared/**',
          from: './server/**',
          message: 'Shared code must be isomorphic. Cannot import server code.'
        },
        {
          target: './shared/**',
          from: './app/**',
          message: 'Shared code must be isomorphic. Cannot import client code.'
        },

        // Deprecated: lib/api moved to server/api
        {
          target: './**',
          from: './lib/api/**',
          message: 'lib/api is deprecated. Use @/server/api/ instead.'
        }
      ]
    }]
  }
};
```

**Benefit**: Catch violations at lint time, not in code review.

---

### 2. Complexity Limits

**File**: `.eslintrc.js` (add these rules)

```javascript
module.exports = {
  rules: {
    // Max lines per file
    'max-lines': ['error', {
      max: 300,
      skipBlankLines: true,
      skipComments: true
    }],

    // Max lines per function
    'max-lines-per-function': ['error', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],

    // Max cyclomatic complexity
    'complexity': ['error', 10],

    // Max nested callbacks
    'max-nested-callbacks': ['error', 3],

    // Max parameters
    'max-params': ['error', 4],

    // Warn on too many useState/useEffect in a single hook
    // (Custom rule - see below)
  }
};
```

**Why this would have caught useGameController**:
- 539 lines → ❌ Exceeds 300 line limit
- 7 useEffects → Would trigger custom rule
- Nested callbacks in SSE → Exceeds nesting limit

---

### 3. Custom ESLint Rule: Hook Complexity

**File**: `eslint-rules/max-hooks-per-component.js` (NEW)

```javascript
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Limit number of React hooks in a single component/hook',
      category: 'Best Practices',
    },
    messages: {
      tooManyHooks: 'Component/hook has {{count}} {{hookName}} calls (max: {{max}}). Consider extracting logic.',
    },
  },
  create(context) {
    const hookCounts = {};
    const limits = {
      useEffect: 3,
      useState: 8,
      useRef: 3,
      useCallback: 10,
    };

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name.startsWith('use')) {
          const hookName = node.callee.name;
          if (limits[hookName]) {
            hookCounts[hookName] = (hookCounts[hookName] || 0) + 1;
            if (hookCounts[hookName] > limits[hookName]) {
              context.report({
                node,
                messageId: 'tooManyHooks',
                data: {
                  count: hookCounts[hookName],
                  hookName,
                  max: limits[hookName],
                },
              });
            }
          }
        }
      },
    };
  },
};
```

**Load in `.eslintrc.js`**:
```javascript
module.exports = {
  plugins: ['local-rules'],
  rules: {
    'local-rules/max-hooks-per-component': 'error',
  },
};
```

---

## 📏 Soft Rules (Code Review Guidelines)

### Pattern: Single Responsibility Per Hook

**✅ GOOD**:
```typescript
// hooks/useActionTimer.ts (ONE responsibility)
export function useActionTimer(initialSeconds: number) {
  const [timer, setTimer] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused, timer]);

  return { timer, isPaused, setIsPaused, resetTimer: () => setTimer(initialSeconds) };
}
```

**❌ BAD**:
```typescript
// hooks/useGameController.ts (SEVEN responsibilities)
export function useGameController() {
  // 1. Game state management
  // 2. Timer management
  // 3. SSE connection
  // 4. Action options loading
  // 5. Scenario initialization
  // 6. UI state (action tree, history)
  // 7. Session lifecycle
  // ... 539 lines later ...
}
```

### Pattern: Composition Over God Objects

**✅ GOOD**:
```typescript
export function useGameController() {
  // Coordinate smaller hooks
  const { gameState, players } = useGameStore();
  const { handleStartGame, handleConfirmActions } = useGameActions();
  const { timer, isPaused, setIsPaused } = useActionTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
  const { loadHumanOptions } = useRoundOptions();

  // Only orchestration logic here
  const humanPlayer = useMemo(() => players.find(p => p.isHuman), [players]);

  return { state: { gameState, players, timer, isPaused }, actions: { handleStartGame, handleConfirmActions } };
}
```

### Pattern: Backend-First for Game Logic

**Rule**: If it involves scoring, AI turns, or game state transitions → backend.

**✅ GOOD**:
```typescript
// hooks/useGameActions.ts (client)
const handleConfirmActions = (actions: ActionOption[]) => {
  await SessionService.submitActions(sessionId, playerId, actions);
  await SessionService.advance(sessionId);  // Server computes everything
};
```

**❌ BAD**:
```typescript
// hooks/useGameController.ts (client)
const runConsequencePhase = async () => {
  // Client-side consequence calculation, AI turn generation, etc.
  // ... 100+ lines of game logic that should be server-side ...
};
```

---

## 🔬 Testing Requirements

### 1. Architectural Tests

**File**: `tests/architecture.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Architectural Constraints', () => {
  it('should not have hooks exceeding 200 lines', () => {
    const hooksDir = join(__dirname, '../hooks');
    const hooks = readdirSync(hooksDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    for (const hook of hooks) {
      const path = join(hooksDir, hook);
      const lines = readFileSync(path, 'utf-8').split('\n').length;

      expect(lines, `${hook} has ${lines} lines (max 200)`).toBeLessThanOrEqual(200);
    }
  });

  it('should not import server code from client hooks', () => {
    const hooksDir = join(__dirname, '../hooks');
    const hooks = readdirSync(hooksDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    for (const hook of hooks) {
      const path = join(hooksDir, hook);
      const content = readFileSync(path, 'utf-8');

      expect(
        content,
        `${hook} imports server code (use API calls instead)`
      ).not.toMatch(/from ['"]@\/server\//);

      expect(
        content,
        `${hook} imports deprecated lib/api (use @/server/api)`
      ).not.toMatch(/from ['"].*lib\/api\//);
    }
  });

  it('should have SessionMonitor component mounted (not duplicate SSE in hooks)', () => {
    // Check that SessionMonitor is imported in layout
    const layoutPath = join(__dirname, '../app/layout.tsx');
    const content = readFileSync(layoutPath, 'utf-8');

    expect(content, 'SessionMonitor must be mounted in layout').toContain('SessionMonitor');
  });
});
```

**Run in CI**:
```json
// package.json
{
  "scripts": {
    "test:architecture": "vitest run tests/architecture.test.ts",
    "test:all": "npm run test:architecture && npm test"
  }
}
```

### 2. Integration Tests for Each Feature

**Rule**: Every new feature needs an integration test showing the full flow.

**Example**: `tests/feature.action-submission.test.ts`

```typescript
describe('Feature: Action Submission Flow', () => {
  it('should submit human actions and trigger AI turn', async () => {
    // 1. Create session
    const session = await SessionService.create({ mode: 'classic', setup });

    // 2. Initialize
    await SessionService.initialize(session.id);

    // 3. Get options
    const options = await SessionService.getActionOptions(session.id, 'human_player', 'Tech CEO');

    // 4. Submit actions
    await SessionService.submitActions(session.id, 'human_player', options.slice(0, 2));

    // 5. Advance (server computes AI turns)
    const advanced = await SessionService.advance(session.id);

    // Verify: All players have actions
    expect(advanced.players.every(p => p.hasSubmittedActions)).toBe(true);
    expect(advanced.state.round).toBe(2);
  });
});
```

---

## 📖 Documentation Standards

### 1. ARCHITECTURE.md (NEW - Top-Level)

**File**: `/ARCHITECTURE.md`

```markdown
# Architecture Overview

## Boundaries

```
┌─────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                     │
│  ├─ app/ (Next.js pages)                            │
│  ├─ components/ (React components)                  │
│  ├─ hooks/ (React hooks - API calls only)           │
│  └─ stores/ (Zustand stores)                        │
└─────────────────────────────────────────────────────┘
                         ↓ HTTP/SSE
┌─────────────────────────────────────────────────────┐
│ SERVER (Next.js API Routes)                         │
│  ├─ server/api/ (Route handlers)                    │
│  ├─ server/services/ (Business logic)               │
│  ├─ server/stores/ (Session storage)                │
│  └─ server/lib/ (Utilities)                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ SHARED (Isomorphic)                                 │
│  ├─ types.ts (Shared types)                         │
│  └─ shared/ (Pure functions, no React/Node)         │
└─────────────────────────────────────────────────────┘
```

## Rules

1. **Client calls server via API** - No direct server imports in client code
2. **Server is authoritative** - All game logic, AI turns, scoring on server
3. **Hooks are thin** - Coordinate smaller hooks, max 200 lines
4. **One responsibility per file** - Max 3 useEffects per hook
```

### 2. ADR (Architectural Decision Records)

**File**: `/docs/adr/0001-server-authoritative-architecture.md`

```markdown
# ADR 0001: Server-Authoritative Architecture

**Status**: Accepted (2025-11-05)

## Context
Multiple game states (client vs server) led to desyncs and bugs.

## Decision
Server is the single source of truth. Client only:
- Sends intents (start game, submit actions)
- Receives state updates (via SSE)
- Renders UI

## Consequences
**Positive**:
- No client-side game logic → simpler, fewer bugs
- SSE for real-time updates → responsive UX
- Server can enforce rules, detect cheating

**Negative**:
- More API calls
- SSE complexity (mitigated by SessionMonitor component)

## Compliance
- ✅ useGameActions delegates to SessionService
- ✅ No LLM calls from client hooks
- ❌ useGameController still has 105 lines of SSE (should move to SessionMonitor)
```

---

## 🚨 Pre-Commit Hooks

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 1. Lint (catches import violations, complexity)
npm run lint --quiet || {
  echo "❌ Lint failed. Fix errors before committing."
  exit 1
}

# 2. Architecture tests (catches file size, boundaries)
npm run test:architecture || {
  echo "❌ Architecture tests failed. Check file sizes and boundaries."
  exit 1
}

# 3. Type check
npm run type-check || {
  echo "❌ Type errors found."
  exit 1
}

echo "✅ Pre-commit checks passed"
```

**Setup**:
```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test:architecture"
```

---

## 📊 Metrics & Monitoring

### Complexity Dashboard

**File**: `scripts/complexity-report.ts`

```typescript
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const dirs = ['hooks', 'components', 'server/services', 'server/api'];

for (const dir of dirs) {
  console.log(`\n=== ${dir} ===`);
  const files = readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

  for (const file of files) {
    const path = join(dir, file);
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n').length;
    const useEffects = (content.match(/useEffect/g) || []).length;
    const useStates = (content.match(/useState/g) || []).length;

    const flag = lines > 200 ? '🔴' : lines > 150 ? '🟡' : '🟢';
    console.log(`${flag} ${file}: ${lines} lines, ${useEffects} useEffect, ${useStates} useState`);
  }
}
```

**Run weekly**:
```bash
npm run complexity-report
```

---

## 🎯 Onboarding Checklist for New Contributors

**File**: `/docs/CONTRIBUTING.md`

```markdown
# Contributing Guidelines

## Before Writing Code

1. Read `/ARCHITECTURE.md` - Understand boundaries
2. Read `/docs/adr/*.md` - Understand past decisions
3. Read `/docs/CONTROLLER_BLOAT_ANALYSIS.md` - See what NOT to do

## Writing Code

### ✅ DO
- Keep hooks under 200 lines
- Extract logic into smaller hooks (composition)
- Use API calls for server logic (SessionService.*)
- Write integration tests for new features
- Follow naming: `use<Action><Subject>` (useLoadOptions, useSubmitActions)

### ❌ DON'T
- Import server code in client hooks
- Add game logic to client (scoring, AI turns)
- Add useEffect after useEffect - extract to new hook
- Mix UI state with game state in same hook
- Create god objects (useEverything)

## Before Submitting PR

1. Run `npm run lint` - Must pass
2. Run `npm run test:architecture` - Must pass
3. Run `npm test` - Must pass
4. Check `npm run complexity-report` - Your files should be 🟢

## Code Review Focus

Reviewers will check:
- Hook complexity (max 200 lines, 3 useEffects)
- Import boundaries (no server in client)
- Test coverage (integration test for feature)
- Documentation (ADR for major decisions)
```

---

## 🔄 Migration Strategy for Existing Code

### Phase 1: Enable Rules (Non-Breaking)
```bash
# Add ESLint rules with warnings first
"import/no-restricted-paths": "warn"  # Not "error"

# Run and collect violations
npm run lint > violations.txt

# Categorize violations, create Beads issues
bd create "Fix import boundary violation in hooks/useGameController.ts"
```

### Phase 2: Fix Critical Violations
- useGameController → Extract SSE to SessionMonitor
- Delete dead code (runConsequencePhase, chatHistoryRef)
- Move remaining client logic to server

### Phase 3: Enforce (Breaking)
```bash
# Change warnings to errors
"import/no-restricted-paths": "error"

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
```

---

## 📈 Success Metrics

Track these over time:

| Metric | Current | Target | Timeline |
|---|---|---|---|
| Avg lines per hook | 270 (useGameController: 539) | <150 | 2 weeks |
| useEffects per hook | 3.5 avg (useGameController: 7) | <3 | 2 weeks |
| Import violations | Unknown | 0 | 1 week |
| Test coverage | ~70% | >85% | 1 month |
| Architecture test failures | N/A (not running) | 0 | 1 week |

---

## 🚦 Decision Framework: "Should I Add This Here?"

```
┌─ Is it game logic (scoring, AI, state transitions)?
│  YES → Server (server/services/)
│  NO ↓
│
├─ Is it an API call?
│  YES → Service wrapper (services/SessionService.ts)
│  NO ↓
│
├─ Is it React state management?
│  YES → Is it shared across pages?
│      YES → Zustand store (stores/)
│      NO → Local useState in component
│  NO ↓
│
├─ Is it a side effect (SSE, timers, data loading)?
│  YES → Is it used by multiple components?
│      YES → Custom hook (hooks/)
│      NO → useEffect in component
│  NO ↓
│
└─ Is it pure logic (no React, no Node)?
   YES → Shared utility (shared/ or lib/)
   NO → Re-evaluate: might belong in component
```

---

## Summary: The Meta-Rules

1. **Tooling > Discipline** - ESLint enforces boundaries, not reviewers
2. **Tests > Docs** - Architecture tests catch violations automatically
3. **Composition > Inheritance** - Small hooks composed, not god objects
4. **Server > Client** - Game logic lives on server, client renders
5. **Metrics > Gut Feel** - Track complexity, set limits, enforce

**Prevention is programmatic, not social.**

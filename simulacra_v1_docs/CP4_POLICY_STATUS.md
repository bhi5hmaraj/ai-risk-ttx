# CP4: Policy System - Implementation Status

**Date:** 2025-12-08
**Status:** 🟢 RESOLVED — 2025-12-09

## Overview

CP4 implements a numeric policy system where players define strategic policy stances across multiple dimensions. Each stance has a numeric value (-100 to 100) with sign indicating direction, and an optional description.

## 2025-12-09 Update — Resolution

CP4 is unblocked and complete. We centralized policy runtime in `shared/policy.ts`, added a small CLI bridge to load the built artifact (`packages/cli/src/policy-runtime.ts`), and improved the CLI UX so policy is easy to discover and visualize.

Highlights:
- Shared runtime: `shared/policy.ts` (single source of truth) with re-exports from `server/types/policy.ts`.
- CLI bridge: `policy-runtime.ts` loads `dist/shared/policy.js` via `createRequire`; `precreate` script builds the artifact before `create`.
- UX: New `/policy show` and `/resource show`; policy bars now render beneath resources during Action phase; `help` lists usage and dimensions.

Quick usage:
```
/policy {"privacy": 80}
/policy {"privacy": {"value": 80, "description": "Protect users"}}
/policy show
/resource show
```

## ✅ Completed Implementation

### 1. Backend (Server) - WORKING ✓

**Location:** `server/types/policy.ts` (enum-free module for cross-package compatibility)

**Architecture:**
- **Interface-based design** (not enum) to avoid TypeScript enum compatibility issues with Node's ESM loader
- **PolicyDimensionConfig interface:** Each dimension has `key`, `description`, `defaultValue`
- **6 Policy Dimensions:** PRIVACY, SECURITY, TRANSPARENCY, ACCOUNTABILITY, INNOVATION, REGULATION
- **PolicyManager functions:** Centralized CRUD operations
  - `createDefaultPolicy()` - Deep clones template
  - `updatePolicyStance()` - Validates and updates with range checking
  - `getPolicyStance()` - Safe getter
  - `validatePolicy()` - Full validation

**PolicyHandler** (`server/rooms/handlers/PolicyHandler.ts`):
- Handles `update_policy` messages from clients
- Validates policy updates using centralized PolicyManager
- Supports partial updates (only send dimensions you want to change)
- Broadcasts `policy_updated` to all clients (public visibility)
- Initializes default policy if player doesn't have one

**Message Schema** (`shared/messages.ts`):
```typescript
export const UpdatePolicySchema = z.object({
    stances: z.record(
        z.enum(policyDimensionKeys),
        z.object({
            value: z.number().min(-100).max(100),
            description: z.string().optional(),
        })
    ),
});
```

**GameRoom Integration** (`server/rooms/GameRoom.ts`):
- PolicyHandler instantiated and wired to `update_policy` message

**Data Flow:**
```
Client → update_policy message → GameRoom → PolicyHandler
→ updatePolicyStance() → Core state update → Broadcast policy_updated
```

### 2. CLI Commands - IMPLEMENTED (but blocked by import issue)

**PolicyCommand** (`packages/cli/src/commands/PolicyCommand.ts`):
- `/policy <JSON>` command
- Supports simple format: `/policy {"privacy": 80, "security": -50}`
- Supports complex format: `/policy {"privacy": {"value": 80, "description": "Protect user data"}}`
- Uses centralized validator

**CommandValidators** (`packages/cli/src/commands/CommandValidators.ts`):
- `validatePolicyInput()` - Parses JSON, validates dimensions and values
- Uses centralized PolicyManager for validation (no duplication)

**Message Listeners** (packages/cli/src/index.ts):
- Handles `policy_updated` broadcasts
- Displays policy changes with stance values

## 🔴 Current Blocker: CLI Import Issue

### Problem

**Error:**
```
SyntaxError: The requested module '../../../../server/types/policy.js'
does not provide an export named 'ALL_POLICY_DIMENSIONS'
```

The CLI cannot import policy utilities from `server/types/policy.ts` when running tsx from `packages/cli/` directory.

### Root Cause

**TypeScript enum incompatibility with Node.js ESM:**
1. Originally, `server/types/core.ts` had TypeScript enums (`RoleName`, `GamePhase`)
2. Node v24.0.2's native TypeScript support in strip-only mode **doesn't support enums**
3. When any module tries to import from `server/types/core.ts`, Node fails with:
   ```
   SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
   ```

**Module resolution issue:**
4. We created `server/types/policy.ts` (enum-free) to isolate policy code
5. When running tsx from root directory: imports work fine
6. When running tsx from `packages/cli/` directory: tsx can't resolve the module exports correctly
7. The relative path `../../../../server/types/policy.js` resolves differently depending on where tsx is running from

### Why Resources Works But Policy Doesn't

**Resources (CP3)** works because:
- CLI uses duck typing: `{ material: number; institutional: number; narrative: number }`
- No runtime imports needed
- Only needs type shape, not actual values

**Policy (CP4)** doesn't work because:
- CLI needs runtime values: `ALL_POLICY_DIMENSIONS` array, `updatePolicyStance()` function
- Must import these from shared code
- Hits module resolution issues

## 🔬 What We've Tried

### Attempt 1: Re-export through shared/messages.ts
**Goal:** Have `shared/messages.ts` import from `policy.ts` and re-export
**Result:** Same error - tsx still can't resolve the export when running from CLI directory

### Attempt 2: Convert enum to interface-based approach
**Goal:** Remove TypeScript enums to avoid Node ESM issues
**Result:** Created `server/types/policy.ts` with interface-based design (no enums), but module resolution still broken when running from CLI directory

### Attempt 3: Change import extension from .ts to .js
**Goal:** Follow ESM convention of using .js extension for TypeScript files
**Result:** Same error - issue is module resolution, not file extension

### Attempt 4: Direct import from policy.ts (bypassing shared/messages.ts)
**Goal:** Skip the re-export layer
**Result:** Same error

**Tests that worked:**
```bash
# From root directory - WORKS ✓
cd /home/bhishma/Documents/code/ai-risk-ttx-simulacra_v1
npx tsx -e "import { ALL_POLICY_DIMENSIONS } from './server/types/policy.ts'; console.log(ALL_POLICY_DIMENSIONS.map(d => d.key));"
# Output: ['privacy', 'security', 'transparency', 'accountability', 'innovation', 'regulation']

# From CLI directory - FAILS ✗
cd packages/cli && pnpm run create
# Error: does not provide an export named 'ALL_POLICY_DIMENSIONS'
```

## 📋 Architecture Diagram

**Current Module Structure:**
```
server/types/
├── policy.ts          # Enum-free policy utilities (source of truth)
│   ├── PolicyDimensionConfig interface
│   ├── PRIVACY, SECURITY, ... (const objects)
│   ├── ALL_POLICY_DIMENSIONS (array)
│   ├── POLICY_DIMENSION_MAP (lookup)
│   └── PolicyManager functions
│
└── core.ts            # Main types (has enums: RoleName, GamePhase)
    └── Re-exports from policy.ts

shared/messages.ts     # Message schemas
├── Imports from policy.ts
└── UpdatePolicySchema (Zod validation)

packages/cli/src/commands/
├── CommandValidators.ts   # Tries to import from policy.ts - FAILS
└── PolicyCommand.ts       # Tries to import from policy.ts - FAILS
```

## 🎯 Next Steps / Potential Solutions

### Option 1: Build Step for CLI
**Approach:** Transpile server code to JS before CLI imports it
**Pros:** Standard approach for monorepos
**Cons:** Adds build complexity, need to manage build artifacts

### Option 2: Copy Policy Constants to CLI Package
**Approach:** Duplicate `ALL_POLICY_DIMENSIONS` in CLI codebase
**Pros:** Simple, avoids import issues
**Cons:** Violates DRY principle, creates maintenance burden

### Option 3: Use pnpm Workspace Aliases
**Approach:** Configure pnpm workspace to resolve `@simulacra/server` package
**Pros:** Proper monorepo solution
**Cons:** Requires package.json restructuring

### Option 4: Generate Policy Constants at Build Time
**Approach:** Code generation script that writes CLI-specific policy file
**Pros:** Maintains single source of truth
**Cons:** Adds build step

### Option 5: Inline Policy Definitions in shared/
**Approach:** Move ALL_POLICY_DIMENSIONS to a pure JS file in shared/
**Pros:** Avoids TypeScript ESM issues
**Cons:** Loses type safety at definition site

## ✅ Proposed Fix Plan (Minimal unblock first, then harden)

This plan follows the v1 CLI‑first strategy in integration-plan-v2 and keeps a single source of truth for policy while avoiding new build steps.

### Phase 1 — Minimal Unblock (15–20 min)

Goal: Fix the CLI import error without changing architecture.

- Standardize ESM import extensions to `.ts` where we consume TypeScript directly under `tsx`.
  - packages/cli/src/commands/PolicyCommand.ts
    - From: `../../../../server/types/policy.js`
    - To:   `../../../../server/types/policy.ts`
  - packages/cli/src/commands/CommandValidators.ts
    - From: `../../../../server/types/policy.js`
    - To:   `../../../../server/types/policy.ts`
  - server/types/core.ts (re‑exports)
    - From: `./policy.js`
    - To:   `./policy.ts`

Why this works:
- `tsx` transpiles TypeScript on the fly and resolves `.ts` specifiers correctly even across package boundaries.
- We avoid importing through `shared/messages.ts` from the CLI, which would require `zod` as a transitive dependency in the CLI package.

Smoke test (should pass):
```bash
# From repo root
npx tsx -e "import { ALL_POLICY_DIMENSIONS } from './server/types/policy.ts'; console.log(ALL_POLICY_DIMENSIONS.map(d => d.key))"

# From CLI package (this previously failed)
cd packages/cli
npx tsx -e "import { ALL_POLICY_DIMENSIONS } from '../../server/types/policy.ts'; console.log(ALL_POLICY_DIMENSIONS.map(d => d.key))"
```

Acceptance for Phase 1:
- CLI runs `pnpm run create` without the `does not provide an export` error.
- `/policy {"privacy": 80}` succeeds and emits `policy_updated` to all clients.

### Phase 2 — Harden Imports via a Shared Runtime Module (45–60 min)

Goal: Remove cross‑package imports from `packages/cli` → `server/*` and keep DRY.

- Create `shared/policy.ts` containing runtime‑only policy utilities (copied/moved from `server/types/policy.ts`). No `zod` or server‑only dependencies.
- Update imports:
  - `shared/messages.ts`: import from `./policy.ts` instead of `../server/types/policy.ts`.
  - `server/types/policy.ts`: re‑export from `../../shared/policy.ts` to avoid churn in existing server imports.
  - CLI: import `ALL_POLICY_DIMENSIONS`, `createDefaultPolicy`, `updatePolicyStance` from `../../../../shared/policy.ts`.

Benefits:
- Single source of truth in `shared/` aligned with v1 “strangle the old” approach.
- CLI no longer depends on any server code paths.
- Keeps CLI free of `zod` by avoiding `shared/messages.ts` at runtime.

### Phase 3 — Optional DX polish (30–45 min)

Nice‑to‑have, non‑blocking improvements:
- Add a workspace import alias to simplify call sites:
  - Root `tsconfig.json` and CLI local config: `"paths": { "@sim/policy": ["./shared/policy.ts"] }`
  - Replace deep relatives with `import { ... } from '@sim/policy'`.
- Add a tiny `packages/cli/tsconfig.json` to pin `moduleResolution: "nodeNext"` for consistent resolution when running from subpackages.

## 🛠️ Concrete Diffs (Phase 1)

Apply these minimal edits to unblock:

- server/types/core.ts
  - Change `from './policy.js'` → `from './policy.ts'` (both the `export type` block and the named exports block).
- packages/cli/src/commands/PolicyCommand.ts
  - Change `from '../../../../server/types/policy.js'` → `from '../../../../server/types/policy.ts'`.
- packages/cli/src/commands/CommandValidators.ts
  - Change `from '../../../../server/types/policy.js'` → `from '../../../../server/types/policy.ts'`.

No other behavior changes.

## 🧪 Validation Checklist (update of the list above)

- [ ] `npx tsx -e` one‑liners succeed from both repo root and `packages/cli/`.
- [ ] `pnpm -w run dev:colyseus` starts server; `pnpm --filter @simulacra/cli run create` connects.
- [ ] `/policy {"privacy": 80}` updates and logs broadcast in all clients.
- [ ] Invalid keys rejected; out‑of‑range values rejected.
- [ ] Partial updates merge correctly; descriptions preserved if omitted.
- [ ] No new dependency warnings in CLI (no `zod` required).

## 📉 Risk / Rollback

- Low risk: Phase 1 only changes import specifiers; behavior untouched. Rollback is a 1‑line revert per file.
- Phase 2 moves code to `shared/`; we preserve a shim re‑export in `server/types/policy.ts` to avoid widespread refactors.

## 🔚 Decision

- Proceed with Phase 1 immediately to unblock CP4.
- Schedule Phase 2 right after validation, keeping CI green. Phase 3 is optional polish.

## 📦 Testing Checklist (Resolved)

- [x] CLI starts without import errors
- [x] `/policy {"privacy": 80}` - simple format works
- [x] `/policy {"privacy": {"value": 80, "description": "test"}}` - complex format works
- [x] Invalid dimension keys rejected
- [x] Values outside [-100, 100] rejected
- [x] `policy_updated` broadcasts received by all clients
- [x] Server builds successfully
- [x] PolicyHandler correctly initializes missing policies
- [x] Partial updates work (only update specified dimensions)
- [x] `/policy show` renders bars
- [x] `/resource show` renders bars

## 🔗 Related Files

**Backend:**
- `server/types/policy.ts` - Policy utilities (enum-free)
- `server/types/core.ts` - Re-exports policy types
- `server/rooms/handlers/PolicyHandler.ts` - Message handler
- `server/rooms/GameRoom.ts` - Integration
- `shared/messages.ts` - Message schema

**CLI:**
- `packages/cli/src/commands/PolicyCommand.ts` - /policy command
- `packages/cli/src/commands/CommandValidators.ts` - validatePolicyInput()
- `packages/cli/src/index.ts` - Message listeners (lines 57-66, 122-131, 182-191)

## 📝 Notes

- **No type scattering:** Policy code is centralized in `server/types/policy.ts`
- **Interface-based design:** Avoids enum compatibility issues (except for module resolution)
- **Public visibility:** All policy changes broadcast to all clients (MVP - no per-opponent overrides yet)
- **Partial updates:** Clients only send dimensions they want to change
- **Description optional:** Can update just value, or value + description

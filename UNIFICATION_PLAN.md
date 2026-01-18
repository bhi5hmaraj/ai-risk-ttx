# Simulacra Unification Plan

> A phased approach to merge three diverged branches into a clean, unified `simulacra` repository.

## Executive Summary

Three branches have evolved independently with distinct capabilities:
- **feat/stein-multiplayer**: Production-grade multiplayer infrastructure
- **feat/nextjs-migration**: Polished UI/UX with AI-powered scenario builder
- **simulacra_v1**: Advanced game mechanics (Resources, Policy, Intent systems)

This document outlines a strategy to unify all features into a new `simulacra` repository while eliminating dead code accumulated from past migrations.

---

## Branch Audit Summary

### 1. feat/stein-multiplayer (RECOMMENDED BASE)

| Category | Details |
|----------|---------|
| **Files** | 245 TypeScript/TSX, 228 tests, 1,425+ docs |
| **Package Manager** | pnpm |
| **Framework** | Next.js 15 App Router |
| **Multiplayer** | Colyseus WebSocket with room codes |
| **Infrastructure** | Cloud Run + Terraform + Cloud Build |
| **Secrets** | Infisical integration |
| **Database** | PostgreSQL + Prisma + Redis (Upstash) |
| **State** | Zustand stores + Colyseus Schema sync |

**Unique Features:**
- Full Colyseus multiplayer with dynamic room codes
- Server-authoritative game state with Handler pattern
- `StateManager` + `StateAdapter` for clean state separation
- `SeatRegistry` for role assignment
- Cloud Run deployment with multi-container setup
- Redis-backed session persistence
- Comprehensive test suite (228 files)
- Extensive architecture documentation

### 2. feat/nextjs-migration

| Category | Details |
|----------|---------|
| **Files** | ~205 TypeScript/TSX |
| **Package Manager** | pnpm |
| **Framework** | Next.js 15 App Router |
| **Auth** | Clerk (OAuth + email allowlist) |
| **AI Builder** | CopilotKit "The Architect" |
| **Styling** | Matrix-inspired theme with tokens |

**Unique Features:**
- **CopilotKit Integration**: AI-powered scenario builder with:
  - Zod-driven dynamic form generation
  - Field locks and comments
  - Live preview panel
  - Mobile bottom-sheet variant
  - Resizable sticky right rail
- **Clerk Authentication**: Full OAuth with admin role protection
- **Community Features**:
  - Scenario library with anonymous voting
  - Admin moderation dashboard
  - Submission workflow (pending → approved/rejected)
- **UI Polish**:
  - Matrix-inspired dark theme (emerald #2ea043)
  - CSS tokens system (`styles/tokens.css`)
  - `LandscapeOnly` immersion component
  - Collapsible Event Log with chevron
  - `ky` HTTP client with retry logic
  - Dismissible error banners

### 3. simulacra_v1

| Category | Details |
|----------|---------|
| **Files** | 272 TypeScript/TSX, 33 tests |
| **Package Manager** | pnpm |
| **Framework** | Next.js 15 App Router |
| **Multiplayer** | Colyseus (aligned with stein) |

**Unique Features:**
- **CP3 Resources System**: Three-dimensional resource tracking
  ```typescript
  interface Resources {
    material: number;      // M: Money, compute, physical assets
    institutional: number; // I: Authority, legal power, access
    narrative: number;     // N: Public trust, media influence
  }
  ```
- **CP4 Policy System**: Strategic policy with 6 dimensions
  - Privacy, Security, Transparency
  - Accountability, Innovation, Regulation
  - Values in range [-100, +100]
- **CP5 Intent System**: Action prediction with effects
  ```typescript
  interface Intent {
    id: string;
    source: string;        // Player who can execute
    target: string;        // Target entity
    cost: number;          // Action points (1-3)
    deltas: IntentDeltas;  // Predicted M/I/N and core metric changes
    risk: 'low' | 'medium' | 'high';
  }
  ```
- Player `resources` field on Player interface
- Player `policy` field on Player interface

---

## Feature Unification Matrix

| Feature | stein | nextjs | v1 | Target |
|---------|:-----:|:------:|:--:|:------:|
| Colyseus Multiplayer | ✅ Best | ❌ | ✅ | stein |
| Handler Pattern (GameRoom) | ✅ | ❌ | ✅ | stein |
| Cloud Run + Terraform | ✅ | ❌ | ❌ | stein |
| Infisical Secrets | ✅ | ❌ | ❌ | stein |
| Redis Session Store | ✅ | ⚠️ Partial | ❌ | stein |
| CopilotKit Builder | ❌ | ✅ | ❌ | nextjs |
| Clerk Authentication | ❌ | ✅ | ❌ | nextjs |
| Community Scenarios | ⚠️ Basic | ✅ Full | ❌ | nextjs |
| Admin Dashboard | ⚠️ Basic | ✅ Full | ❌ | nextjs |
| Matrix UI Theme | ⚠️ Basic | ✅ Polish | ❌ | nextjs |
| CSS Tokens System | ❌ | ✅ | ❌ | nextjs |
| CP3 Resources (M/I/N) | ❌ | ❌ | ✅ | v1 |
| CP4 Policy System | ❌ | ❌ | ✅ | v1 |
| CP5 Intent System | ❌ | ❌ | ✅ | v1 |
| Test Coverage | ✅ 228 | ⚠️ 30+ | ⚠️ 33 | stein |

---

## Dead Code Inventory

### HIGH PRIORITY - Delete Immediately

| File | Branch | Reason |
|------|--------|--------|
| `hooks/useColyseusRoom.ts` | stein | Deprecated, replaced by ColyseusProvider |
| `services/websocketService.ts` | stein | Unused, predates Colyseus |
| `tests/hooks.useGameController.sse-progress.test.ts` | stein | Skipped test for deprecated SSE |
| `.next/cache/webpack/*.old` | all | Build cache artifacts |

### MEDIUM PRIORITY - Delete After Migration

| File | Branch | Reason |
|------|--------|--------|
| `hooks/useGameActions.ts` | stein | Legacy HTTP/SSE, replaced by useGameActionsColyseus |
| `tests/hooks.useGameActions.backend-mode.test.ts` | stein | Tests deprecated hook |
| `app/api/session/[[...parts]]/route.ts` | stein | Deprecated SSE API (marked TODO) |
| `server/api/session-router.ts` | stein | Part of deprecated session stack |
| `server/stores/sessionStore.memory.ts` | stein | Deprecated store |
| `server/stores/sessionStore.redis.ts` | stein | Deprecated store |
| `server/stores/sessionStore.redis.integration.test.ts` | stein | Tests deprecated store |

### LOW PRIORITY - Consolidate

| Files | Branch | Action |
|-------|--------|--------|
| `services/geminiService.ts` vs `services/llmApiClient.ts` | all | Consolidate duplicate LLM services |
| `services/SessionService.ts` | stein | Remove wrapper, use sessionClient directly |
| `services/GameService.ts` | stein | Review thin wrapper necessity |
| `server/rooms/adapters/*.md` (8 files) | stein | Consolidate into single README |
| `TODO.md` files | all | Migrate to Beads system |
| `MIGRATION_STATUS.md` | all | Archive after unification |

### Documentation Cleanup

- 1,425+ markdown files in stein `docs/` - audit for relevance
- Multiple duplicate PRD files across branches
- Redundant adapter documentation (4,125 lines across 8 files)

---

## Phased Unification Plan

### Phase 0: Preparation (Before New Repo)

**Objective**: Prepare stein-multiplayer as the base

1. **Clean Dead Code from stein**
   ```bash
   # Delete immediately
   rm hooks/useColyseusRoom.ts
   rm services/websocketService.ts
   rm tests/hooks.useGameController.sse-progress.test.ts
   rm -rf .next/cache/webpack/*.old

   # Delete deprecated session stack
   rm hooks/useGameActions.ts
   rm tests/hooks.useGameActions.backend-mode.test.ts
   rm app/api/session/\[\[...parts\]\]/route.ts
   rm server/api/session-router.ts
   rm server/stores/sessionStore.memory.ts
   rm server/stores/sessionStore.redis.ts
   rm server/stores/sessionStore.redis.integration.test.ts
   ```

2. **Consolidate LLM Services**
   - Audit `geminiService.ts` vs `llmApiClient.ts`
   - Keep one, remove duplicate
   - Update all imports

3. **Archive Redundant Docs**
   - Move old migration docs to `docs/archive/`
   - Consolidate adapter docs to single file

4. **Verify Tests Pass**
   ```bash
   pnpm test
   pnpm build
   ```

### Phase 1: Copy to Simulacra Repository

**Objective**: Copy cleaned stein base to new simulacra repo

**Target Repository**:
- Path: `/home/bhishma/Documents/code/simulacra-cc/simulacra`
- Remote: `git@github.com:Simulacra-cc/simulacra.git`

```bash
# Navigate to target
cd /home/bhishma/Documents/code/simulacra-cc/simulacra

# Copy cleaned stein codebase (excluding .git)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' \
  /home/bhishma/Documents/code/ai-risk-ttx-stein/ .

# Install dependencies
pnpm install

# Verify build
pnpm build

# Commit
git add -A
git commit -m "feat: initialize simulacra from stein-multiplayer base

- Full Colyseus multiplayer with room codes
- Cloud Run + Terraform infrastructure
- Handler pattern for game logic
- 228 test files
- Cleaned deprecated code"

git push origin main
```

### Phase 2: Integrate UI/UX from nextjs-migration

**Objective**: Port polished UI and CopilotKit

**2.1 CSS Tokens System**
```bash
# Copy from nextjs-migration
cp ../ai-risk-ttx-nextjs/styles/tokens.css styles/
cp ../ai-risk-ttx-nextjs/tailwind.config.ts .
```

Files to port:
- `styles/tokens.css` - CSS custom properties
- `tailwind.config.ts` - Updated theme config
- `app/globals.css` - Global styles

**2.2 UI Components**
```bash
# Copy polished components
cp ../ai-risk-ttx-nextjs/components/ui/LandscapeOnly.tsx components/ui/
cp ../ai-risk-ttx-nextjs/components/ui/MatrixBackground.tsx components/ui/
cp ../ai-risk-ttx-nextjs/components/Navigation.tsx components/
```

Files to port:
- `components/ui/LandscapeOnly.tsx`
- `components/ui/MatrixBackground.tsx`
- `components/Navigation.tsx` (merge with existing)
- `components/game/EventLog.tsx` (collapsible version)
- `components/game/FeedbackBanner.tsx`
- `components/game/StatusBar.tsx` (improved)

**2.3 CopilotKit Integration**

```bash
# Install dependencies
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

# Copy CopilotKit components
cp -r ../ai-risk-ttx-nextjs/components/copilot components/
cp -r ../ai-risk-ttx-nextjs/components/custom-scenario components/
cp ../ai-risk-ttx-nextjs/copilot/instructions.ts copilot/
cp ../ai-risk-ttx-nextjs/app/api/copilotkit/route.ts app/api/copilotkit/
cp ../ai-risk-ttx-nextjs/hooks/useScenarioCopilot.tsx hooks/
```

Files to port:
- `components/copilot/*` (adapter, MobileBottomSheet, ErrorRenderer)
- `components/custom-scenario/*` (ScenarioForm, CopilotRightRail, etc.)
- `copilot/instructions.ts`
- `app/api/copilotkit/route.ts`
- `hooks/useScenarioCopilot.tsx`

**2.4 Clerk Authentication**

```bash
# Install Clerk
pnpm add @clerk/nextjs

# Copy Clerk integration
cp ../ai-risk-ttx-nextjs/middleware.ts .
cp ../ai-risk-ttx-nextjs/app/login/page.tsx app/login/
cp ../ai-risk-ttx-nextjs/server/lib/adminAuth.ts server/lib/
cp ../ai-risk-ttx-nextjs/server/lib/adminAccess.ts server/lib/
```

Files to port:
- `middleware.ts`
- `app/login/page.tsx`
- `server/lib/adminAuth.ts`
- `server/lib/adminAccess.ts`
- Update `app/layout.tsx` with ClerkProvider

**2.5 HTTP Client Upgrade**

```bash
pnpm add ky

# Copy http client
cp ../ai-risk-ttx-nextjs/services/http.ts services/
```

Update `services/sessionClient.ts` to use ky with retry logic.

**2.6 Verification**
```bash
pnpm test
pnpm build
# Manual test: CopilotKit scenario builder
# Manual test: Clerk login flow
```

### Phase 3: Integrate Game Mechanics from simulacra_v1

**Objective**: Add CP3/CP4/CP5 systems

**3.1 Policy System (CP4)**

```bash
# Copy shared policy module
cp ../ai-risk-ttx-simulacra_v1/shared/policy.ts shared/
```

Files to port:
- `shared/policy.ts` - Policy dimensions and utilities

**3.2 Core Types Update**

Merge `types/core.ts` and `server/types/core.ts` to include:

```typescript
// Add to Player interface
export interface Player {
  // ... existing fields ...
  resources: Resources;        // CP3
  policy?: Policy;             // CP4
}

// Add Resources interface
export interface Resources {
  material: number;
  institutional: number;
  narrative: number;
}

// Add Intent interface
export interface Intent {
  id: string;
  source: string;
  target: string;
  cost: number;
  deltas: IntentDeltas;
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

// Add StakeholderData.initialResources
export interface StakeholderData {
  // ... existing fields ...
  initialResources?: Resources;
}
```

**3.3 Colyseus Schema Update**

Update `server/rooms/schema/GameState.ts`:

```typescript
export class Player extends Schema {
  // ... existing fields ...
  @type("number") material: number = 50;
  @type("number") institutional: number = 50;
  @type("number") narrative: number = 50;
}
```

**3.4 LLM Prompt Updates**

Update `prompts.ts` to incorporate:
- Resources in action generation context
- Policy considerations in AI decision-making
- Intent-based action effects

**3.5 UI Components for Resources**

Create new components:
- `components/game/ResourcesDisplay.tsx` - M/I/N visualization
- `components/game/PolicyEditor.tsx` - Policy stance editor (optional)

**3.6 Game Logic Updates**

Update `lib/gameLogic.ts` and `server/services/sessionEngine.ts`:
- Apply resource changes from actions
- Track policy implications
- Process intent deltas

**3.7 Verification**
```bash
pnpm test
pnpm build
# Manual test: Resources display in game
# Manual test: Action effects on M/I/N
```

### Phase 4: Infrastructure Finalization

**Objective**: Clean deployment setup

**4.1 Environment Variables**

Create unified `.env.example`:
```bash
# Database
DATABASE_URL="postgresql://..."

# LLM
LITELLM_API_KEY="..."
LITELLM_BASE_URL="https://..."
LLM_MODEL="gpt-4o-mini"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."

# CopilotKit
COPILOT_CLOUD_API_KEY="..."  # optional

# Infisical
INFISICAL_TOKEN="..."
INFISICAL_PROJECT_ID="..."

# Redis (optional)
REDIS_URL="..."

# Deployment
NEXT_PUBLIC_APP_URL="https://simulacra.cc"
```

**4.2 Docker Cleanup**

Review and consolidate:
- `Dockerfile.colyseus`
- `Dockerfile.nextjs`
- `docker-compose.yml`

**4.3 Terraform Update**

Update `infra/` for simulacra naming:
- Cloud Run service names
- Secret names
- DNS entries

**4.4 CI/CD Pipeline**

Update `cloudbuild.*.yaml`:
- New repo references
- Updated deployment targets

### Phase 5: Documentation & Cleanup

**Objective**: Clean documentation

**5.1 Update Core Docs**
- `README.md` - New project overview
- `CLAUDE.md` - Updated instructions
- Delete `MIGRATION_STATUS.md`
- Delete `UNIFICATION_PLAN.md` (this file, after completion)

**5.2 Archive Old Docs**
```bash
mkdir docs/archive
mv docs/multiplayer/*.md docs/archive/  # Keep only current
mv docs/postmortems docs/archive/
```

**5.3 Beads Migration**
- Import remaining TODOs from markdown files
- Delete `TODO.md` files
- Update Beads database

**5.4 Final Verification**
```bash
pnpm test
pnpm build
pnpm lint
pnpm type-check

# Deploy to preview
vercel --prod
```

---

## Risk Mitigation

### Git Strategy

```bash
# Create feature branch for each phase
git checkout -b phase-2/ui-integration
# ... make changes ...
git checkout main
git merge --no-ff phase-2/ui-integration

# Tag releases
git tag -a v1.0.0-alpha -m "Phase 1 complete"
```

### Rollback Plan

Each phase creates a tagged checkpoint:
- `v0.1.0` - Clean stein base
- `v0.2.0` - UI/UX integrated
- `v0.3.0` - Game mechanics integrated
- `v1.0.0` - Production ready

### Testing Strategy

Before each phase merge:
1. All tests pass (`pnpm test`)
2. Build succeeds (`pnpm build`)
3. Type check passes (`pnpm type-check`)
4. Manual smoke test key features:
   - Multiplayer room join/leave
   - Game flow (lobby → action → consequence → end)
   - CopilotKit scenario builder (Phase 2+)
   - Resources display (Phase 3+)

---

## Timeline Estimate

| Phase | Description | Complexity |
|-------|-------------|------------|
| 0 | Preparation & cleanup | Low |
| 1 | Create simulacra repo | Low |
| 2 | UI/UX + CopilotKit + Clerk | Medium-High |
| 3 | Game mechanics (CP3/4/5) | High |
| 4 | Infrastructure finalization | Medium |
| 5 | Documentation & cleanup | Low |

**Recommended Sequence**: Phase 0 → 1 → 2 → 4 → 3 → 5

Reason: Get deployment working with new UI before adding complex game mechanics.

---

## Success Criteria

- [ ] Single unified codebase in `simulacra` repo
- [ ] All Colyseus multiplayer features working
- [ ] CopilotKit scenario builder functional
- [ ] Clerk authentication integrated
- [ ] CP3 Resources displayed in game UI
- [ ] All tests passing (target: 200+)
- [ ] Production deployment successful
- [ ] No dead code from legacy migrations
- [ ] Documentation up to date

---

## Appendix: Files to Delete Summary

```bash
# Stein - delete immediately
hooks/useColyseusRoom.ts
services/websocketService.ts
tests/hooks.useGameController.sse-progress.test.ts

# Stein - delete after verifying replacements
hooks/useGameActions.ts
tests/hooks.useGameActions.backend-mode.test.ts
app/api/session/[[...parts]]/route.ts
server/api/session-router.ts
server/stores/sessionStore.memory.ts
server/stores/sessionStore.redis.ts
server/stores/sessionStore.redis.integration.test.ts

# All branches - after migration
TODO.md
MIGRATION_STATUS.md
```

## Appendix: New Dependencies

```json
{
  "@clerk/nextjs": "^6.35.1",
  "@copilotkit/react-core": "^1.10.6",
  "@copilotkit/react-ui": "^1.10.6",
  "@copilotkit/runtime": "^1.10.6",
  "ky": "^1.4.0"
}
```

---

*Document created: 2026-01-17*
*Last updated: 2026-01-17*

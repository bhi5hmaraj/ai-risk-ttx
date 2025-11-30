# Codebase Cleanup — MVP Plan

Status: Draft
Owner: Platform/Multiplayer
Date: 2025‑11‑28

## Problem (TL;DR)
- Frontend and backend concerns are interleaved; legacy SSE/HTTP paths coexist with Colyseus.
- Duplicate hooks/providers; dead code paths create confusion and regressions.
- Import boundaries are not enforced, risking server code leaking into client bundles.

## Guiding Principles (MVP)
- Don’t big‑bang move files. Contain cleanup to surgical, low‑risk changes.
- Single authoritative backend: Colyseus + Express for all game state and routes.
- Next is presentation only (SSR initial snapshot + hydration to WS).
- Thin client: never drives transitions; only emits intents.
- Enforce boundaries via lint + tsconfig to keep it clean going forward.

## Target Boundaries
- UI (Next): `app/`, `components/`, `providers/`, `hooks/`, `stores/`
- Game Backend (Colyseus+Express): `server/` (rooms, services, types)
- Shared, UI‑safe contracts: `shared/` and `types/` (no Node‑only deps)

## Allowed Imports (Matrix)
- UI → Shared: allowed
- UI → Server: disallowed (enforce via ESLint boundaries)
- Server → Shared: allowed
- Server → UI: disallowed

## Enforcements (add in follow‑up PRs)
- ESLint “boundaries” rule:
  - Disallow `@/server/**` from `app/**`, `components/**`, `hooks/**`, `providers/**`.
- TS path guards:
  - `tsconfig.json` path aliases: `"@/server/*": ["server/*"]`, `"@/shared/*": ["shared/*"]`.
  - Add a `types`/`shared` package area with no Node imports.

## MVP Cleanup Scope (What we change now)
1) Kill legacy session/SSE path (5 SP)
- Remove/disable Next API handler: `app/api/session/[[...parts]]/route.ts`.
- Remove `server/stores/sessionStore.*` and `server/api/session-router.*` once snapshot endpoint exists.
- Replace any usages with Colyseus flows (already in progress).

2) Consolidate to a single Colyseus client (3 SP)
- Remove `hooks/useColyseusRoom.ts` (duplicative of `providers/ColyseusProvider.tsx`).
- Remove the old `hooks/useGameActions.ts` once all imports use `useGameActionsColyseus`.

3) Server‑side source of truth + SSR snapshot (7 SP)
- Implement `GET /games/:gameId/snapshot` on Express side and SSR consumption in `app/game/[gameId]/page.tsx`.
- Add `eventSeq`, `stateVersion`, `deadlineAt` to payload.

4) Remove client‑driven advance (3 SP)
- Delete `advanceRound` exposure and the `all_submitted → advance_round` client handler.
- Server auto‑advance on all‑submitted; timers handle timeout NoOp.

5) Timers & NoOp (4 SP)
- Use `room.clock.setTimeout` for ACTION deadlines, mark missing humans as NoOp, advance.

6) Dead Code & Folder Hygiene (3 SP)
- Delete unused helper modules and mocks proven obsolete by ripgrep (list below).
- Keep a `DEPRECATED.md` in `eagx/` for anything temporarily parked.

Total MVP cleanup: ~22 SP (≈ 2–3 weeks solo; faster with 2 devs)

## Dead Code & High‑Confidence Deletions (after SSR snapshot lands)
- Next SSE path:
  - `app/api/session/[[...parts]]/route.ts`
  - `server/api/session-router.ts` (+ tests)
  - `server/stores/sessionStore.memory.ts`, `.redis.ts`, `.test.ts`
- Duplicate/legacy hooks:
  - `hooks/useColyseusRoom.ts`
  - `hooks/useGameActions.ts` (migrate remaining imports to `useGameActionsColyseus`)
- Client advance helpers:
  - Any FE reference to `advance_round` messages

## Keep (in use)
- `providers/ColyseusProvider.tsx`, `services/colyseusClient.ts`
- `server/rooms/**`, `server/services/**`, `server/types/**`

## Quick Audits (commands)
- Find stray SSE/EventSource:
  - `rg -n "SSE|EventSource|sessionStore"`
- Find old actions hook usages:
  - `rg -n "useGameActions\(\)" app hooks components`
- Find client advance paths:
  - `rg -n "advance_round" app providers hooks`
- Find server imports in client code:
  - `rg -n "@/server/" app components hooks providers`

## Incremental PR Plan
- PR1: Add snapshot endpoint (Express) and SSR `/game/[gameId]`; keep old code intact.
- PR2: Wire FE to snapshot; remove client `advance_round` and duplicate hooks.
- PR3: Add timers/NoOp; remove SSE path and session stores.
- PR4: Add lint + tsconfig boundaries; fix new violations.

## Risks
- Hidden dependencies on legacy hooks.
- Test fixtures referencing session router.
- Temporary confusion if both snapshot and SSE exist—gate deletions behind feature flags.

## Definition of Done (MVP Cleanup)
- Only Colyseus WS + Express HTTP are used for game data.
- No routes under `app/api/session/**`.
- No `advance_round` calls from the client.
- Lint and type checks enforce import boundaries.
- New developers can follow the boundaries doc to add features without crossing layers.

---

## Hygiene Checklist (Do This Now)

### 1) Static pass: kill the obviously dead stuff

- [ ] Turn on compiler hygiene in `tsconfig.json`:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
- [ ] Turn on lint hygiene:
  - `@typescript-eslint/no-unused-vars`
  - `import/no-unused-modules` (or equivalent)
- [ ] Run an unused export scanner (pick one):
  - `npx knip` or `npx ts-prune` or `npx unimported`
- Then:
  - [ ] Delete/archive files where all exports are unused
  - [ ] Mark suspicious modules (big, 0 refs) for review

### 2) Frontend: what actually runs when you play the game?

- [ ] Use Chrome Coverage
  1. Open app in Chrome
  2. DevTools → More tools → Coverage
  3. Record, then click through core flows
  4. Stop recording
- Then:
  - [ ] List FE files that are 0% or near‑0% executed
  - [ ] Cross‑check with static tools; move obvious zombies to `legacy/` or delete
- Optional:
  - [ ] Run test coverage (Vitest/Playwright) and inspect which FE files never hit

### 3) Backend: define and observe entrypoints

- [ ] Create `ENTRYPOINTS.md` with all server entrypoints:
  - Colyseus: `onCreate`, `onJoin`, `onLeave`, `onMessage('submit_action')`, etc.
  - HTTP routes, cron/queues/workers
- [ ] Add lightweight logging per entrypoint:
  ```ts
  logger.info('entrypoint_called', { name: 'roundAdvance', roomId });
  ```
- [ ] Play the game / run flows, then grep logs for never‑called entrypoints
- Optional:
  - [ ] Backend coverage run; list server files never hit

### 4) Cross‑cut: make “public vs internal” crystal clear

- [ ] Define “public entrypoints” (Next routes, Express routes, Colyseus room handlers, jobs)
- [ ] Treat everything else as internal
- When in doubt: if a file isn’t reachable from any entrypoint (static + coverage), delete or move to `legacy/`

### 5) Ongoing guardrails (so it doesn’t rot again)

- [ ] Add a “dead code” CI step (`knip`/`ts-prune`), fail or warn on new unused files/exports
- [ ] Keep naming honest:
  - Domain: `GameState`, `GameSetup`
  - Transport/View: `GameStateSchema`, `GameSetupForm`, `GameSetupDb`
- [ ] Re‑run coverage + static tools after big migrations

### Minimum viable cleanup (quick path)
1. Turn on TS/ESLint unused checks
2. Run `knip` (or similar) once and delete obvious junk
3. Use Chrome Coverage while you play the game and list untouched FE files
4. Add logging to critical backend entrypoints and see what never fires

# Answers: Perturbation Problem Set

1) Change Heartbeat Interval to 5s
- (B) `app/api/session/[[...parts]]/route.ts`
- Change `heartbeatInterval` from `15_000` to `5_000`.
- No (client ignores `ping`).

2) Add New Payload Type: `deadline`
- Must update: `server/stores/sessionStore.ts` (add `'deadline'` to `SessionEventType`), `app/api/session/[[...parts]]/route.ts` (call `emit('deadline', interimSnapshot, { until })` inside `createAdvanceState`), `components/SessionMonitor.tsx` (handle `payload.type === 'deadline'`).
- Emit inside advance flow (route’s `createAdvanceState`); client toggles UI based on `until` (e.g., show countdown), typically via existing UI or action stores.

3) Rename Stream Path `/stream` → `/events`
- Update all: `app/api/session/[[...parts]]/route.ts`, `components/SessionMonitor.tsx`, `services/SessionService.ts`, `hooks/useGameController.ts`.
- No (stores don’t depend on the HTTP path).

4) Restrict CORS for SSE
- Change `'Access-Control-Allow-Origin'` to your origin (e.g., `https://your.app`).
- Yes (same‑origin still works).

5) Single SSE Subscriber Enforcement
- (A) `hooks/useGameController.ts`.
- Ref: `sessionStreamRef` (and associated `useEffect` that binds `EventSource`).

6) Track Reconnect Attempts
- Store: `stores/sessionStore.ts` with `setSSEState`, `setSSEEvent`.
- Sequence: `connected` → (error) `error` → (reopen) `connecting` → `connected`.

7) Coalesce AI Progress (Only Emit Once After All AIs)
- Change in `app/api/session/[[...parts]]/route.ts`: remove per‑AI `emit('progress', ...)` inside the `map` and instead `emit('progress', snapshot, { stage: 'ai-turn-all' })` after `await Promise.all(...)`.
- Client impact: UI currently marks per‑role completion; either drop checkmarks or change to a single “AI turns complete” indicator in `SessionMonitor`.

8) Change Event Channel Name `session` → `message`
- Server frames in `app/api/session/[[...parts]]/route.ts` via `send('session', ...)`.
- Update listeners in: `components/SessionMonitor.tsx` and (if still present) `hooks/useGameController.ts`.

9) Enforce ETag on Action Submit
- Path: `services/sessionClient.ts`, function `submitActions(...)` sets `'If-Match'` header.
- No; SSE is push‑based and orthogonal to write ETags (ETag guards discrete writes).

10) Add Minimal Snapshot Gate on Client
- Place guard in `components/SessionMonitor.tsx`, inside `handleSessionEvent` after JSON parse.
- Before; only mark connected once a valid snapshot is confirmed.

11) Remove `Access-Control-Allow-Origin: *` Side‑Effect
- No, not strictly; JSON API endpoints may still work same‑origin, but cross‑origin clients would need separate CORS headers per endpoint if required.

12) Keep Revision Stable During ACTION
- File: `components/SessionMonitor.tsx` (logic that skips updating `sessionMeta.revision` when `phase === 2`). Avoids racing with user submits that use `If-Match` (keeps client’s expected revision stable until the submit response).


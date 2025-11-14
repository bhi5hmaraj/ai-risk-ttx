# Answer Key: Client–Server SSE

1) Initial Connect Flow
- Endpoint: `GET /api/session/:id/stream` handled by `streamSession` in `app/api/session/[[...parts]]/route.ts:133`.
- On start, server fetches the current snapshot and immediately sends `event: session` with `{ type: 'snapshot', snapshot }` (`route.ts:158-166`). This seeds the client state promptly on connect.

2) Client Handling on Snapshot/Advance
- Listener: `components/SessionMonitor.tsx:36-113` (`handleSessionEvent`).
- On any `session` event, it:
  - `setSSEState('connected')`, `setSSEEvent(eventType)` (`SessionMonitor.tsx:63-67`).
  - Updates `gameState` and `gameSetup` if present (`SessionMonitor.tsx:69-76`).
  - Merges `players` with server state, preserving FE icons and mapping by `id` or `role.name` (`SessionMonitor.tsx:84-111`).
  - For `{ type: 'advance' }`: clears AI completion flags, stops loading/spinners, clears action options, and marks start step as ready (`SessionMonitor.tsx:120-129`).

3) Revision Updates During ACTION Phase
- Code: `components/SessionMonitor.tsx:97-112`.
- Reason: Avoids revising `sessionMeta.revision` during ACTION (phase 2) to prevent conflicts with concurrent user submissions that rely on the client’s expected revision (`If-Match` on write). The submit response updates the revision authoritatively.

4) Heartbeat Semantics
- Server sends a heartbeat every `15_000ms` via `send('ping', { ts: Date.now() })` (`route.ts:185-190`).
- The client does not attach a handler for `ping` and therefore ignores it today (no-op).

5) Revision Monotonicity on Server
- Normal update (`update`): increments and emits `update` (`server/stores/sessionStore.memory.ts:47-74`).
- Submit actions (`submitActions`): increments and emits `update` (`sessionStore.memory.ts:76-103`).
- Advance (`advance`): increments and emits `advance` after running `advanceState` (`sessionStore.memory.ts:105-138`).

6) Subscription Lifecycle and Cleanup
- Store keeps `listeners: Map<sessionId, Set<subscriber>>` and returns an `unsubscribe` closure (`sessionStore.memory.ts:25, 115-137`).
- SSE route subscribes and holds `unsubscribe`. It also sets a heartbeat interval and an `AbortSignal` cleanup: on `abort`, clears the interval, calls `unsubscribe()`, and closes the controller (`route.ts:172-205`).

7) Event Types and Emitters
- Types: `'update' | 'advance' | 'progress'` (`server/stores/sessionStore.ts:22-24`).
- Emitters:
  - `update`: `update` and `submitActions` paths (`sessionStore.memory.ts:68, 100`).
  - `advance`: at end of `advance` (`sessionStore.memory.ts:133`).
  - `progress`: produced inside the long‑running `advanceState` via the provided `emit` callback (`app/api/session/[[...parts]]/route.ts:46-64, 100-131, 144-164`).

8) AI Progress Payload
- Server sends `emit('progress', interimSnapshot, { stage: 'ai-turn', playerId, role })` each time an AI finishes (`route.ts:112-131`).
- Client maps this to `updateAICompletion(role, true)` or `setAICompletionStatus` resets on advance (`components/SessionMonitor.tsx:114-121, 123-129`).

9) Error Handling on Client
- On `error`: marks `sseStatus.state = 'error'` with message, closes the source, and nulls the ref (`components/SessionMonitor.tsx:133-144`).
- Cleanup on unmount: removes listeners, closes source, sets `sseStatus.state = 'disconnected'` if it was the active source (`SessionMonitor.tsx:146-156`).

10) Duplicate Subscription Risk
- Locations: `components/SessionMonitor.tsx` and `hooks/useGameController.ts` (maintains its own `EventSource`; see `useEffect` blocks around `useGameController.ts:200+`).
- Risk: two parallel EventSources per session cause duplicated merges, flicker, and wasted network/LLM progress handling.
- Recommendation: Keep SSE solely in `SessionMonitor` (docs echo this) and remove the controller’s SSE effect.

11) Wire Format Example
```
event: progress
data: {"type":"progress","snapshot":{"id":"s1","revision":5},"payload":{"stage":"ai-turn","playerId":"p2","role":"Deputy"}}

```
This matches the server’s framing (`event:` then `data:` then a blank line), see `route.ts:160-167`.

12) Edge Runtime Implications
- Declared at `app/api/session/[[...parts]]/route.ts:11`.
- Uses Web standard `ReadableStream` and `TextEncoder` (`route.ts:13, 149`), which are available in Edge runtime. Upstash Redis compatibility and low‑latency streaming are also common reasons.

13) SSE Response Headers
- Set on response: `'Content-Type': 'text/event-stream'`, `'Cache-Control': 'no-cache, no-transform'`, `'Connection': 'keep-alive'`, `'Access-Control-Allow-Origin': '*'` (`route.ts:209-217`). CORS is effectively allowed (`*`).

14) ETags vs SSE
- ETags via `If-None-Match`/`If-Match` are used on discrete HTTP requests (`services/sessionClient.ts:26-36, 44-54, 60-82`) to avoid races and stale writes.
- SSE is a continuous push channel for snapshots and progress, not request/response. They complement each other: writes/checks via ETag; live updates via SSE.

15) Not‑Found on Stream Open
- The SSE handler enqueues `event: error` with `{ success:false, error:'Not Found' }` and immediately closes the stream when the snapshot is missing (`route.ts:152-166`).

Bonus) Heartbeat Alternative
- Server could enqueue comment frames (e.g., `: ping\n\n`) instead of `event: ping`. The current client doesn’t listen for `ping`, and would also ignore comment frames, so no client change required.


# Perturbation Problem Set: Objective, Hands‑On Changes

Instructions: For each scenario, answer the objective questions. Use exact file paths and indicate whether any additional components need updates. Keep answers concise (bullets or short sentences).

1) Change Heartbeat Interval to 5s
- Where to change the heartbeat interval value? Choose one: (A) `components/SessionMonitor.tsx` (B) `app/api/session/[[...parts]]/route.ts` (C) `services/sessionClient.ts`
- What’s the symbol/name you change?
- Do you need to update any client code for this change? Yes/No

2) Add New Payload Type: `deadline`
- You want to emit a `deadline` progress signal during `advanceState` (before the final advance) carrying `{ until: number }`.
- Mark all files that must be updated:
  - [ ] `server/stores/sessionStore.ts`
  - [ ] `server/stores/sessionStore.memory.ts`
  - [ ] `app/api/session/[[...parts]]/route.ts`
  - [ ] `components/SessionMonitor.tsx`
- Briefly state where the emit happens and how the client reacts.

3) Rename Stream Path `/stream` → `/events`
- Mark all code files that must change:
  - [ ] `app/api/session/[[...parts]]/route.ts`
  - [ ] `components/SessionMonitor.tsx`
  - [ ] `services/SessionService.ts`
  - [ ] `hooks/useGameController.ts`
- Do any server store files change for this? Yes/No

4) Restrict CORS for SSE
- You need to disallow cross‑origin access to the SSE endpoint.
- Which header do you change on the SSE response, and what’s the new value?
- Will a same‑origin client still work? Yes/No

5) Single SSE Subscriber Enforcement
- Where do you remove the duplicate EventSource to enforce `SessionMonitor` as the single subscriber? Choose one:
  - (A) `hooks/useGameController.ts`
  - (B) `services/SessionService.ts`
  - (C) `services/sessionClient.ts`
- Name the ref or variable that indicates the duplicate SSE binding in that file.

6) Track Reconnect Attempts
- You will start tracking reconnect attempts in the client store.
- Which store currently tracks SSE connection state? Provide the file path and method names to call.
- On an error → reconnect flow, list the expected state sequence (e.g., X → Y → Z).

7) Coalesce AI Progress (Only Emit Once After All AIs)
- Today, progress emits per‑AI. You want a single `progress` event after all AI turns complete.
- Where do you move or change the emit? Provide the file path and describe the change at a high level.
- What client impact do you need to consider for AI completion UI? Short note.

8) Change Event Channel Name `session` → `message`
- On the server, where are `event: session` frames written? Provide the file path.
- On the client, where do you change the listener to `message`? Mark all:
  - [ ] `components/SessionMonitor.tsx`
  - [ ] `hooks/useGameController.ts`
  - [ ] `services/SessionService.ts`

9) Enforce ETag on Action Submit
- Confirm where the `If-Match` header is set on action submission. Provide file path and function name.
- Does this change anything in SSE? Yes/No (one sentence why/why not)

10) Add Minimal Snapshot Gate on Client
- You want to ignore `session` events that do not include a `snapshot.revision` (defensive).
- Where is the parse/guard best placed on the client? Provide the file path and function name.
- Should this guard run before or after `setSSEState('connected')`? Choose: Before/After (1‑2 words why).

11) Remove `Access-Control-Allow-Origin: *` Side‑Effect
- If you remove the wildcard CORS header on SSE, do you also need to change JSON API endpoints used by `sessionClient.ts`? Yes/No (explain briefly)

12) Keep Revision Stable During ACTION
- Currently the client avoids bumping `sessionMeta.revision` during ACTION phase on SSE updates. Where is this logic, and what race does it avoid? (File + 1‑sentence reason)


# Problem Set: Client–Server SSE in this Repo

Goal: Build a precise mental model of how the app opens the SSE stream, transports updates, and merges snapshots into Zustand stores.

Answer in your own words. Where requested, cite file paths with a brief line reference (e.g., `app/api/session/[[...parts]]/route.ts:210`).

1) Initial Connect Flow
- Describe the full lifecycle when the client first opens the stream for a session id. Which endpoint is hit? What is the very first event sent on a successful connect? Why?

2) Client Handling on Snapshot/Advance
- In the client, when a `session` event arrives with `{ type: 'advance' }`, which stores are updated and how? Name the setter methods involved and the fields they affect.

3) Revision Updates During ACTION Phase
- Why does the client skip updating `sessionMeta.revision` during ACTION phase? Point to the relevant code and summarize the race it avoids.

4) Heartbeat Semantics
- How are heartbeat messages sent on the SSE stream (frequency and format)? What does the client do with them today?

5) Revision Monotonicity on Server
- Where are `revision` increments applied for (a) normal updates, (b) submit actions, and (c) advance? Which event types are emitted in each case?

6) Subscription Lifecycle and Cleanup
- Explain how the server tracks per‑session subscribers and how the SSE route cleans up on disconnect. Mention both the store unsubscribe path and the `AbortSignal`.

7) Event Types and Emitters
- List all supported `SessionEventType`s, and for each, identify which store methods emit them.

8) AI Progress Payload
- When an AI finishes its turn, what payload fields are sent over SSE, where is that emitted, and how does the client reflect this in UI state?

9) Error Handling on Client
- What happens in the client when the SSE stream errors? Which store fields reflect the error state, and what teardown occurs?

10) Duplicate Subscription Risk
- Identify two locations in the frontend that can open an SSE connection. What is the risk, and what is the recommended single source of truth for the subscription?

11) Wire Format Example
- Show an exact on‑the‑wire example of a `progress` event carrying `{ stage: 'ai-turn', playerId: 'p2', role: 'Deputy' }` and a minimal snapshot `{"id":"s1","revision":5}`. Use the precise SSE framing used in this repo.

12) Edge Runtime Implications
- Why does the route handler declare `export const runtime = 'edge'`? What runtime/browser APIs does the implementation rely on?

13) SSE Response Headers
- List the key response headers set on the SSE response and note whether cross‑origin access is allowed.

14) ETags vs SSE
- The client sometimes sends `If-None-Match` or `If-Match`. Briefly contrast this request/response flow with SSE and explain how each is used in the app.

15) Not‑Found on Stream Open
- If the session doesn’t exist when opening the stream, what event is sent and what happens next?

Bonus) Heartbeat Alternative
- Propose a minor change to send heartbeat as comment frames (e.g., `: ping`) and explain whether any client code here would need to change.


# Client-as-a-Dumb-Terminal Charter

Purpose
- Ensure multiplayer correctness, consistency, and debuggability by making the server the single source of truth for game state and complex logic. The client renders UI from server signals; all mutations originate on the server.

Why this matters
- Consistency: Multiple clients remain in sync (no divergent local rules/UI drift).
- Repro/Replay: Server can deterministically reconstruct rounds and outcomes.
- Performance: Heavy/variable work (AI calls, timers, orchestration) runs once on the server, not per‑client.
- Security: Trust boundary stays server‑side (role/seat enforcement, permissions, validation).
- Debuggability: One authoritative state and one set of logs to inspect.

Core Principles
- Server authoritative state
  - Server owns the canonical GameState, roster, timers, and transitions.
  - Clients never “derive” or “simulate” transitions; they render what the server says.
- Server computes readiness and progress
  - Waiting/ready status (humans submitted, AI turns done) is computed and broadcast by the server.
  - Clients display a unified list (other humans + AIs) from a single server payload.
- Single debrief, server‑generated
  - Debrief is generated once on END by the server and broadcasted to all clients; clients never request their own debrief individually.
- One socket owner, one source of events
  - Each app instance has a single Colyseus Room connection, owned by the Provider.
  - Listeners centralize schema patches and message events → Zustand projection → UI components.
- Message contract over client code paths
  - All client actions are messages to the server (set_role, submit_action, start_game, pause, etc.).
  - Server validates, logs, mutates canonical state, and broadcasts patches/events.
- Idempotent and ordered server handlers
  - Server handlers are idempotent and resilient to retries/duplicates.
  - If ordering matters, the server serializes processing per room.
- Optimistic UI is optional and self‑healing
  - Client may optimistically display intent (e.g., “submitted”) but must reconcile on next patch.
  - Optimistic UI must not block or alter server logic.
- Thin client projection
  - Client derives only trivial, presentational fields (formatting, sorting, grouping) from server payloads.
  - No hidden client‑side rules that change game semantics.

Implementation Guidelines
- State and events
  - Use Colyseus Schema for canonical state patches.
  - Use explicit messages for sideband events (waiting_status, action_options, round_result, debrief_ready).
  - Do not infer readiness on the client; the server emits waiting_status whenever readiness changes.
- Timers
  - Server owns round timers and transitions; client only displays the timer value/progress coming from server.
- Debrief
  - Server computes debrief once at END and stores it in memory for late joiners (getDebrief). Broadcast debrief_ready.
- Roles and seats
  - SeatRegistry server‑side; clients never enforce seat conflicts—only display taken/free as per server.
- Auth/permissions
  - Server verifies host/admin actions; clients never assume capabilities.
- Reconnection
  - Server allowReconnection governs reconnect window; client treats reconnect as convenience, not guaranteed state.
- Logging/telemetry
  - Server emits structured logs at transition points (join/leave, seat, submit, advance, waiting_status, debrief lifecycle).
  - Client logs are auxiliary; never the source of truth.

Do / Don’t
- Do
  - Add/modify server messages to reflect all UI states you need (waiting_status, errors, toasts).
  - Centralize all client listeners in the Provider and project into stores.
  - Keep components stateless relative to game logic; read stores and render.
- Don’t
  - Don’t compute game readiness, “opponent done,” or debrief client‑side.
  - Don’t fork logic per client (no separate debrief requests per tab).
  - Don’t open multiple sockets per app instance.

Testing & Tooling
- Headless server tests cover round flow: role claim → start → action options → submit → advance → END → debrief_ready.
- Use Colyseus Monitor for presence and a /snapshot endpoint for SSR/admin.
- Add a dev‑only HUD (optional) showing roomId/code/hostId/sessionId to visually confirm client identity.

Migration Notes (from mixed client/server logic)
- Replace client‑inferred readiness UI with server waiting_status.
- Move debrief generation to server END transition; remove client debrief POSTs.
- Audit client for any duplicated or inferred state—replace with server messages or schema fields.

PR Checklist
- Which server messages were added/changed?
- Are all stateful UI screens driven only by server patches/messages?
- Are logs added for: join/leave/seat, start/advance/end, waiting_status, debrief lifecycle?
- Does Provider attach all listeners in one place and project into stores only?
- Are optimistic updates reconciled on patch without changing server semantics?

Appendix: Suggested Server Messages
- waiting_status { round, humans:[{id,name,role,submitted}], ai:[{id,role,done}], allReady }
- debrief_ready { summary, keyEvents, userActions }
- round_result, current_event, action_options (per player)
- errors with typed codes (role_taken, not_host, invalid_action, insufficient_ap)


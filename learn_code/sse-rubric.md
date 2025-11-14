# Marking Rubric: Client–Server SSE Problem Set (100 pts)

Each question awards full credit for correctness, key references, and clear reasoning. Partial credit for incomplete but directionally correct answers.

- Q1 Initial Connect Flow — 8 pts
  - Correct endpoint + function (3)
  - First event and rationale (3)
  - Clear lifecycle summary (2)

- Q2 Client Handling (Advance) — 8 pts
  - Names correct stores/setters (4)
  - Explains impact on UI state (4)

- Q3 Revision During ACTION — 8 pts
  - Cites relevant code (3)
  - Explains race condition avoided (5)

- Q4 Heartbeat — 6 pts
  - Frequency + framing (3)
  - Notes current client behavior (3)

- Q5 Server Revisions — 10 pts
  - Distinguishes update/submit/advance (6)
  - Maps to emitted event types (4)

- Q6 Subscription Lifecycle — 8 pts
  - Store subscriber map + unsubscribe (4)
  - SSE `AbortSignal`/cleanup details (4)

- Q7 Event Types — 6 pts
  - Lists all types (3)
  - Correctly maps to emitters (3)

- Q8 AI Progress Payload — 8 pts
  - Server emit location + payload shape (4)
  - Client handling/mapping to UI (4)

- Q9 Client Error Handling — 6 pts
  - State change + teardown steps (6)

- Q10 Duplicate Subscription — 6 pts
  - Identifies both locations (3)
  - Recommends single source of truth (3)

- Q11 Wire Format — 6 pts
  - Correct SSE framing (4)
  - Minimal, valid JSON payload (2)

- Q12 Edge Runtime — 6 pts
  - Explains why and which APIs (6)

- Q13 Headers/CORS — 6 pts
  - Lists key headers (4)
  - Notes CORS stance (2)

- Q14 ETags vs SSE — 6 pts
  - Contrasts roles of each (6)

- Q15 Not‑Found on Open — 6 pts
  - Error event + close behavior (6)

Bonus (+0–4 pts, extra credit)
- Heartbeat as comments proposal and client impact.

Grading Notes
- Cite paths when asked; exact line numbers optional but helpful.
- Use concise explanations focused on correctness over verbosity.


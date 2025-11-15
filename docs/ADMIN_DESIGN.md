# Admin Portal Design

Status: Draft (Phase 3 Planned)

Owner: Platform/Infra

Purpose: Replace CLI ops with a secure, lightweight web admin for metrics, scenario review, and feedback triage. Keep the stack simple (no realtime required) and compatible with App Router.

## Goals
- Password-based admin access with signed, httpOnly cookie sessions.
- Admin shell with sidebar navigation and logout.
- Metrics dashboard (totals, trends, completion rates).
- Scenario management (list, approve/reject, feature, delete, search/filter).
- Feedback management (list, filter, mark reviewed, export CSV).
- Optional system health view (store/LLM connectivity).

## Non-Goals
- OAuth/social auth; multi-user RBAC.
- Realtime dashboards (first pass uses on-demand fetch). 
- Complex audit logging (simple request logs to start).

## Architecture Overview

Layers:
- UI (App Router): `app/admin/*` pages rendered via server components; client components where interactivity is needed.
- APIs (App Router): `app/api/admin/*/route.ts` for JSON endpoints; fetch from UI.
- Auth: Cookie session with middleware guard on `/admin/:path*`.
- Storage: Reuse existing store(s) where possible. For scenarios/feedback, start with current sources; evolve to Prisma tables if needed.

Runtimes:
- App Router, Node runtime. Fluid Compute not required (requests are short-lived).

## Authentication

Environment
- `ADMIN_PASSWORD_1`, `ADMIN_PASSWORD_2` – at least one must be set.
- `SESSION_SECRET` – 32+ bytes for signing.
- `ADMIN_SESSION_TTL` – default 86400s.

Flow
1) POST `/api/admin/login` with `{ password }`.
2) On match (constant-time compare), create a server session `{ token, user: 'admin', exp }`.
3) Persist session in Redis when available (key: `admin:sessions:<token>` with TTL). Fallback to in-memory Map in dev.
4) Set cookie `admin_session=<token>; HttpOnly; Secure?; SameSite=Lax; Path=/admin; Max-Age=<TTL>`.
5) Middleware (`middleware.ts`) protects `/admin/:path*` except `/admin/login`.
6) POST `/api/admin/logout` clears cookie + invalidates session.

Security Defaults
- Constant-time comparison for passwords.
- Rate limit login (basic: fixed 500ms delay + IP window cap).
- Don’t log passwords; minimal error messages on 401.

## Routes (UI)

- `/admin/login` – login form (client component posts to API).
- `/admin` → redirect to `/admin/dashboard`.
- `/admin/dashboard` – metrics overview.
- `/admin/scenarios` – list/search/filter; approve/reject/feature/delete.
- `/admin/feedback` – list/filter; mark reviewed; export CSV.
- `/admin/health` – system checks.

Layout
- `app/admin/layout.tsx` provides sidebar (Dashboard, Scenarios, Feedback, Health) and a logout button.

## APIs

All admin APIs require a valid `admin_session` cookie.

1) Auth
- `POST /api/admin/login` → `{ success: true }` on 200; sets cookie.
- `POST /api/admin/logout` → `{ success: true }`; clears cookie.

2) Metrics
- `GET /api/admin/metrics`
  - Returns: `{ totals: { games, byType }, timeline: Array<{ date, count }>, averages: { rounds, completionRate }, feedback: { total, avgRating }, scenarios: { public, pending, featured } }`.
  - Source: Phase 1: compute from current session store in memory/Redis if feasible; else placeholders derived from available aggregates. Phase 2: persist to DB.

3) Scenarios
- `GET /api/admin/scenarios?query=&status=&featured=` → list with filters.
- `PATCH /api/admin/scenarios/:id` → `{ action: 'approve'|'reject'|'feature'|'unfeature' }`.
- `DELETE /api/admin/scenarios/:id`.
  - Source: If scenarios are stored as JSON (e.g., `server/data/official-scenarios.json`), start read-only with feature/approve flags tracked in a small key/value store (Redis hash `admin:scenarios:<id>`). For full CRUD, move to DB.

4) Feedback
- `GET /api/admin/feedback?reviewed=...&q=...` → list (paginated).
- `PATCH /api/admin/feedback/:id` → `{ reviewed: boolean }`.
- `GET /api/admin/feedback.csv` → streamed CSV export.
  - Source: If feedback is currently collected via CLI or logs, first ship UI placeholders and wire real data when storage lands.

5) Health
- `GET /api/session/health` (existing) – reuse to show store/API/latency.
- Optionally add: `GET /api/admin/health` to aggregate and format for UI.

## Data Model (Initial)

Near-term (low-fidelity, Prisma-backed):
- GameSession: stores minimal per-session business metrics (id, mode, rounds, completed, timestamps).
- Feedback: existing model used for counts/avg and grouping.
- PublicScenario: existing model used for pending/approved counts.
- Metrics endpoint computes aggregates on-demand from these models; optional Redis TTL cache can be added later.

Schema (added):
```
model SessionMetrics {
  id          String   @id
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  mode        String
  rounds      Int      @default(0)
  completed   Boolean  @default(false)
  completedAt DateTime?
}
```

## Middleware

`middleware.ts` (App Router):
- Match `/admin/:path*`.
- Allow `/admin/login` always.
- For others: read `admin_session` cookie, validate via Redis/memory; redirect to `/admin/login` if invalid.

## UX Notes

- Keep the UI snappy with server components for lists; client components for inline actions (approve/feature/mark reviewed).
- Show clear empty states when data is not yet available.
- Use consistent toasts for API success/failure.

## Execution Plan (Beads IDs)

P1
1) ai-risk-ttx-121: Auth utils, login/logout APIs, middleware, login page. — COMPLETE
   - Implemented dual-path auth: NextAuth (Credentials) preferred, custom HMAC cookie fallback.
   - Middleware prefers next-auth withAuth, falls back to custom verify.
   - Login page tries signIn('credentials'), else posts to /api/admin/login.
   - Env: AUTH_SECRET/NEXTAUTH_SECRET, ADMIN_PASSWORD_1/2.
2) ai-risk-ttx-122: Layout + routes + logout. — COMPLETE
   - Admin layout with sidebar and header.
   - Active nav highlighting via client sidebar using usePathname.
   - Stub pages: Dashboard, Scenarios, Feedback, Health.
   - Logout wired to next-auth signOut with API fallback.

P2
3) ai-risk-ttx-127: Metrics API → 6) ai-risk-ttx-123 Dashboard UI. — BASIC VERSION SHIPPED
   - Added GET /api/admin/metrics returning minimal placeholders (store type, timestamp, null totals).
   - Dashboard consumes metrics (store, timestamp, totals.games) with refresh.
4) ai-risk-ttx-128: Scenarios API → 7) ai-risk-ttx-124 Scenarios UI.
5) ai-risk-ttx-129: Feedback API → 8) ai-risk-ttx-125 Feedback UI.

P3
9) ai-risk-ttx-126: Health UI (uses existing health endpoint).

## Progress Log

- 2025-11-15: Enabled NextAuth credentials with trustHost and AUTH_SECRET fallback. Added admin middleware with next-auth first, custom fallback. Created Admin layout and pages. Shipped basic /api/admin/metrics and wired dashboard to display store type and timestamp.
- 2025-11-15: Added SessionMetrics model (Prisma) and hooked session create/initialize/advance paths to persist rounds and completion. Metrics now read from SessionMetrics for totals/byType/avg rounds/completion rate.

## API Reference (Initial)

### GET /api/admin/metrics

Response (200):

```
{
  "success": true,
  "data": {
    "timestamp": 1731640000000,
    "store": "memory" | "redis" | "unknown",
    "totals": { "games": null, "byType": {} },
    "averages": { "rounds": null, "completionRate": null },
    "timeline": [],
    "scenarios": { "public": null, "pending": null, "featured": null },
    "feedback": { "total": null, "avgRating": null }
  }
}
```

Notes: intentionally simple; will be expanded in a later migration.


## Risks & Mitigations

- Env drift: validate required envs on boot; fail fast with clear messages.
- Session fixation: rotate tokens on login; set proper cookie flags.
- Data gaps: ship placeholders where data isn’t persisted yet; add caches for expensive metrics.
- Rate limiting: minimal delay + IP window for login; consider adding more if abused.

## Open Questions

- Do we persist scenarios/feedback now (Prisma) or defer to a later phase?
- Should metrics exclude test/simulation sessions (add a `mode`/flag)?
- Do we need multi-admin support soon (user table + hashed passwords)?

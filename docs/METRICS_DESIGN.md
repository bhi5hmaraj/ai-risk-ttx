# Admin Metrics: Design Notes (MVP)

Goals

- Make metrics aggregation simple, accurate, and reusable across surfaces (admin UI, bots).
- Minimize app‑level data wrangling; push heavy lifting into SQL.
- Provide a small set of stable SQL views we can query with `from/to` date filters.
- Keep MVP focused on what the dashboard already shows.

What the dashboard needs today

- Totals: sessions started ("games") in a range; by mode counts.
- Averages:
  - Avg completion fraction: average of per‑session `rounds / maxRounds` (clamped to 1). If `maxRounds` is null and `completed = true`, treat as 1; else ignore.
  - Avg rounds (played) across sessions that started in range.
- Timeline (daily): started vs completed counts (with empty days showing 0).
- Funnel: started, completed, and rate (completed/started) in range.
- Scenarios: Top titles with started, completed, and average completion fraction per title.
- Round funnel: counts reaching round ≥ N (N = 1..5) in range.
- Avg round durations (seconds) per round index across sessions started in range.

Design approach (MVP)

- Use Postgres SQL views for core denormalizations and summaries.
- Query views with `from`/`to` in app code (via `WHERE day BETWEEN $1 AND $2`).
- Prefer views for reusable, non‑parameterized logic (per‑session derived fields; daily rollups; array unnesting).
- Use parameterized SQL (via `prisma.$queryRaw`) when a view would have too many dimensions (e.g., dynamic thresholds or windows).
- Optional: For heavier queries, switch to Materialized Views and refresh on a schedule.

Schema references

- `session_metrics(id, created_at, updated_at, mode, rounds, max_rounds, completed, completed_at, started_at, current_round_started_at, round_durations Int[], scenario_title)`
- `feedback(id, created_at, avg_rating, ...)` (already exists)

Core views (proposed)

1) Per‑session completion fraction

```sql
CREATE OR REPLACE VIEW v_session_completion AS
SELECT
  id,
  started_at,
  completed,
  completed_at,
  rounds,
  max_rounds,
  mode,
  scenario_title,
  CASE
    WHEN max_rounds IS NOT NULL AND max_rounds > 0
      THEN LEAST(1.0, rounds::float / max_rounds)
    WHEN completed THEN 1.0
    ELSE NULL
  END AS completion_fraction
FROM session_metrics;
```

2) Daily started/completed counts (full history)

```sql
CREATE OR REPLACE VIEW v_session_daily_counts AS
WITH started AS (
  SELECT date_trunc('day', started_at)::date AS day, COUNT(*) AS started
  FROM session_metrics
  WHERE started_at IS NOT NULL
  GROUP BY 1
),
completed AS (
  SELECT date_trunc('day', completed_at)::date AS day, COUNT(*) AS completed
  FROM session_metrics
  WHERE completed = TRUE AND completed_at IS NOT NULL
  GROUP BY 1
)
SELECT
  COALESCE(s.day, c.day) AS day,
  COALESCE(s.started, 0) AS started,
  COALESCE(c.completed, 0) AS completed
FROM started s
FULL OUTER JOIN completed c ON s.day = c.day
ORDER BY 1;
```

Query example (timeline for a range):

```sql
SELECT day, started, completed
FROM v_session_daily_counts
WHERE day BETWEEN $1::date AND $2::date
ORDER BY day;
```

3) Scenario breakdown (top titles)

```sql
CREATE OR REPLACE VIEW v_scenario_breakdown AS
SELECT
  COALESCE(scenario_title, 'Unknown') AS title,
  COUNT(*) FILTER (WHERE started_at IS NOT NULL) AS started,
  COUNT(*) FILTER (WHERE completed) AS completed,
  AVG(
    CASE
      WHEN max_rounds IS NOT NULL AND max_rounds > 0
        THEN LEAST(1.0, rounds::float / max_rounds)
      WHEN completed THEN 1.0
      ELSE NULL
    END
  ) FILTER (WHERE started_at IS NOT NULL OR completed) AS avg_completion
FROM session_metrics
GROUP BY 1;
```

Query example (range + top 10):

```sql
SELECT title, started, completed, avg_completion
FROM v_scenario_breakdown
WHERE EXISTS (
  SELECT 1 FROM session_metrics sm
  WHERE COALESCE(sm.scenario_title, 'Unknown') = v_scenario_breakdown.title
    AND sm.started_at BETWEEN $1 AND $2
)
ORDER BY started DESC
LIMIT 10;
```

Note: For strict accuracy, you can compute the breakdown directly with a range `WHERE started_at BETWEEN $1 AND $2`, but a view keeps the expression reusable. For performance/accuracy trade‑off, consider a range‑specific query:

```sql
SELECT
  COALESCE(scenario_title, 'Unknown') AS title,
  COUNT(*) FILTER (WHERE started_at IS NOT NULL) AS started,
  COUNT(*) FILTER (WHERE completed) AS completed,
  AVG(LEAST(1.0, rounds::float / NULLIF(max_rounds, 0))) FILTER (WHERE started_at IS NOT NULL OR completed) AS avg_completion
FROM session_metrics
WHERE started_at BETWEEN $1 AND $2
GROUP BY 1
ORDER BY started DESC
LIMIT 10;
```

4) Round durations unpacked (per round per session)

```sql
CREATE OR REPLACE VIEW v_round_durations AS
SELECT
  sm.id AS session_id,
  date_trunc('day', sm.started_at)::date AS day,
  d.idx AS round,
  d.sec AS seconds
FROM session_metrics sm
LEFT JOIN LATERAL unnest(sm.round_durations) WITH ORDINALITY AS d(sec, idx) ON TRUE;
```

Query example (average by round in a range):

```sql
SELECT round, ROUND(AVG(seconds)::numeric, 1) AS avg_seconds
FROM v_round_durations
WHERE day BETWEEN $1::date AND $2::date
GROUP BY 1
ORDER BY 1;
```

5) Round funnel (reached round ≥ N)

- Dynamic thresholds are easier with a parameterized query:

```sql
WITH levels AS (
  SELECT generate_series(1, $3::int) AS level
)
SELECT l.level,
       COUNT(*) AS count
FROM levels l
JOIN session_metrics sm ON sm.rounds >= l.level
WHERE sm.started_at BETWEEN $1 AND $2
GROUP BY l.level
ORDER BY l.level;
```

If you prefer a view, create a daily version and filter by day:

```sql
CREATE OR REPLACE VIEW v_round_funnel_daily AS
SELECT
  date_trunc('day', started_at)::date AS day,
  g.level,
  COUNT(*) AS count
FROM session_metrics sm
JOIN generate_series(1, 10) AS g(level) ON sm.rounds >= g.level
WHERE sm.started_at IS NOT NULL
GROUP BY 1, 2;
```

Then:

```sql
SELECT level, SUM(count) AS count
FROM v_round_funnel_daily
WHERE day BETWEEN $1 AND $2
GROUP BY 1
ORDER BY 1;
```

6) By‑mode counts (optional)

```sql
CREATE OR REPLACE VIEW v_session_by_mode AS
SELECT mode, COUNT(*) AS total
FROM session_metrics
WHERE started_at IS NOT NULL
GROUP BY mode;
```

Indices & perf notes

- Ensure btree indexes:
  - `session_metrics(started_at)`
  - `session_metrics(completed_at)`
  - `session_metrics(scenario_title)` (for breakdown)
  - `session_metrics(rounds)` (for funnel)
- `round_durations` array: avoid indexing unless needed; unnest scans are typically fine given expected volumes.
- For heavier loads, make `v_session_daily_counts` and `v_round_funnel_daily` materialized and refresh every 1–5 minutes.

How app code reads these

- Timeline: `SELECT day, started, completed FROM v_session_daily_counts WHERE day BETWEEN $1 AND $2 ORDER BY day`.
- Totals & funnel: `SELECT SUM(started) AS started, SUM(completed) AS completed FROM v_session_daily_counts WHERE day BETWEEN $1 AND $2`.
- Averages:
  - Avg rounds: `SELECT AVG(rounds) FROM session_metrics WHERE started_at BETWEEN $1 AND $2`.
  - Avg completion: `SELECT AVG(completion_fraction) FROM v_session_completion WHERE started_at BETWEEN $1 AND $2`.
- Scenarios: choose one of the two queries above.
- Round funnel: dynamic `generate_series` query or the daily view rollup.
- Avg round durations: aggregate over `v_round_durations` in range.

WoW deltas (phase‑2 or optional)

- Compute on top of daily views by comparing `SUM(...)` over two consecutive windows of equal length.
- Example (started sessions WoW):

```sql
WITH cur AS (
  SELECT SUM(started) AS v FROM v_session_daily_counts WHERE day BETWEEN $1 AND $2
),
prev AS (
  SELECT SUM(started) AS v FROM v_session_daily_counts WHERE day BETWEEN $3 AND $4
)
SELECT CASE WHEN prev.v > 0 THEN (cur.v - prev.v) / prev.v ELSE NULL END AS wow
FROM cur, prev;
```

Why views (vs code)

- Centralize definitions; test them directly in psql/Metabase.
- Let Postgres optimize aggregations and date math.
- Keep your route/metricsRepo thin → easier to reuse from bots.

Next steps

- Create the views above via a migration.
- Switch server/data/metricsRepo.ts to call these views with `from/to` params.
- Add a small range selector to the Admin Dashboard (`today | 7D | 30D | custom`).
- Optionally introduce a materialized view for the heaviest queries if needed.


# Multiplayer Docs Index

This folder contains the multiplayer design and deployment documents.

- multiplayer_phase2.md — Server‑driven Colyseus architecture and SSR snapshot (SSR‑only).
- multiplayer_phase2_5.md — State design glue between Phase 2 and Phase 3 (Core ↔ Schema ↔ Client ↔ Next ↔ DB).
- multiplayer_phase3.md — Mail & Events architecture (event spine, APIs, and flows).
- DEPLOYMENT_STRATEGY.md — Two‑service deployment: Next on Vercel, Colyseus on Cloud Run.
- PHASE2_COLYSEUS_MIGRATION.md — Phase 2 migration notes.
- colyseus-migration-tasks.md — Tasks overview for migration.

Conventions
- Core state is authoritative; Schema and Client are projections.
- Snapshot is SSR‑only; browsers rely on WS + reconnect.
- Keep Schema tails bounded (e.g., recentMail N=10–20) and pruned.


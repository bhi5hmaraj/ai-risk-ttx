---
title: FE↔BE: Stores & SSE (Current State)
---

> Source: adapted from the repo’s `docs/fe-be-stores-and-sse.md`.

import Diagram from '../../snippets/mermaid.mdx'

# Frontend–Backend Architecture: Zustand Stores, Endpoints, and SSE

This page summarizes how the React client (Zustand stores + hooks) interacts with the server-authoritative session backend, what endpoints are used, and how SSE drives real‑time updates.

## High‑Level Overview

```mermaid
flowchart TD
  subgraph FE[Frontend]
    subgraph Stores
      game[gameStore]
      session[sessionStore]
      lobby[lobbyStore]
      action[actionStore]
      ui[uiStore]
    end
    useGA[useGameActions]
    useRO[useRoundOptions]
    SM[SessionMonitor]
    svc[SessionService → sessionClient]
  end

  API[/api/session/[[...parts]]/]

  useGA --> svc
  useRO --> svc
  svc --> API
  SM --> game
  SM --> action
  SM --> ui
  SM --> lobby
  session -. id/rev/host .-> SM
```

For the full write‑up with file references, see the original markdown in the main repo.


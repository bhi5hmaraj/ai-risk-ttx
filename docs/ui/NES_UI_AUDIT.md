# NES.css UI Audit & Migration Plan

Status: proposal
Owner: UI/Frontend
Last updated: 2025-12-07

## Why NES.css

NES.css is a lightweight, class‑based CSS theme that emulates retro 8‑bit UI. It ships only CSS (no JS), so it layers cleanly on top of our React + Tailwind stack and is easy to theme via class names (`nes-btn`, `nes-container`, `nes-input`, etc.).

Good fit for us because:
- Quick visual coherence with minimal churn to component logic.
- Works with our SPA multiplayer flow; no runtime coupling to Colyseus.
- Zero JS: no bundle bloat, no hydration hazards.

Tradeoffs to watch:
- Pixel font (“Press Start 2P”) can impair readability at small sizes; must scale and/or opt-out for dense tables.
- Global styles can conflict with Tailwind defaults if import order is wrong.
- Limited color tokens; custom palette needs light overrides.

## Scope of Change

We keep component structure and replace classNames. No data flow or business logic changes. Cytoscape canvas is unaffected.

Key screens to migrate (by usage frequency):
- Lobby + Join by code (SPA landing)
- WaitingRoom (host and guest views)
- RoleSelector
- ActionSelection (AP, options list)
- RoundSnapshotCard (round results)
- EndScreen (AI debrief)
- Site frame (Navbar/HUD, toasts)

## Integration Options

Pick one import path; both are supported.

1) Next.js (App Router) — recommended
- Import NES.css globally in `app/layout.tsx`:
  ```ts
  // app/layout.tsx
  import 'nes.css/css/nes.min.css';
  import './globals.css';
  ```
- Or in CSS: add at top of `app/globals.css`:
  ```css
  @import 'nes.css/css/nes.min.css';
  ```
- Font with next/font:
  ```ts
  import { Press_Start_2P } from 'next/font/google';
  const press = Press_Start_2P({ weight: '400', subsets: ['latin'] });
  export default function RootLayout({ children }) {
    return <body className={press.className + ' nes-dark'}>{children}</body>;
  }
  ```

2) Vite/React
- In `index.tsx` (or `main.tsx`):
  ```ts
  import 'nes.css/css/nes.min.css';
  import './index.css';
  ```
- Add Google Font link in `index.html` if not using CSS import:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
  ```

Tailwind interop (both stacks)
- Keep Tailwind; NES.css provides presentational classes only.
- Import order: Tailwind base/components/utilities first, then NES.css, then our overrides. If NES needs to win, import it after Tailwind base.
- Consider opt‑out of the pixel font for dense text blocks via a wrapper utility: `.font-sans` or `.not-retro`.

## Class Mapping Cheatsheet

- Buttons: `nes-btn` + variant `is-primary|is-success|is-warning|is-error|is-disabled`.
- Inputs: `nes-input`, Textarea: `nes-textarea`, Select: `nes-select`.
- Badges: `nes-badge` (split: `is-splited`).
- Containers/Cards: `nes-container` + `with-title` + `is-rounded` + `is-dark`.
- Progress: `nes-progress is-pattern` (no value label built‑in).
- Lists: `nes-list is-disc|is-circle|is-roman`.
- Avatars/Icons: `nes-avatar`, `nes-icon`.
- Dialog/Modal: `nes-dialog` with native `<dialog>` (polyfill optional for Safari < 16.4).

## Incremental Migration Plan

Phase 0 — Spike (0.5 day)
- Add NES.css import + font.
- Build tiny wrappers so code changes are mechanical:
  - `components/ui/NESButton.tsx` → props: `variant`, `size`, `className` → maps to `nes-btn` classes.
  - `components/ui/NESInput.tsx` → `nes-input` + error state.
  - `components/ui/NESContainer.tsx` → `nes-container with-title is-rounded is-dark`.
  - `components/ui/NESBadge.tsx`, `NESProgress.tsx`.

Phase 1 — High-traffic screens (1 day)
- Lobby/Join: swap buttons/inputs/containers to NES.
- WaitingRoom: list → `nes-list`; ready status → `nes-badge`.
- RoleSelector: avatars → `nes-avatar`; grid → `nes-container` items.

Phase 2 — Core gameplay (1 day)
- ActionSelection: 
  - Replace AP chip with `nes-progress` + numeric label.
  - Options as `nes-list` of `nes-container` rows.
- RoundSnapshotCard: `nes-container with-title` + badges.
- EndScreen: `nes-container` sections, debrief in `nes-list`.

Phase 3 — Polish (0.5 day)
- Toaster styles, HUD pill badges, modals → `nes-dialog`.
- Dark theme tuning via small overrides (see below).
- Accessibility pass (color contrast + focus rings).

Total estimate: ~2.5–3.5 dev days including QA.

## Scope Update (2025-12-07)

Per discussion, we will skip the Action Tree (Cytoscape modal/graph) and any other low‑priority screens for now.

Out of scope (deferred):
- Action Tree / Cytoscape visualizations and modals.
- Advanced ActionSelection visuals beyond basic button/input/container swaps.
- Dev HUD polish, charts, and ancillary admin screens.

Trimmed migration checklist (deliver first):
- Import NES.css and `styles/nes-overrides.css` (feature‑flag via `NEXT_PUBLIC_NES_UI`).
- Add minimal wrappers: `NESButton`, `NESInput`, `NESContainer`, `NESBadge`.
- Convert high‑traffic screens only:
  - Lobby/Join (SPA landing)
  - WaitingRoom (host + guest)
  - RoleSelector
  - EndScreen (AI debrief)
- Quick pass on navbar/toasts so they don’t clash with NES.
- QA flows: host create → guest join → role claim → start → submit → end.

## Theming & Overrides

Add a small override file `styles/nes-overrides.css` and load after NES.css:
```css
/* Increase base font size for readability */
html { font-size: 15px; }

/* Dark surface parity with our palette */
.nes-container.is-dark { background-color: #111827; border-color: #374151; }

/* Button sizing helpers */
.nes-btn.is-sm { padding: 0.35rem 0.6rem; font-size: 0.75rem; }
.nes-btn.is-lg { padding: 0.8rem 1rem; font-size: 1rem; }

/* Opt-out utility for dense text blocks */
.not-retro { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Noto Sans", sans-serif; }
```

## Component Conversions (targets)

- `screens/WaitingRoom.tsx`
  - Card wrappers → `nes-container with-title is-dark`.
  - Player rows → `nes-badge` to show ready/taken.
- `components/game/RoleSelector.tsx`
  - Inputs → `nes-input`; confirm → `nes-btn is-primary`.
  - Role tiles → `nes-container is-rounded` + `nes-avatar`.
- `components/game/ActionSelection.tsx`
  - AP display → `nes-progress` + numeric.
  - Options list → `nes-list` with nested `nes-container` items.
- `components/game/RoundSnapshotCard.tsx`
  - Wrap in `nes-container with-title`.
  - Outcome badges → `nes-badge`.
- `screens/EndScreen.tsx`
  - Sections as `nes-container`; use `nes-list` for bullets.

## Risks & Mitigations

- Specificity clashes with Tailwind
  - Keep NES import after Tailwind base; prefer NES class names where used; avoid global resets.
- Font legibility
  - Use `not-retro` class for paragraphs/tables; keep pixel font for headings/buttons only.
- Dialog support
  - `nes-dialog` depends on `<dialog>`; add a tiny polyfill or use our existing modal for Safari < 16.4.
- Dark mode consistency
  - NES dark classes are limited; apply small CSS overrides to align with our current palette.

## Acceptance Criteria

- Pages render without layout regressions at 360px, 768px, 1280px widths.
- Keyboard focus visible on all interactive NES elements.
- Waiting/ready UI uses server `waiting_status` and looks coherent in NES.
- No change to Colyseus wiring or business logic; only className changes.

## Cut Plan

- Feature flag in env (e.g., `NEXT_PUBLIC_NES_UI=1`) to gate NES wrappers.
- Start with Lobby + WaitingRoom behind the flag; ship incrementally.

## Quick Start Checklist

1) Install dependency
   ```sh
   npm i nes.css
   ```
2) Import NES.css globally (layout or CSS).
3) Add `styles/nes-overrides.css` and import it after NES.css.
4) Build wrappers: `NESButton`, `NESInput`, `NESContainer`, `NESBadge`, `NESProgress`.
5) Convert Lobby → WaitingRoom → RoleSelector → ActionSelection → RoundSnapshotCard → EndScreen.
6) Verify with server messages (`waiting_status`, `players_init`, `debrief_ready`).

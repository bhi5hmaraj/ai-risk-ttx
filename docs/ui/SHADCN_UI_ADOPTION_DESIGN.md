# SHADCN/UI Adoption Design

Status: proposed
Branch: feat/nextjs-migration
Owner: Frontend
Last updated: 2025-12-08

## Goal
Adopt a uniform, tasteful, minimalist UI using shadcn/ui (Radix + Tailwind) across high‑traffic gameplay screens without disrupting multiplayer logic.

## Why shadcn/ui
- Minimalist, serious baseline that avoids a generic kit look.
- Strong accessibility via Radix primitives; SSR-friendly with Next.js.
- We own the components (copy‑paste), enabling tokens and long‑term control.
- Works natively with Tailwind and our current layout.

## Scope (initial rollout)
- Convert: Lobby/Join, WaitingRoom, RoleSelector, EndScreen.
- Defer: Action Tree/Cytoscape, complex charts, admin.

## Deliverables
- Tokens (colors/radius/space/shadows) with Radix Colors Slate/Gray + accent.
- Core primitives: Button, Input, Dialog, Toast, Badge, Separator.
- Thin wrappers in `components/ui/` to isolate library churn.
- Screen updates applying wrappers and tokens.

## Implementation Plan
1) Initialize shadcn/ui
   - `npx shadcn@latest init`
   - Add primitives: `npx shadcn@latest add button input dialog toast badge separator`
   - Place generated components under `components/ui/`.

2) Define design tokens
   - `styles/tokens.css` with CSS vars, e.g.:
     - `--bg`, `--card`, `--border`, `--text`, `--muted`, `--accent`, `--success`, `--danger`, `--radius`.
   - Map in `tailwind.config.ts` via `theme.extend.colors` and `borderRadius`.

3) Create wrappers
   - `components/ui/Button.tsx` (wraps shadcn button variants)
   - `components/ui/Input.tsx`
   - `components/ui/Dialog.tsx`
   - `components/ui/Toast.tsx`
   - `components/ui/Badge.tsx`
   - Keep a `cn` util; prefer composition over deep prop surfaces.

4) Screen migration (no logic changes)
   - Lobby/Join: replace inputs/buttons/cards.
   - WaitingRoom: badges, separators, buttons.
   - RoleSelector: cards/buttons; keep grid/layout.
   - EndScreen: dialog for feedback; cards for sections.

5) QA & A11y
   - Keyboard flows (join → select → start → submit → end).
   - Focus rings visible; color contrast AA.
   - SSR/hydration check (no client mismatch warnings).

## Example Wrapper (Button)
```tsx
// components/ui/Button.tsx
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Parameters<typeof buttonVariants>[0]['variant'];
  size?: Parameters<typeof buttonVariants>[0]['size'];
};
export function Button({ className, variant, size, ...props }: Props) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

## Tokens (example)
```css
/* styles/tokens.css */
:root {
  --bg: #0d1117; --card: #0f131a; --border: #1e2633;
  --text: #e2e8f0; --muted: #93a1b2;
  --accent: #60a5fa; --success: #22c55e; --danger: #ef4444;
  --radius: 6px;
}
```

## Risk & Mitigation
- Visual drift: centralize tokens; wrappers only.
- Overhaul scope creep: limit to 4 screens; defer Cytoscape.
- A11y regressions: enforce focus/contrast checks in QA.

## Rollout & Flagging
- Optional env flag `NEXT_PUBLIC_THEME=shadcn` to gate styles during migration.
- Keep a quick toggle in Dev HUD for side‑by‑side validation.

## Acceptance Criteria
- 4 screens migrated to shadcn/ui with cohesive tokens and passing a11y checks.
- No regressions in multiplayer flow (join/role/wait/start/submit/end).
- No client‑side console errors/warnings related to hydration or Radix.

## Matrix‑Inspired Palette (tasteful, minimalist)

Intent
- Evoke the Matrix code aesthetic without harming readability. Use green as an accent, not body text.

Reference palette (film‑inspired)
- Core hues commonly referenced for the Matrix code: `#0D0208` (almost‑black), `#003B00` (deep green), `#008F11` (emerald), `#00FF41` (neon code green). Source provides names & hexes. [See “Matrix Code Green” palette.]  

Tokens (recommended for our UI)
```css
/* styles/tokens.css — matrix variant */
:root {
  /* Surfaces */
  --bg:    #0d1117;  /* neutral dark, not pure green-tinted to preserve legibility */
  --card:  #0f131a;
  --panel: #0b1016;
  --border:#1e2633;

  /* Text */
  --text:  #e2e8f0;  /* high-contrast neutral */
  --muted: #93a1b2;

  /* Accent (Matrix) */
  --accent:       #00ff41;  /* neon code green */
  --accent-strong:#00b32a;  /* mid green for icons/active states */
  --accent-soft:  rgba(0, 255, 65, 0.12); /* chips/selected bg */

  /* Semantic */
  --success: #16a34a;
  --danger:  #ef4444;
  --warning: #f59e0b;

  --radius: 6px;
}
```

Tailwind mapping (excerpt)
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', panel: 'var(--panel)',
        border: 'var(--border)', text: 'var(--text)', muted: 'var(--muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          soft: 'var(--accent-soft)'
        },
        success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)'
      },
      borderRadius: { md: 'var(--radius)' }
    }
  }
}
```

Accessibility notes
- Keep body text neutral (`--text`) on dark surfaces. Use `--accent` for focus rings, borders, toggles, and data highlights.
- Avoid large paragraphs in code green; reserve `--accent` for small UI elements to maintain contrast comfort.

## Recursive Fonts (variable) — integration & usage

Why Recursive
- Variable family designed for code & interface use, with five axes: Monospace (`MONO`), Casual (`CASL`), Weight (`wght`), Slant (`slnt`), and Cursive (`CRSV`).
- Great for pairing a proportional UI face with a mono HUD/digits from the same family.

Include via Google Fonts (CSS v2)
```html
<!-- app/layout.tsx <head> or _document -->
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Recursive:MONO,slnt,wght,CASL,CRSV@0..1,-15..0,300..1000,0..1,0..1&display=swap" rel="stylesheet"/>
```

Base assignment
```css
/* styles/fonts.css */
html, body { font-family: 'Recursive', Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif; }

/* Default UI face: proportional, linear */
.font-recursive-sans {
  font-family: 'Recursive', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings:
    "MONO" 0,   /* proportional */
    "CASL" 0,   /* linear */
    "wght" 400,
    "slnt" 0,
    "CRSV" 0.5; /* auto cursive for slanted text */
}

/* HUD / digits / code: mono linear */
.font-recursive-mono {
  font-family: 'Recursive', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-variation-settings: "MONO" 1, "CASL" 0, "wght" 500, "slnt" 0, "CRSV" 0.5;
}

/* Emphasis / oblique labels (use sparingly) */
.font-recursive-italic {
  font-variation-settings: "MONO" 0, "CASL" 0.1, "wght" 450, "slnt" -12, "CRSV" 1;
}
```

Tailwind hook (fonts)
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: [ 'Recursive', 'Inter', 'system-ui', 'sans-serif' ],
        mono: [ 'Recursive', 'ui-monospace', 'SFMono-Regular', 'monospace' ]
      }
    }
  }
}
```

Recommended usage
- Body & headings: `.font-recursive-sans`, weights 400/600, `slnt 0`.
- HUD digits / session codes / AP counters: `.font-recursive-mono`, `wght 500–600`.
- Decorative slant (`slnt -10..-12`) only for short labels or secondary emphasis.

Licensing
- Recursive is released under SIL Open Font License 1.1 (OFL 1.1).


## Task Breakdown (Detailed)

Phase 0 — Repo prep (0.5 day)
- Add design tokens file: `styles/tokens.css`; wire into `app/layout.tsx` or global CSS.
- Tailwind mapping: update `tailwind.config.ts` to read CSS vars for colors/radius/shadows.
- Add `lib/ui/cn.ts` utility (className merger) if missing.

Phase 1 — shadcn bootstrap (0.5–1 day)
- Initialize: `npx shadcn@latest init`.
- Add primitives: `button input dialog toast badge separator`.
- Create wrappers in `components/ui/`: `Button.tsx`, `Input.tsx`, `Dialog.tsx`, `Toast.tsx`, `Badge.tsx`, `Separator.tsx`.
- Verify SSR/hydration: no warnings with a simple page using Button+Input.

Phase 2 — Screen conversions (1–1.5 days)
- Lobby/Join
  - Files: `app/lobby/page.tsx`, `screens/LobbyScreen.tsx`.
  - Replace form controls (name/code) with `Input`, submit with `Button`.
  - Use `Badge` for room code and status; `Separator` for sections.
  - Add copy-to-clipboard toast using shadcn `Toast`.
- Waiting UI (in Lobby/Game as applicable)
  - Files: `screens/LobbyScreen.tsx`, `screens/GameScreen.tsx`.
  - Replace ad‑hoc pills with `Badge`; tighten spacing/borders per tokens.
- RoleSelector
  - Files: within `screens/LobbyScreen.tsx` (role tiles) or dedicated component if present.
  - Convert role cards to flat “card” style with borders (Tailwind + tokens) and shadcn `Button` for select/confirm.
- EndScreen
  - Files: `screens/EndScreen.tsx`.
  - Convert section wrappers to tokenized containers; use `Dialog` for feedback.
  - Replace legacy spinners with a small shadcn‑styled spinner or keep existing `LoadingSpinner` with token colors.
- Game core components (light pass now)
  - Files: `components/game/RoundSnapshotCard.tsx`, `components/game/ActionSelection.tsx`.
  - Swap CTAs to shadcn `Button`; keep layouts, just align to tokens (borders, spacing, headings).

Phase 3 — HUD and polish (0.5 day)
- Files: `components/ConnectionStatus.tsx`, `components/StartProgress.tsx`, `components/RouteOrchestrator.tsx` (no UI), `components/ui/Tooltip.tsx`.
- Replace ad‑hoc pills with `Badge`, separators with `Separator`, dialogs with `Dialog` where present.
- Ensure focus rings are visible and consistent (tokens).

Phase 4 — QA and a11y (0.5 day)
- Keyboard paths: Home → Lobby → Join/Create → Role select → Wait → Start → Submit → End.
- Contrast checks against tokens; adjust `--border`/`--muted` if needed.
- SSR/hydration logs clean on initial load and navigation.

Out of Scope (defer)
- Action Tree / Cytoscape (`components/game/ActionTreeModal.tsx`, `ActionTreePortal.tsx`).
- Admin tables/charts (Mantine/Chart libs if any).

## Checkpoints & Validation

Checkpoint A — Bootstrap done
- shadcn primitives exist in `components/ui/*`.
- `styles/tokens.css` loaded; Tailwind reads tokens; sample page renders without hydration warnings.

Status (2025-12-08): In progress → Completed
- Added tokens at `styles/tokens.css` and wired in `app/layout.tsx`.
- Added font integration `styles/fonts.css` (Recursive) and imported in layout.
- Mapped tokens in `tailwind.config.ts` (bg/card/panel/border/text/muted/accent/success/danger/warning, radius).
- Added `lib/ui/cn.ts` helper.
- Scaffolded primitives in `components/ui/`: `Button`, `Input`, `Badge`, `Separator`, `Dialog`, `Toast` (lightweight placeholders styled with tokens; safe to use now). 
- Next: replace usages on target screens (Checkpoint B).

Checkpoint B — Lobby/Join complete
- `app/lobby/page.tsx` and `screens/LobbyScreen.tsx` use `Input`/`Button`/`Badge`.
- Copy room code shows a toast; focus states visible on all controls.

Checkpoint C — Waiting + Role select complete
- Waiting pills replaced with `Badge`; list spacing per tokens.
- Role tiles/cards align to tokens; confirm uses shadcn `Button`.

Checkpoint D — EndScreen complete
- Section containers use tokenized borders/spacing; feedback uses `Dialog`.
- Loading indicators match token colors.

Checkpoint E — Core components aligned
- `RoundSnapshotCard` and `ActionSelection` CTAs are shadcn `Button` variants; no layout regressions.

Checkpoint F — QA/a11y sign‑off
- Keyboard flows pass; focus rings visible; contrast AA.
- No console warnings (SSR/hydration/Radix) during flows.

## Current UI Implementation (High‑Level Overview)

App shell
- `app/layout.tsx`: Next App Router layout; global CSS; good place to import `styles/tokens.css` and Radix CSS (if any).
- `app/page.tsx`: Landing; minimal forms/buttons to convert.

Lobby and navigation
- `app/lobby/page.tsx` + `screens/LobbyScreen.tsx`: join/create form, role selection, and waiting UI consolidated here; currently Tailwind classes with custom pills and containers.
- `components/ConnectionStatus.tsx`, `components/StartProgress.tsx`: status/HUD pieces; replace pills with `Badge`, ensure tokens for borders and text.

Game screens
- `app/game/page.tsx`: orchestrates hooks and renders `screens/GameScreen.tsx`.
- `screens/GameScreen.tsx`: composes game panels; includes `RoundSnapshotCard`, `EventLog`, `ActionSelection`, `StatusBar`.
- `components/game/ActionSelection.tsx`: CTAs, AP badges; swap buttons to shadcn; keep AP layout for now but align borders/spacing with tokens.
- `components/game/RoundSnapshotCard.tsx`: summary card; convert headings/badges/spacers to tokenized styles.
- `screens/EndScreen.tsx`: debrief; move feedback into shadcn `Dialog`; unify containers.

Modals/portals
- `components/game/ActionTreeModal.tsx`, `ActionTreePortal.tsx`: leave untouched in initial pass.

Utilities and icons
- `components/Icons.tsx`: keep; optionally tune colors via tokens; retain `LoadingSpinner` but allow `className` to inherit token colors.
- `components/ui/Tooltip.tsx`: keep or replace later with shadcn tooltip (optional).

High‑Level Changes to Make
- Establish consistent tokens and borders across cards/lists; remove ad‑hoc grays.
- Replace primary/secondary buttons and form controls with shadcn variants (uniform radius, focus rings, spacing).
- Standardize badges/pills (status/ready/host) via `Badge` and tokens.
- Use `Dialog` for any confirmation/feedback flows; retire bespoke modals where feasible.
- Keep Cytoscape/graphs unchanged until a dedicated pass.

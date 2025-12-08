# Theme Comparison for Simulacra: daisyUI vs shadcn/ui

Status: proposed
Audience: game/frontend
Last updated: 2025-12-08

## Executive Summary
Choose a single uniform theme: shadcn/ui (Radix + Tailwind).

Why shadcn/ui for Simulacra:
- Tasteful, minimalist baseline that reads serious and non-generic.
- Strong accessibility via Radix primitives; great for policy/enterprise demos.
- We own the code (copy‑paste components), enabling consistent tokens and long‑term control.
- Plays nicely with Tailwind and SSR; no heavy runtime, no vendor lock‑in.

## Our Constraints (game-specific)
- Serious tone (policy sim), not playful.
- SPA lobby → join → role select → waiting → action → end.
- Minimal refactors; reuse current layout and stores.
- A11y and SSR-friendly (Next.js/Colyseus mix).

## Option A — daisyUI
- What: Tailwind plugin adding classnames (e.g., `btn`, `card`, `badge`, `input`).
- Setup (10–20 min):
  - `npm i -D daisyui`
  - `tailwind.config.ts` → `plugins:[require('daisyui')]`, `daisyui:{ themes:['business','dim'] }`
  - `<html data-theme="business">` in `app/layout.tsx` (Next) or in root (Vite).
- Pros
  - Very fast adoption; class swap only.
  - Multiple sober themes out-of-box (business/dim/corporate).
  - Stays in Tailwind mentally; no extra runtime.
- Cons
  - Generic look if used everywhere; avoid “UI kit” feel on core screens.
  - Opinions on spacing/radius may clash with our tokens (tweakable).
- Where to use in Simulacra
  - Lobby/Join, WaitingRoom, RoleSelector, EndScreen (forms, lists, badges).
  - Not for: Action Tree (Cytoscape), heavy charts.

## Option B — shadcn/ui (Radix Primitives)
- What: Copy-paste Tailwind component library built on Radix (a11y). You own the code.
- Setup (60–90 min):
  - `npx shadcn@latest init`
  - Add only what we need now: `button input dialog badge toast separator`.
- Pros
  - Minimalist, refined aesthetics; better matches “serious” requirement.
  - Strong accessibility and keyboard support out of the box.
  - We control styling; no vendor lock-in.
- Cons
  - Slightly more work to introduce.
  - You must adopt variants/tokens for consistency.
- Where to use in Simulacra
  - Core gameplay affordances: Start/Confirm dialogs, ActionSelection CTAs, Toasts, Navbar/HUD pieces.
  - Leave non-critical forms to daisyUI for speed.

## Head-to-Head (what matters for us)
| Criterion | daisyUI | shadcn/ui |
|---|---|---|
| Time-to-first-value | 10–20m | 60–90m (selective) |
| Aesthetic fit (serious/minimal) | Good with “business/dim”, can look generic if overused | Excellent; understated, modern |
| Granular control | Medium (theme presets) | High (we own components) |
| Accessibility | Good defaults | Excellent (Radix) |
| SSR/Next.js | Works (pure CSS classes) | Works (copy-paste + Radix) |
| Tailwind synergy | Native plugin | Native (Tailwind templates) |
| Vendor lock-in | Low | Very low (code in repo) |
| Perf/Bundle | No extra JS | Minimal; Radix primitives only |

## Adoption Plan (Single Theme: shadcn/ui)
1) Initialize and add core primitives (day 0.5–1)
   - `npx shadcn@latest init`
   - `npx shadcn@latest add button input dialog toast badge separator`
   - Create thin wrappers in `components/ui/` so feature code stays stable.
2) Define tokens (day 0.2)
   - Use Radix Colors Slate/Gray + one accent; map to CSS vars and Tailwind theme.extend.
3) Screen rollout (day 0.5–1)
   - Convert uniformly: Lobby/Join, WaitingRoom, RoleSelector, EndScreen.
   - Defer Action Tree/Cytoscape; keep existing styles until graph polish pass.
4) QA & a11y pass (day 0.2)
   - Keyboard flows, focus rings, contrast, SSR/hydration checks.

## Screen-by-Screen Guidance
- Lobby/Join: shadcn Input/Button/Card; neutral palette.
- WaitingRoom: shadcn Badge/Separator; list styled with Tailwind + tokens.
- RoleSelector: shadcn Buttons; compact cards; no playful imagery.
- ActionSelection: keep current layout; swap CTAs to shadcn Button first.
- EndScreen: shadcn Dialog for feedback; Cards for sections.
- Action Tree / Cytoscape: out‑of‑scope; keep existing.

## Risks & Mitigations
- “Generic kit” feel (daisyUI)
  - Limit to forms/lists; override radius/spacing; keep neutral palette.
- Over-engineering (shadcn)
  - Add only 4–5 primitives; avoid full sweep; keep wrappers thin.
- Style drift
  - Centralize tokens; use Tailwind theme.extend mapped to CSS vars.

## Snippets
- shadcn add commands
```sh
npx shadcn@latest add button input dialog toast badge separator
```
- Example Button wrapper (shadcn under the hood)
```tsx
// components/ui/Button.tsx
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
export function Button({ className, variant = 'default', ...props }) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
```

## Acceptance Criteria
- 4 screens converted to shadcn/ui with cohesive tokens; pass a11y checks.
- Core actions use shadcn Button/Dialog/Toast with correct focus/keyboard behavior.
- No regressions in multiplayer flows (join/role/wait/start/submit/end).

## Decision
Adopt shadcn/ui as the uniform theme across the app.

Why not daisyUI:
- Faster to start, but higher risk of a “generic kit” look that undercuts the game’s seriousness.
- Preset spacing/radius can clash with our desired minimalist density; requires overrides anyway.

shadcn/ui gives us tasteful defaults, consistent a11y, and full control over the final look with minimal ongoing cost.

# Theme Comparison for Simulacra: daisyUI vs shadcn/ui

Status: proposed
Audience: game/frontend
Last updated: 2025-12-08

## Executive Summary
- Use both, intentionally:
  - daisyUI (theme: "business" or "dim"): fastest way to professionalize forms/lists with minimal JSX churn.
  - shadcn/ui (Radix + Tailwind): tasteful, minimalist primitives (Button/Input/Dialog/Toast) for core gameplay screens.
- Keep Tailwind as the base; we own thin wrappers so feature code stays stable.

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

## Recommended Hybrid Plan
1) Flagged rollout
   - Env: `NEXT_PUBLIC_THEME=business` or `NEXT_PUBLIC_THEME=shadcn-min`.
   - Keep local toggle in Dev HUD for quick A/B.
2) Phase 1 (0.5–1 day): daisyUI pass
   - Convert: Lobby/Join, WaitingRoom, RoleSelector, EndScreen.
   - Use classes: `btn btn-primary`, `input input-bordered`, `card`, `badge`, `alert`.
3) Phase 2 (0.5–1 day): shadcn primitives where it counts
   - Add: `button`, `input`, `dialog`, `toast`, `badge`.
   - Replace in core flows: Start Game confirm, Submit Action confirm, toasts, simple menus.
4) Tokens
   - Introduce CSS vars for colors/radius/shadows to keep both libs consistent (or use Radix Colors Slate/Gray + one accent).

## Screen-by-Screen Guidance
- Lobby/Join: daisyUI inputs/cards/buttons.
- WaitingRoom: daisyUI list + badges; keep role avatars minimal.
- RoleSelector: daisyUI grid + buttons; no playful imaging.
- ActionSelection: keep current look for now; swap individual CTAs with shadcn Button when ready.
- EndScreen: daisyUI containers, shadcn dialog for feedback modal.
- Action Tree / Cytoscape: out-of-scope for both.

## Risks & Mitigations
- “Generic kit” feel (daisyUI)
  - Limit to forms/lists; override radius/spacing; keep neutral palette.
- Over-engineering (shadcn)
  - Add only 4–5 primitives; avoid full sweep; keep wrappers thin.
- Style drift
  - Centralize tokens; use Tailwind theme.extend mapped to CSS vars.

## Snippets
- tailwind.config.ts (daisyUI)
```ts
// tailwind.config.ts
export default {
  content: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
  plugins: [require('daisyui')],
  daisyui: { themes: ['business', 'dim'] },
};
```
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
- 4 screens converted with daisyUI and pass accessibility checks.
- shadcn Button/Dialog wired on core actions with keyboard/focus states correct.
- No regressions in multiplayer flows (join/role/wait/start/submit/end).

## Decision
- Proceed with hybrid: daisyUI (forms/lists) + shadcn (primitives on core).
- Reassess after first playtest; if shadcn look is preferred, increase its coverage gradually.

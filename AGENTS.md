# Repository Guidelines

## Project Structure & Module Organization
- `index.tsx` boots the Vite/React app; `App.tsx` owns the game loop and Cytoscape rendering.
- Domain constants live in `constants.tsx`, prompt builders in `prompts.ts`, shared types in `types.ts`.
- UI elements sit in `components/`; LiteLLM plumbing and future realtime hooks live in `services/`.
- Static files stay in `public/`, builds output to `dist/`.
- `backend/venv/` tracks a Python virtualenv stub—no backend sources are committed.

## Build, Test, and Development Commands
- `npm run dev` — start the dev server on `http://localhost:5173` with hot reload.
- `npm run build` — produce the production bundle in `dist/`; run before publishing.
- `npm run preview` — serve the built bundle for production-parity smoke tests.
- `./git-push.sh [-c "msg"]` — optional helper that runs `npm ci`, rebuilds, and can auto-commit/push.

## Coding Style & Naming Conventions
- TypeScript runs in strict mode (`tsconfig.json`); type exported APIs explicitly and lean on `zod` schemas.
- Prefer functional components and hooks; colocate feature helpers with their module or `services/`.
- Use two-space indentation, single quotes in TSX, and camelCase identifiers.
- Import via `@/` for root-relative paths; order imports external → internal → styles.
- After touching ambient types, run `npm run build` or `tsc --noEmit` to confirm type safety.

## Testing Guidelines
- No automated suite yet; add Vitest + React Testing Library alongside new UI work and expose an `npm test` script.
- Meanwhile, document manual QA: start a new game, finish an action round, inspect the action tree modal, and check the console for LiteLLM errors.
- Capture coverage expectations in PRs once tests land so contributors know the bar.

## Commit & Pull Request Guidelines
- Mirror the existing, present-tense log style (e.g., `Add favicon helper`, `Fix zod version`), ideally ≤65 chars.
- Reference issues in the message body (`Refs #123`) and call out schema or env changes.
- PRs should include a short summary, screenshots/GIFs for UI changes, manual test notes, and required env vars.

## Security & Configuration Tips
- Store LiteLLM credentials in `.env.local` or Vercel secrets; confirm `VITE_LITELLM_BASE_URL`, `VITE_LITELLM_API_KEY`, and `VITE_LLM_MODEL` before `npm run dev`.
- Remove console logging of prompts or keys from `services/` before merge.

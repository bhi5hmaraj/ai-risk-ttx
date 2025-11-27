# Server Setup & CI/CD Walkthrough

## Overview
We have successfully migrated the backend architecture to support Colyseus (WebSockets) alongside Next.js, and configured the build and deployment pipeline for Google Cloud Run.

## Changes

### 1. Server Architecture (`server/index.ts`)
- **Express + Colyseus**: Created a custom server entry point that initializes Express and attaches Colyseus WebSocket server.
- **Next.js Integration**: The server handles all HTTP requests via Next.js request handler, preserving existing App Router functionality.
- **CORS**: Configured dynamic CORS to support production (`simulacra.cc`), preview (`*-uc.a.run.app`), and local development.
- **Health Check**: Added `/healthz` endpoint for load balancers.

### 2. Build Configuration
- **`tsconfig.server.json`**: Created a dedicated TypeScript config for building the server code (CommonJS output for Node.js).
- **`package.json`**: Added `dev:colyseus` for local dev and `build:server` for production build.
- **Type Fixes**: Fixed implicit any errors in `server/data/feedbackRepo.ts` and added declarations for `express` and `cors` in `declarations.d.ts`.

### 3. Dockerfile
- **Multi-stage Build**: Optimized `Dockerfile` with separate stages for dependencies, builder, and runner.
- **Production Ready**:
  - Builds Next.js app and Custom Server.
  - Installs production dependencies.
  - Includes `HEALTHCHECK` instruction.
  - Sets up correct user permissions (non-root).
- **Build Args**: Added `OPENAI_API_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as build args (with dummy defaults) to satisfy Next.js static generation requirements.

### 4. Cloud Build (`cloudbuild.yaml`)
- **Branch-based Deployment**:
  - `main` branch deploys to `simulacra-prod` (APP_URL: `https://simulacra.cc`).
  - Other branches deploy to `simulacra-preview` (APP_URL: `https://simulacra-preview-uc.a.run.app`).
- **Secrets**: Configured to use Cloud Build secrets (to be set up in GCP) or build args.
- **Cloud Run Config**:
  - Timeout: 3600s (1 hour) for long-lived WebSocket sessions.
  - Session Affinity: Enabled for WebSocket stickiness.
  - Memory: 1Gi.

### 5. GitHub Actions (`.github/workflows/deploy.yml`)
- **CI/CD Pipeline**: Created a workflow that triggers on push to `main`, `feat/*`, `fix/*`, `chore/*`.
- **Action**: Authenticates with Google Cloud and runs `gcloud builds submit` using `cloudbuild.yaml`.
- **Requirements**: Requires `GCP_CREDENTIALS` secret in GitHub repository.

## Verification

### Local Smoke Test
1. Ran `pnpm run dev:colyseus`.
2. Verified HTTP endpoints (`/`, `/healthz`) work.
3. Verified WebSocket connection using `scripts/test-colyseus.ts`.

### Local Testing

#### Development Mode (Hot Reload)
Run the server with `tsx` and Next.js dev server:
```bash
pnpm run dev:colyseus
```
This runs the custom server at `server/index.ts` which handles both WebSockets and Next.js pages.

#### Production Mode (Simulate Cloud Run)
Build and run the optimized production server:
```bash
pnpm run build         # Build Next.js app
pnpm run build:server  # Build Custom Server
pnpm start             # Run dist/server/index.js
```

### Verification Scripts
Use the provided script to test WebSocket connectivity:
```bash
tsx scripts/test-colyseus.ts
```

## Next Steps
1. **Implement Game Logic**: Flesh out `GameRoom.ts` with actual game logic (Lobby, Action phases).
2. **Client Integration**: Update frontend to connect to Colyseus.
3. **GCP Setup**: Ensure Cloud Build triggers and Secret Manager secrets are configured in GCP project.

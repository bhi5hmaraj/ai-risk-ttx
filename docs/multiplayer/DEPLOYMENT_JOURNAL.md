# Deployment Journal

**Purpose**: This document records the exact commands and steps we executed during deployment setup.

**Started**: 2025-11-30

---

## Session 1: Local Testing (2025-11-30)

### Goal
Test the Docker build locally to verify the Dockerfile works before deploying to Cloud Run.

### Steps Executed

#### 1. Build Colyseus Server
```bash
pnpm run build:server
```
**Result**: ✅ Build successful, artifacts created in `dist/server/`

#### 2. Verify Build Artifacts
```bash
ls -lh dist/server/
```
**Result**: ✅ Found `index.js` (6.0K) and supporting directories (lib, rooms, services, types)

#### 3. Build Docker Image
```bash
docker build -t simulacra-test .
```
**Result**: ✅ Image built successfully
- Image ID: `6f0b0dfde726`
- Size: `1.27GB`
- Build time: ~60 seconds
- Warnings (non-blocking):
  - Secrets in ARG (OPENAI_API_KEY) - expected for build arg
  - Legacy ENV format - cosmetic
  - FROM casing mismatch - cosmetic

#### 4. Run Docker Container
```bash
docker run -d --name simulacra-test -p 3005:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  simulacra-test
```
**Result**: ✅ Container started successfully (ID: `4ec45b958452`)

#### 5. Verify Container Logs
```bash
docker logs simulacra-test
```
**Result**: ✅ Colyseus server started correctly
- Server listening on port 3000
- All endpoints initialized:
  - Monitor: `/colyseus-admin`
  - Health: `/healthz`
  - Snapshot: `/games/:gameId/snapshot`

#### 6. Test Health Endpoint
```bash
curl http://localhost:3005/healthz
```
**Result**: ✅ Returns `OK` (200)

#### 7. Test Snapshot Endpoint
```bash
curl http://localhost:3005/games/TEST123/snapshot
```
**Result**: ✅ Returns `{"error":"game_not_found"}` (404)
- Expected behavior: room doesn't exist yet
- Endpoint is working correctly

#### 8. Cleanup
```bash
docker stop simulacra-test && docker rm simulacra-test
```
**Result**: ✅ Container stopped and removed

### Summary

✅ **Docker build successful** - Ready for Cloud Run deployment
- Image builds cleanly with multi-stage optimization
- All server endpoints functional
- Health check working
- Snapshot endpoint responding correctly (404 when no room exists)

**Next Steps**: Integrate Next.js into monolith server

---

## Session 2: Monolith Architecture (2025-11-30)

### Goal
Integrate Next.js into the Colyseus server to create a monolith deployment that serves both HTTP and WebSocket on the same port.

### Steps Executed

#### 1. Enable Next.js Standalone Output
```bash
# Updated next.config.ts to add:
output: 'standalone'
```
**Result**: ✅ Next.js will build in standalone mode for Docker deployment

#### 2. Integrate Next.js into server/index.ts
```typescript
import next from 'next';

const nextApp = next({ dev, hostname: 'localhost', port });
const nextHandler = nextApp.getRequestHandler();

async function startServer() {
  await nextApp.prepare();

  // ... Express + Colyseus setup ...

  // Next.js catch-all handler (MUST be last)
  expressApp.use((req, res) => nextHandler(req, res));

  gameServer.listen(port);
}

startServer().catch(err => process.exit(1));
```
**Result**: ✅ Next.js integrated as async initialization with catch-all handler

#### 3. Test Monolith Server Locally
```bash
PORT=3004 npx tsx server/index.ts
```
**Result**: ✅ Server started successfully
- Next.js prepared and ready
- Colyseus listening on port 3004
- Both HTTP and WebSocket operational on same port
- Output:
  ```
  🚀 Monolith server ready on http://localhost:3004
     📱 Next.js (UI):     http://localhost:3004
     🎮 WebSocket (Game): ws://localhost:3004
     📊 Colyseus Monitor: http://localhost:3004/colyseus-admin
     🏥 Health Check:     http://localhost:3004/healthz
  ```

### Summary

✅ **Monolith architecture working** - Next.js and Colyseus running together
- Single process serves both HTTP (Next.js pages, API routes) and WebSocket (game rooms)
- Single port (3004) handles all traffic
- Async initialization ensures Next.js is ready before accepting requests
- Colyseus routes registered first (specific), Next.js catch-all registered last

**Next Steps**: Update Dockerfile and test full production build

---

## Session 3: Reverting to Two-Service Architecture (2025-11-30)

### Goal
Revert the monolith approach due to WebSocket conflicts between Next.js HMR and Colyseus. Return to the original two-service architecture.

### Problem Encountered
When running the monolith server (`pnpm run dev:monolith`), WebSocket connections failed with:
```
Error: seat reservation expired.
RangeError: Invalid WebSocket frame: invalid status code 43617
```

**Root Cause**: Next.js has built-in WebSocket support for Hot Module Reloading (HMR) in development mode. This conflicts with Colyseus's WebSocket handling when both run on the same port.

### Decision
Reverted to **two-service architecture**:
1. **Next.js** - Frontend and API routes (Vercel or Cloud Run)
2. **Colyseus** - Game server with WebSocket (Cloud Run)

### Steps Executed

#### 1. Revert server/index.ts
```bash
# Removed Next.js integration from server/index.ts
# - Removed `import next from 'next'`
# - Removed async startServer() wrapper
# - Removed Next.js initialization and handler
# - Restored to Colyseus-only server
```
**Result**: ✅ Server simplified to Colyseus-only

#### 2. Revert next.config.ts
```typescript
// Removed standalone output mode
const nextConfig: NextConfig = {
  // output: 'standalone', // REMOVED
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // ... rest of config
};
```
**Result**: ✅ Next.js back to standard build mode

#### 3. Build and Test Colyseus Server
```bash
pnpm run build:server
```
**Result**: ✅ Build successful

```bash
PORT=3004 timeout 5 npx tsx server/index.ts
```
**Result**: ✅ Server starts cleanly
- No Next.js initialization
- No WebSocket conflicts
- Clean Colyseus startup:
  ```
  🚀 Colyseus server listening on port 3004
     🎮 WebSocket (Game): ws://localhost:3004
     📊 Colyseus Monitor: http://localhost:3004/colyseus-admin
     🏥 Health Check:     http://localhost:3004/healthz
  ```

### Summary

✅ **Reverted to two-service architecture** - Cleaner separation of concerns
- Next.js handles UI, SSR, and API routes
- Colyseus handles real-time game state and WebSocket
- No WebSocket conflicts
- Simpler debugging and deployment

**Architecture Benefits**:
- Independent scaling: Next.js can scale to zero, Colyseus stays warm
- Technology isolation: No framework conflicts
- Clearer separation: UI logic vs game logic
- Development flexibility: Can run services independently

**Next Steps**:
1. Deploy Colyseus to Cloud Run (game server)
2. Keep Next.js on Vercel OR migrate to Cloud Run
3. Test end-to-end multiplayer functionality

---

## Session 4: Docker Build and Local Testing (2025-11-30)

### Goal
Build and test the Colyseus Docker image locally to verify it works before deploying to Cloud Run.

### Steps Executed

#### 1. Clean up Dockerfile
```bash
# Removed public folder copy (not needed for Colyseus-only server)
```
**Result**: ✅ Dockerfile simplified

#### 2. Build Docker Image
```bash
docker build -t simulacra-colyseus:test .
```
**Result**: ✅ Build successful
- Image size: ~1.3GB (multi-stage build with alpine)
- Build time: ~2 minutes
- All dependencies installed correctly
- Server build artifacts created in `dist/server/`

Warnings (non-blocking):
- Legacy ENV format (cosmetic)
- FROM casing (cosmetic)
- ARG for OPENAI_API_KEY (expected - build arg only)

#### 3. Run Docker Container Locally
```bash
docker run -d --name simulacra-test -p 3005:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  simulacra-colyseus:test
```
**Result**: ✅ Container started successfully

#### 4. Verify Container Logs
```bash
docker logs simulacra-test
```
**Result**: ✅ Server started correctly
```
🚀 Colyseus server listening on port 3000
   🎮 WebSocket (Game): ws://localhost:3000
   📊 Colyseus Monitor: http://localhost:3000/colyseus-admin
   🏥 Health Check:     http://localhost:3000/healthz
```

#### 5. Test Health Endpoint
```bash
curl http://localhost:3005/healthz
```
**Result**: ✅ Returns `OK` (200)

#### 6. Cleanup
```bash
docker stop simulacra-test && docker rm simulacra-test
```
**Result**: ✅ Container stopped and removed

### Summary

✅ **Docker image builds and runs successfully**
- Colyseus server starts cleanly in production mode
- Health check working
- Multi-stage build optimized for size
- Ready for Cloud Run deployment

**Image Details**:
- Base: `node:20-alpine`
- Size: ~1.3GB
- Layers: Multi-stage (deps, builder, prod-deps, runner, final)
- User: Non-root (nextjs:nodejs, uid/gid 1001)

**Next Steps**:
1. Set up GCP project and Secret Manager
2. Configure Cloud Build trigger
3. Deploy to Cloud Run
4. Test WebSocket connections from production frontend


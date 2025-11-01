# LLM Backend Migration - Implementation Guide

## Overview

This document describes the migration of LLM service calls from client-side to server-side using Hono framework and Vercel serverless functions.

## Motivation

**Security**: API keys were exposed in the client bundle via `VITE_LITELLM_API_KEY`
**Best Practice**: LLM calls should happen server-side to protect credentials
**Cost Control**: Server-side calls enable better monitoring and rate limiting

## Architecture

### Before (Client-Side)
```
Browser → geminiService.ts → LiteLLM Proxy → LLM Provider
         (VITE_LITELLM_API_KEY exposed)
```

### After (Server-Side)
```
Browser → llmApiClient.ts → /api/llm/* → llmService.ts → LiteLLM Proxy → LLM Provider
         (No API key)        (Hono)      (LITELLM_API_KEY secure)
```

## Implementation

### Backend Components

#### 1. API Routes (`api/routes/llm.ts`)
Hono-based routes handling all LLM endpoints:
- `POST /api/llm/generate/scenario` - Generate opening scenario
- `POST /api/llm/generate/action-options` - Generate player action options
- `POST /api/llm/generate/ai-player-actions` - Generate AI player choices
- `POST /api/llm/generate/consequences` - Generate round consequences
- `POST /api/llm/generate/counterfactual` - Generate counterfactual analysis
- `POST /api/llm/generate/custom-scenario` - Generate custom scenario

#### 2. LLM Service (`api/services/llmService.ts`)
Server-side version of `geminiService.ts` with:
- Uses `process.env.LITELLM_API_KEY` (server-only)
- No `dangerouslyAllowBrowser` flag
- Same LLM logic, different environment

#### 3. Next.js Route Handler (`app/api/llm/generate/[action]/route.ts`)
Catch-all route that mounts Hono app for `/api/llm/*` paths.

### Frontend Components

#### 4. API Client (`services/llmApiClient.ts`)
Frontend service that makes HTTP calls to backend:
- Same function signatures as `geminiService.ts`
- Returns same types (`AIConsequenceResponse`, etc.)
- Drop-in replacement for existing code

### Type Definitions

#### 5. Request/Response Types (`api/types/llm/`)
- `requests.ts` - API request payloads
- `responses.ts` - API response schemas with `LLMApiResponse<T>` wrapper

## Environment Variables

### Old (Client-Side - DEPRECATED)
```bash
VITE_LITELLM_API_KEY="sk-..."  # ⚠️ EXPOSED IN BUNDLE
VITE_LLM_MODEL="gpt-4o-mini"
```

### New (Server-Side - SECURE)
```bash
LITELLM_API_KEY="sk-..."         # ✅ Server-only
LITELLM_BASE_URL="https://..."   # Optional, has default
LLM_MODEL="gpt-4o-mini"          # Optional, has default
```

## Migration Steps

### Phase 1: Backend Setup (COMPLETE ✅)
1. ✅ Install Hono framework
2. ✅ Create `api/services/llmService.ts` (adapted from `geminiService.ts`)
3. ✅ Create `api/routes/llm.ts` with all endpoints
4. ✅ Create `app/api/llm/generate/[action]/route.ts` handler
5. ✅ Create `api/types/llm/` request/response types
6. ✅ Create `services/llmApiClient.ts` frontend client
7. ✅ Add `AIPlayerActionsResponse` to `types.ts`
8. ✅ Update `api/tsconfig.json` to enable JSX

### Phase 2: Frontend Migration (PENDING ⏳)
1. ⏳ Update `hooks/useGameController.ts` to import from `llmApiClient` instead of `geminiService`
2. ⏳ Search and replace all `geminiService` imports with `llmApiClient`
3. ⏳ Remove `VITE_LITELLM_API_KEY` from client `.env`
4. ⏳ Update documentation

### Phase 3: Testing & Deployment (PENDING ⏳)
1. ⏳ Test all endpoints locally with `npm run dev`
2. ⏳ Set `LITELLM_API_KEY` in Vercel environment variables
3. ⏳ Deploy to preview branch and test
4. ⏳ Deploy to production

### Phase 4: Cleanup (PENDING ⏳)
1. ⏳ Delete old `services/geminiService.ts` (keep for reference initially)
2. ⏳ Remove `dangerouslyAllowBrowser` references
3. ⏳ Remove `VITE_LITELLM_API_KEY` from Vercel
4. ⏳ Update CLAUDE.md and README.md

## API Endpoint Examples

### Generate Initial Scenario
```typescript
// Request
POST /api/llm/generate/scenario
{} // Empty body

// Response
{
  "success": true,
  "data": {
    "roundSummary": "...",
    "outcomeTimeline": [...],
    "publicScoreUpdate": -20,
    // ... AIConsequenceResponse
  }
}
```

### Generate Action Options
```typescript
// Request
POST /api/llm/generate/action-options
{
  "player": { /* Player object */ },
  "gameState": { /* GameState object */ },
  "previousActions": []
}

// Response
{
  "success": true,
  "data": {
    "options": [
      { "title": "...", "description": "...", "cost": 2 },
      // ... 5 options total
    ]
  }
}
```

## Error Handling

All endpoints return consistent error responses:
```typescript
{
  "success": false,
  "error": "Failed to generate consequences",
  "message": "Detailed error message"
}
```

Frontend client returns `null` on errors (matching original behavior).

## Testing

### Local Development
```bash
# Start Vercel dev server (includes API routes)
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/api/llm/generate/scenario

-H "Content-Type: application/json"
```

### Vercel Deployment
Environment variables are automatically injected from Vercel dashboard.

## Chat Mode Support

Chat mode (conversation-based LLM calls) is also migrated:
- `api/services/chatSession.ts` - Server-side chat session
- Session management will be added in future iteration
- Currently uses same stateless approach as before

## Known Limitations

1. **No Session Persistence**: Chat sessions are not persisted between requests (future enhancement)
2. **No Rate Limiting**: Should add rate limiting in production
3. **No Caching**: LLM responses are not cached (consider adding Redis)
4. **Large Payloads**: Full game state sent on each request (consider compression)

## Benefits

✅ **Security**: API keys no longer exposed to client
✅ **Monitoring**: Server logs capture all LLM usage
✅ **Rate Limiting**: Can add rate limiting at API level
✅ **Cost Control**: Can implement caching and request throttling
✅ **Type Safety**: Strong typing for request/response contracts
✅ **Future-Proof**: Easy to add new endpoints or modify prompts

## Next Steps

1. Complete frontend migration (update imports)
2. Test all game flows end-to-end
3. Deploy to preview branch
4. Monitor for errors
5. Deploy to production
6. Remove old client-side code

## References

- Hono Documentation: https://hono.dev/
- Vercel Serverless Functions: https://vercel.com/docs/functions
- LiteLLM Proxy: https://docs.litellm.ai/
